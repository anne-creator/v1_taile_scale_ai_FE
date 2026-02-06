'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import { ImageUploaderValue } from '@/components/custom';
import { useAuth } from '@/providers/auth-provider';
import { useUI } from '@/providers/ui-provider';

/**
 * Video Generator Context - Page-level State Provider
 *
 * Following code_principle.md: Provider uses { state, actions } interface
 * This is a page-level provider, not global. Wrap it around components that need video generation.
 */

// ============================================================================
// Types
// ============================================================================

export type VideoGeneratorTab = 'text-to-video' | 'image-to-video' | 'video-to-video';

export interface GeneratedVideo {
  id: string;
  url: string;
  provider?: string;
  model?: string;
  prompt?: string;
}

interface BackendTask {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  taskInfo: string | null;
  taskResult: string | null;
}

export interface VideoGeneratorConfig {
  maxSizeMB?: number;
}

// State interface
export interface VideoGeneratorState {
  // Form state
  activeTab: VideoGeneratorTab;
  provider: string;
  model: string;
  prompt: string;
  costCredits: number;

  // Reference inputs
  referenceImageItems: ImageUploaderValue[];
  referenceImageUrls: string[];
  referenceVideoUrl: string;

  // Generation state
  isGenerating: boolean;
  progress: number;
  taskId: string | null;
  taskStatus: AITaskStatus | null;

  // Results
  generatedVideos: GeneratedVideo[];
  downloadingVideoId: string | null;

  // Hydration state
  isMounted: boolean;

  // Computed properties
  promptLength: number;
  isPromptTooLong: boolean;
  isTextToVideoMode: boolean;
  isImageToVideoMode: boolean;
  isVideoToVideoMode: boolean;
  isReferenceUploading: boolean;
  hasReferenceUploadError: boolean;
  taskStatusLabel: string;

  // Config
  config: Required<VideoGeneratorConfig>;
}

// Actions interface
export interface VideoGeneratorActions {
  // Tab change
  setActiveTab: (tab: VideoGeneratorTab) => void;

  // Form operations
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  setPrompt: (prompt: string) => void;
  setReferenceVideoUrl: (url: string) => void;
  handleReferenceImagesChange: (items: ImageUploaderValue[]) => void;

  // Core operations
  generate: () => Promise<void>;
  downloadVideo: (video: GeneratedVideo) => Promise<void>;

  // Internal operations
  resetTaskState: () => void;
}

// Combined context type
export interface VideoGeneratorContextValue {
  state: VideoGeneratorState;
  actions: VideoGeneratorActions;
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVAL = 15000;
const GENERATION_TIMEOUT = 600000; // 10 minutes for video
export const MAX_PROMPT_LENGTH = 2000;

const TEXT_TO_VIDEO_CREDITS = 6;
const IMAGE_TO_VIDEO_CREDITS = 8;
const VIDEO_TO_VIDEO_CREDITS = 10;

export const VIDEO_MODEL_OPTIONS = [
  // Replicate models
  {
    value: 'google/veo-3.1',
    label: 'Veo 3.1',
    provider: 'replicate',
    scenes: ['text-to-video', 'image-to-video'],
  },
  {
    value: 'openai/sora-2',
    label: 'Sora 2',
    provider: 'replicate',
    scenes: ['text-to-video', 'image-to-video'],
  },
  // Fal models
  {
    value: 'fal-ai/veo3',
    label: 'Veo 3',
    provider: 'fal',
    scenes: ['text-to-video'],
  },
  {
    value: 'fal-ai/wan-pro/image-to-video',
    label: 'Wan Pro',
    provider: 'fal',
    scenes: ['image-to-video'],
  },
  {
    value: 'fal-ai/kling-video/o1/video-to-video/edit',
    label: 'Kling Video O1',
    provider: 'fal',
    scenes: ['video-to-video'],
  },
  // Kie models
  {
    value: 'sora-2-pro-image-to-video',
    label: 'Sora 2 Pro',
    provider: 'kie',
    scenes: ['image-to-video'],
  },
  {
    value: 'sora-2-pro-text-to-video',
    label: 'Sora 2 Pro',
    provider: 'kie',
    scenes: ['text-to-video'],
  },
];

export const VIDEO_PROVIDER_OPTIONS = [
  { value: 'replicate', label: 'Replicate' },
  { value: 'fal', label: 'Fal' },
  { value: 'kie', label: 'Kie' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function parseTaskResult(taskResult: string | null): any {
  if (!taskResult) {
    return null;
  }

  try {
    return JSON.parse(taskResult);
  } catch (error) {
    console.warn('Failed to parse taskResult:', error);
    return null;
  }
}

function extractVideoUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  // check videos array first
  const videos = result.videos;
  if (videos && Array.isArray(videos)) {
    return videos
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          return item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
        }
        return null;
      })
      .filter(Boolean);
  }

  // check output
  const output = result.output ?? result.video ?? result.data;

  if (!output) {
    return [];
  }

  if (typeof output === 'string') {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === 'string') return [item];
        if (typeof item === 'object') {
          const candidate = item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
          return typeof candidate === 'string' ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === 'object') {
    const candidate = output.url ?? output.uri ?? output.video ?? output.src ?? output.videoUrl;
    if (typeof candidate === 'string') {
      return [candidate];
    }
  }

  return [];
}

function getTaskStatusLabel(taskStatus: AITaskStatus | null): string {
  if (!taskStatus) {
    return '';
  }

  switch (taskStatus) {
    case AITaskStatus.PENDING:
      return 'Waiting for the model to start';
    case AITaskStatus.PROCESSING:
      return 'Generating your video...';
    case AITaskStatus.SUCCESS:
      return 'Video generation completed';
    case AITaskStatus.FAILED:
      return 'Generation failed';
    default:
      return '';
  }
}

// ============================================================================
// Context
// ============================================================================

const VideoGeneratorContext = createContext<VideoGeneratorContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface VideoGeneratorProviderProps {
  children: ReactNode;
  config?: VideoGeneratorConfig;
}

export function VideoGeneratorProvider({
  children,
  config: configProp,
}: VideoGeneratorProviderProps) {
  // Merge config with defaults
  const config: Required<VideoGeneratorConfig> = useMemo(
    () => ({
      maxSizeMB: configProp?.maxSizeMB ?? 50,
    }),
    [configProp?.maxSizeMB]
  );

  // Auth & UI context
  const { user, refreshUser } = useAuth();
  const { setIsShowSignModal } = useUI();

  // State
  const [activeTab, setActiveTabState] = useState<VideoGeneratorTab>('text-to-video');
  const [costCredits, setCostCredits] = useState<number>(TEXT_TO_VIDEO_CREDITS);
  const [provider, setProviderState] = useState(VIDEO_PROVIDER_OPTIONS[0]?.value ?? '');
  const [model, setModelState] = useState(VIDEO_MODEL_OPTIONS[0]?.value ?? '');
  const [prompt, setPromptState] = useState('');
  const [referenceImageItems, setReferenceImageItems] = useState<ImageUploaderValue[]>([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [referenceVideoUrl, setReferenceVideoUrlState] = useState('');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Refs for callbacks
  const generationStartTimeRef = useRef(generationStartTime);
  generationStartTimeRef.current = generationStartTime;

  // Hydration effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Derived state
  const promptLength = prompt.trim().length;
  const isPromptTooLong = promptLength > MAX_PROMPT_LENGTH;
  const isTextToVideoMode = activeTab === 'text-to-video';
  const isImageToVideoMode = activeTab === 'image-to-video';
  const isVideoToVideoMode = activeTab === 'video-to-video';

  const isReferenceUploading = useMemo(
    () => referenceImageItems.some((item) => item.status === 'uploading'),
    [referenceImageItems]
  );

  const hasReferenceUploadError = useMemo(
    () => referenceImageItems.some((item) => item.status === 'error'),
    [referenceImageItems]
  );

  const taskStatusLabel = useMemo(() => getTaskStatusLabel(taskStatus), [taskStatus]);

  // Actions
  const resetTaskState = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setTaskId(null);
    setGenerationStartTime(null);
    setTaskStatus(null);
  }, []);

  const setActiveTab = useCallback((tab: VideoGeneratorTab) => {
    setActiveTabState(tab);

    // Update available models based on new tab and current provider
    setProviderState((currentProvider) => {
      const availableModels = VIDEO_MODEL_OPTIONS.filter(
        (option) => option.scenes.includes(tab) && option.provider === currentProvider
      );

      if (availableModels.length > 0) {
        setModelState(availableModels[0].value);
      } else {
        setModelState('');
      }

      return currentProvider;
    });

    // Update cost credits
    if (tab === 'text-to-video') {
      setCostCredits(TEXT_TO_VIDEO_CREDITS);
    } else if (tab === 'image-to-video') {
      setCostCredits(IMAGE_TO_VIDEO_CREDITS);
    } else if (tab === 'video-to-video') {
      setCostCredits(VIDEO_TO_VIDEO_CREDITS);
    }
  }, []);

  const setProvider = useCallback(
    (value: string) => {
      setProviderState(value);

      const availableModels = VIDEO_MODEL_OPTIONS.filter(
        (option) => option.scenes.includes(activeTab) && option.provider === value
      );

      if (availableModels.length > 0) {
        setModelState(availableModels[0].value);
      } else {
        setModelState('');
      }
    },
    [activeTab]
  );

  const setModel = useCallback((value: string) => {
    setModelState(value);
  }, []);

  const setPrompt = useCallback((value: string) => {
    setPromptState(value);
  }, []);

  const setReferenceVideoUrl = useCallback((value: string) => {
    setReferenceVideoUrlState(value);
  }, []);

  const handleReferenceImagesChange = useCallback((items: ImageUploaderValue[]) => {
    setReferenceImageItems(items);
    const uploadedUrls = items
      .filter((item) => item.status === 'uploaded' && item.url)
      .map((item) => item.url as string);
    setReferenceImageUrls(uploadedUrls);
  }, []);

  const pollTaskStatus = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const startTime = generationStartTimeRef.current;
        if (startTime && Date.now() - startTime > GENERATION_TIMEOUT) {
          resetTaskState();
          toast.error('Video generation timed out. Please try again.');
          return true;
        }

        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: id }),
        });

        if (!resp.ok) {
          throw new Error(`request failed with status: ${resp.status}`);
        }

        const { code, message, data } = await resp.json();
        if (code !== 0) {
          throw new Error(message || 'Query task failed');
        }

        const task = data as BackendTask;
        const currentStatus = task.status as AITaskStatus;
        setTaskStatus(currentStatus);

        const parsedResult = parseTaskResult(task.taskInfo);
        const videoUrls = extractVideoUrls(parsedResult);

        if (currentStatus === AITaskStatus.PENDING) {
          setProgress((prev) => Math.max(prev, 20));
          return false;
        }

        if (currentStatus === AITaskStatus.PROCESSING) {
          if (videoUrls.length > 0) {
            setGeneratedVideos(
              videoUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              }))
            );
            setProgress((prev) => Math.max(prev, 85));
          } else {
            setProgress((prev) => Math.min(prev + 5, 80));
          }
          return false;
        }

        if (currentStatus === AITaskStatus.SUCCESS) {
          if (videoUrls.length === 0) {
            toast.error('The provider returned no videos. Please retry.');
          } else {
            setGeneratedVideos(
              videoUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              }))
            );
            toast.success('Video generated successfully');
          }

          setProgress(100);
          resetTaskState();
          return true;
        }

        if (currentStatus === AITaskStatus.FAILED) {
          const errorMessage = parsedResult?.errorMessage || 'Generate video failed';
          toast.error(errorMessage);
          resetTaskState();
          void refreshUser();
          return true;
        }

        setProgress((prev) => Math.min(prev + 3, 95));
        return false;
      } catch (error: any) {
        console.error('Error polling video task:', error);
        toast.error(`Query task failed: ${error.message}`);
        resetTaskState();
        void refreshUser();
        return true;
      }
    },
    [resetTaskState, refreshUser]
  );

  // Task polling effect
  useEffect(() => {
    if (!taskId || !isGenerating) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (!taskId) return;
      const completed = await pollTaskStatus(taskId);
      if (completed) cancelled = true;
    };

    tick();

    const interval = setInterval(async () => {
      if (cancelled || !taskId) {
        clearInterval(interval);
        return;
      }
      const completed = await pollTaskStatus(taskId);
      if (completed) clearInterval(interval);
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [taskId, isGenerating, pollTaskStatus]);

  // Core actions
  const generate = useCallback(async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // Quota check is done server-side in the API route.
    // Client-side check removed to avoid stale data issues.

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt && isTextToVideoMode) {
      toast.error('Please enter a prompt before generating.');
      return;
    }

    if (!provider || !model) {
      toast.error('Provider or model is not configured correctly.');
      return;
    }

    if (isImageToVideoMode && referenceImageUrls.length === 0) {
      toast.error('Please upload a reference image before generating.');
      return;
    }

    if (isVideoToVideoMode && !referenceVideoUrl) {
      toast.error('Please provide a reference video URL before generating.');
      return;
    }

    setIsGenerating(true);
    setProgress(15);
    setTaskStatus(AITaskStatus.PENDING);
    setGeneratedVideos([]);
    setGenerationStartTime(Date.now());

    try {
      const options: any = {};

      if (isImageToVideoMode) {
        options.image_input = referenceImageUrls;
      }

      if (isVideoToVideoMode) {
        options.video_input = [referenceVideoUrl];
      }

      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: AIMediaType.VIDEO,
          scene: activeTab,
          provider,
          model,
          prompt: trimmedPrompt,
          options,
        }),
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Failed to create a video task');
      }

      const newTaskId = data?.id;
      if (!newTaskId) {
        throw new Error('Task id missing in response');
      }

      if (data.status === AITaskStatus.SUCCESS && data.taskInfo) {
        const parsedResult = parseTaskResult(data.taskInfo);
        const videoUrls = extractVideoUrls(parsedResult);

        if (videoUrls.length > 0) {
          setGeneratedVideos(
            videoUrls.map((url, index) => ({
              id: `${newTaskId}-${index}`,
              url,
              provider,
              model,
              prompt: trimmedPrompt,
            }))
          );
          toast.success('Video generated successfully');
          setProgress(100);
          resetTaskState();
          await refreshUser();
          return;
        }
      }

      setTaskId(newTaskId);
      setProgress(25);

      await refreshUser();
    } catch (error: any) {
      console.error('Failed to generate video:', error);
      toast.error(`Failed to generate video: ${error.message}`);
      resetTaskState();
    }
  }, [
    user,
    setIsShowSignModal,
    costCredits,
    prompt,
    provider,
    model,
    isTextToVideoMode,
    isImageToVideoMode,
    isVideoToVideoMode,
    referenceImageUrls,
    referenceVideoUrl,
    activeTab,
    resetTaskState,
    refreshUser,
  ]);

  const downloadVideo = useCallback(async (video: GeneratedVideo) => {
    if (!video.url) {
      return;
    }

    try {
      setDownloadingVideoId(video.id);
      const resp = await fetch(`/api/proxy/file?url=${encodeURIComponent(video.url)}`);
      if (!resp.ok) {
        throw new Error('Failed to fetch video');
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success('Video downloaded');
    } catch (error) {
      console.error('Failed to download video:', error);
      toast.error('Failed to download video');
    } finally {
      setDownloadingVideoId(null);
    }
  }, []);

  // Build context value
  const state: VideoGeneratorState = useMemo(
    () => ({
      activeTab,
      provider,
      model,
      prompt,
      costCredits,
      referenceImageItems,
      referenceImageUrls,
      referenceVideoUrl,
      isGenerating,
      progress,
      taskId,
      taskStatus,
      generatedVideos,
      downloadingVideoId,
      isMounted,
      promptLength,
      isPromptTooLong,
      isTextToVideoMode,
      isImageToVideoMode,
      isVideoToVideoMode,
      isReferenceUploading,
      hasReferenceUploadError,
      taskStatusLabel,
      config,
    }),
    [
      activeTab,
      provider,
      model,
      prompt,
      costCredits,
      referenceImageItems,
      referenceImageUrls,
      referenceVideoUrl,
      isGenerating,
      progress,
      taskId,
      taskStatus,
      generatedVideos,
      downloadingVideoId,
      isMounted,
      promptLength,
      isPromptTooLong,
      isTextToVideoMode,
      isImageToVideoMode,
      isVideoToVideoMode,
      isReferenceUploading,
      hasReferenceUploadError,
      taskStatusLabel,
      config,
    ]
  );

  const actions: VideoGeneratorActions = useMemo(
    () => ({
      setActiveTab,
      setProvider,
      setModel,
      setPrompt,
      setReferenceVideoUrl,
      handleReferenceImagesChange,
      generate,
      downloadVideo,
      resetTaskState,
    }),
    [
      setActiveTab,
      setProvider,
      setModel,
      setPrompt,
      setReferenceVideoUrl,
      handleReferenceImagesChange,
      generate,
      downloadVideo,
      resetTaskState,
    ]
  );

  const value: VideoGeneratorContextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <VideoGeneratorContext.Provider value={value}>{children}</VideoGeneratorContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access Video Generator context with { state, actions } interface
 * Following code_principle.md
 */
export function useVideoGenerator(): VideoGeneratorContextValue {
  const context = useContext(VideoGeneratorContext);
  if (!context) {
    throw new Error('useVideoGenerator must be used within a VideoGeneratorProvider');
  }
  return context;
}
