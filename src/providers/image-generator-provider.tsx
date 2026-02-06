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
 * Image Generator Context - Page-level State Provider
 *
 * Following code_principle.md: Provider uses { state, actions } interface
 * This is a page-level provider, not global. Wrap it around components that need image generation.
 */

// ============================================================================
// Types
// ============================================================================

export type ImageGeneratorTab = 'text-to-image' | 'image-to-image';

export interface GeneratedImage {
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

export interface ImageGeneratorConfig {
  allowMultipleImages?: boolean;
  maxImages?: number;
  maxSizeMB?: number;
}

// State interface
export interface ImageGeneratorState {
  // Form state
  activeTab: ImageGeneratorTab;
  provider: string;
  model: string;
  prompt: string;
  costCredits: number;

  // Reference images
  referenceImageItems: ImageUploaderValue[];
  referenceImageUrls: string[];

  // Generation state
  isGenerating: boolean;
  progress: number;
  taskId: string | null;
  taskStatus: AITaskStatus | null;

  // Results
  generatedImages: GeneratedImage[];
  downloadingImageId: string | null;

  // Hydration state
  isMounted: boolean;

  // Computed properties (derived state)
  promptLength: number;
  isPromptTooLong: boolean;
  isTextToImageMode: boolean;
  isReferenceUploading: boolean;
  hasReferenceUploadError: boolean;
  taskStatusLabel: string;

  // Config (from props)
  config: Required<ImageGeneratorConfig>;
}

// Actions interface
export interface ImageGeneratorActions {
  // Tab change
  setActiveTab: (tab: ImageGeneratorTab) => void;

  // Form operations
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  setPrompt: (prompt: string) => void;
  handleReferenceImagesChange: (items: ImageUploaderValue[]) => void;

  // Core operations
  generate: () => Promise<void>;
  downloadImage: (image: GeneratedImage) => Promise<void>;

  // Internal operations
  resetTaskState: () => void;
}

// Combined context type following { state, actions } pattern
export interface ImageGeneratorContextValue {
  state: ImageGeneratorState;
  actions: ImageGeneratorActions;
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVAL = 5000;
const GENERATION_TIMEOUT = 180000;
export const MAX_PROMPT_LENGTH = 2000;

export const MODEL_OPTIONS = [
  {
    value: 'google/nano-banana-pro',
    label: 'Nano Banana Pro',
    provider: 'replicate',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'bytedance/seedream-4',
    label: 'Seedream 4',
    provider: 'replicate',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'fal-ai/nano-banana-pro',
    label: 'Nano Banana Pro',
    provider: 'fal',
    scenes: ['text-to-image'],
  },
  {
    value: 'fal-ai/nano-banana-pro/edit',
    label: 'Nano Banana Pro',
    provider: 'fal',
    scenes: ['image-to-image'],
  },
  {
    value: 'fal-ai/bytedance/seedream/v4/edit',
    label: 'Seedream 4',
    provider: 'fal',
    scenes: ['image-to-image'],
  },
  {
    value: 'fal-ai/z-image/turbo',
    label: 'Z-Image Turbo',
    provider: 'fal',
    scenes: ['text-to-image'],
  },
  {
    value: 'fal-ai/flux-2-flex',
    label: 'Flux 2 Flex',
    provider: 'fal',
    scenes: ['text-to-image'],
  },
  {
    value: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image Preview',
    provider: 'gemini',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    provider: 'kie',
    scenes: ['text-to-image', 'image-to-image'],
  },
];

export const PROVIDER_OPTIONS = [
  {
    value: 'replicate',
    label: 'Replicate',
  },
  {
    value: 'fal',
    label: 'Fal',
  },
  {
    value: 'gemini',
    label: 'Gemini',
  },
  {
    value: 'kie',
    label: 'Kie',
  },
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

function extractImageUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  const output = result.output ?? result.images ?? result.data;

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
          const candidate =
            item.url ?? item.uri ?? item.image ?? item.src ?? item.imageUrl;
          return typeof candidate === 'string' ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === 'object') {
    const candidate =
      output.url ?? output.uri ?? output.image ?? output.src ?? output.imageUrl;
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
      return 'Generating your image...';
    case AITaskStatus.SUCCESS:
      return 'Image generation completed';
    case AITaskStatus.FAILED:
      return 'Generation failed';
    default:
      return '';
  }
}

// ============================================================================
// Context
// ============================================================================

const ImageGeneratorContext = createContext<ImageGeneratorContextValue | null>(
  null
);

// ============================================================================
// Provider
// ============================================================================

interface ImageGeneratorProviderProps {
  children: ReactNode;
  config?: ImageGeneratorConfig;
}

export function ImageGeneratorProvider({
  children,
  config: configProp,
}: ImageGeneratorProviderProps) {
  // Merge config with defaults
  const config: Required<ImageGeneratorConfig> = useMemo(
    () => ({
      allowMultipleImages: configProp?.allowMultipleImages ?? true,
      maxImages: configProp?.maxImages ?? 9,
      maxSizeMB: configProp?.maxSizeMB ?? 5,
    }),
    [configProp?.allowMultipleImages, configProp?.maxImages, configProp?.maxSizeMB]
  );

  // -------------------------------------------------------------------------
  // Auth & UI context
  // -------------------------------------------------------------------------
  const { user, refreshUser } = useAuth();
  const { setIsShowSignModal } = useUI();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [activeTab, setActiveTabState] =
    useState<ImageGeneratorTab>('text-to-image');
  const [costCredits, setCostCredits] = useState<number>(2);
  const [provider, setProviderState] = useState(
    PROVIDER_OPTIONS[0]?.value ?? ''
  );
  const [model, setModelState] = useState(MODEL_OPTIONS[0]?.value ?? '');
  const [prompt, setPromptState] = useState('');
  const [referenceImageItems, setReferenceImageItems] = useState<
    ImageUploaderValue[]
  >([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null
  );
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);

  // Refs for callbacks to avoid stale closures
  const generationStartTimeRef = useRef(generationStartTime);
  generationStartTimeRef.current = generationStartTime;

  // -------------------------------------------------------------------------
  // Hydration effect
  // -------------------------------------------------------------------------
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const promptLength = prompt.trim().length;
  const isPromptTooLong = promptLength > MAX_PROMPT_LENGTH;
  const isTextToImageMode = activeTab === 'text-to-image';

  const isReferenceUploading = useMemo(
    () => referenceImageItems.some((item) => item.status === 'uploading'),
    [referenceImageItems]
  );

  const hasReferenceUploadError = useMemo(
    () => referenceImageItems.some((item) => item.status === 'error'),
    [referenceImageItems]
  );

  const taskStatusLabel = useMemo(
    () => getTaskStatusLabel(taskStatus),
    [taskStatus]
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const resetTaskState = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setTaskId(null);
    setGenerationStartTime(null);
    setTaskStatus(null);
  }, []);

  const setActiveTab = useCallback((tab: ImageGeneratorTab) => {
    setActiveTabState(tab);

    // Update available models based on new tab and current provider
    setProviderState((currentProvider) => {
      const availableModels = MODEL_OPTIONS.filter(
        (option) =>
          option.scenes.includes(tab) && option.provider === currentProvider
      );

      if (availableModels.length > 0) {
        setModelState(availableModels[0].value);
      } else {
        setModelState('');
      }

      return currentProvider;
    });

    // Update cost credits
    if (tab === 'text-to-image') {
      setCostCredits(2);
    } else {
      setCostCredits(4);
    }
  }, []);

  const setProvider = useCallback(
    (value: string) => {
      setProviderState(value);

      // Update available models based on current tab and new provider
      const availableModels = MODEL_OPTIONS.filter(
        (option) =>
          option.scenes.includes(activeTab) && option.provider === value
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

  const handleReferenceImagesChange = useCallback(
    (items: ImageUploaderValue[]) => {
      setReferenceImageItems(items);
      const uploadedUrls = items
        .filter((item) => item.status === 'uploaded' && item.url)
        .map((item) => item.url as string);
      setReferenceImageUrls(uploadedUrls);
    },
    []
  );

  const pollTaskStatus = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const startTime = generationStartTimeRef.current;
        if (startTime && Date.now() - startTime > GENERATION_TIMEOUT) {
          resetTaskState();
          toast.error('Image generation timed out. Please try again.');
          return true;
        }

        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
        const imageUrls = extractImageUrls(parsedResult);

        if (currentStatus === AITaskStatus.PENDING) {
          setProgress((prev) => Math.max(prev, 20));
          return false;
        }

        if (currentStatus === AITaskStatus.PROCESSING) {
          if (imageUrls.length > 0) {
            setGeneratedImages(
              imageUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              }))
            );
            setProgress((prev) => Math.max(prev, 85));
          } else {
            setProgress((prev) => Math.min(prev + 10, 80));
          }
          return false;
        }

        if (currentStatus === AITaskStatus.SUCCESS) {
          if (imageUrls.length === 0) {
            toast.error('The provider returned no images. Please retry.');
          } else {
            setGeneratedImages(
              imageUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              }))
            );
            toast.success('Image generated successfully');
          }

          setProgress(100);
          resetTaskState();
          return true;
        }

        if (currentStatus === AITaskStatus.FAILED) {
          const errorMessage =
            parsedResult?.errorMessage || 'Generate image failed';
          toast.error(errorMessage);
          resetTaskState();

          void refreshUser();

          return true;
        }

        setProgress((prev) => Math.min(prev + 5, 95));
        return false;
      } catch (error: any) {
        console.error('Error polling image task:', error);
        toast.error(`Query task failed: ${error.message}`);
        resetTaskState();

        void refreshUser();

        return true;
      }
    },
    [resetTaskState, refreshUser]
  );

  // -------------------------------------------------------------------------
  // Task polling effect
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!taskId || !isGenerating) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (!taskId) {
        return;
      }
      const completed = await pollTaskStatus(taskId);
      if (completed) {
        cancelled = true;
      }
    };

    tick();

    const interval = setInterval(async () => {
      if (cancelled || !taskId) {
        clearInterval(interval);
        return;
      }
      const completed = await pollTaskStatus(taskId);
      if (completed) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [taskId, isGenerating, pollTaskStatus]);

  // -------------------------------------------------------------------------
  // Core actions
  // -------------------------------------------------------------------------

  const generate = useCallback(async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // Quota check is done server-side in the API route.
    // Client-side check removed to avoid stale data issues.

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error('Please enter a prompt before generating.');
      return;
    }

    if (!provider || !model) {
      toast.error('Provider or model is not configured correctly.');
      return;
    }

    if (!isTextToImageMode && referenceImageUrls.length === 0) {
      toast.error('Please upload reference images before generating.');
      return;
    }

    setIsGenerating(true);
    setProgress(15);
    setTaskStatus(AITaskStatus.PENDING);
    setGeneratedImages([]);
    setGenerationStartTime(Date.now());

    try {
      const options: any = {};

      if (!isTextToImageMode) {
        options.image_input = referenceImageUrls;
      }

      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaType: AIMediaType.IMAGE,
          scene: isTextToImageMode ? 'text-to-image' : 'image-to-image',
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
        throw new Error(message || 'Failed to create an image task');
      }

      const newTaskId = data?.id;
      if (!newTaskId) {
        throw new Error('Task id missing in response');
      }

      if (data.status === AITaskStatus.SUCCESS && data.taskInfo) {
        const parsedResult = parseTaskResult(data.taskInfo);
        const imageUrls = extractImageUrls(parsedResult);

        if (imageUrls.length > 0) {
          setGeneratedImages(
            imageUrls.map((url, index) => ({
              id: `${newTaskId}-${index}`,
              url,
              provider,
              model,
              prompt: trimmedPrompt,
            }))
          );
          toast.success('Image generated successfully');
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
      console.error('Failed to generate image:', error);
      toast.error(`Failed to generate image: ${error.message}`);
      resetTaskState();
    }
  }, [
    user,
    setIsShowSignModal,
    costCredits,
    prompt,
    provider,
    model,
    isTextToImageMode,
    referenceImageUrls,
    resetTaskState,
    refreshUser,
  ]);

  const downloadImage = useCallback(async (image: GeneratedImage) => {
    if (!image.url) {
      return;
    }

    try {
      setDownloadingImageId(image.id);
      // fetch image via proxy
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(image.url)}`
      );
      if (!resp.ok) {
        throw new Error('Failed to fetch image');
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error('Failed to download image');
    } finally {
      setDownloadingImageId(null);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Build context value
  // -------------------------------------------------------------------------

  const state: ImageGeneratorState = useMemo(
    () => ({
      activeTab,
      provider,
      model,
      prompt,
      costCredits,
      referenceImageItems,
      referenceImageUrls,
      isGenerating,
      progress,
      taskId,
      taskStatus,
      generatedImages,
      downloadingImageId,
      isMounted,
      // Computed
      promptLength,
      isPromptTooLong,
      isTextToImageMode,
      isReferenceUploading,
      hasReferenceUploadError,
      taskStatusLabel,
      // Config
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
      isGenerating,
      progress,
      taskId,
      taskStatus,
      generatedImages,
      downloadingImageId,
      isMounted,
      promptLength,
      isPromptTooLong,
      isTextToImageMode,
      isReferenceUploading,
      hasReferenceUploadError,
      taskStatusLabel,
      config,
    ]
  );

  const actions: ImageGeneratorActions = useMemo(
    () => ({
      setActiveTab,
      setProvider,
      setModel,
      setPrompt,
      handleReferenceImagesChange,
      generate,
      downloadImage,
      resetTaskState,
    }),
    [
      setActiveTab,
      setProvider,
      setModel,
      setPrompt,
      handleReferenceImagesChange,
      generate,
      downloadImage,
      resetTaskState,
    ]
  );

  const value: ImageGeneratorContextValue = useMemo(
    () => ({ state, actions }),
    [state, actions]
  );

  return (
    <ImageGeneratorContext.Provider value={value}>
      {children}
    </ImageGeneratorContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access Image Generator context with { state, actions } interface
 * Following code_principle.md
 *
 * @example
 * ```tsx
 * const { state, actions } = useImageGenerator();
 * // state.isGenerating, state.generatedImages
 * // actions.generate(), actions.downloadImage()
 * ```
 */
export function useImageGenerator(): ImageGeneratorContextValue {
  const context = useContext(ImageGeneratorContext);
  if (!context) {
    throw new Error(
      'useImageGenerator must be used within an ImageGeneratorProvider'
    );
  }
  return context;
}
