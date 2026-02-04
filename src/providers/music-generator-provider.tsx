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

import { AISong, AITaskStatus } from '@/extensions/ai/types';
import { useAuth } from '@/providers/auth-provider';
import { useUI } from '@/providers/ui-provider';

/**
 * Music Generator Context - Page-level State Provider
 *
 * Following code_principle.md: Provider uses { state, actions } interface
 * This is a page-level provider, not global. Wrap it around components that need music generation.
 */

// ============================================================================
// Types
// ============================================================================

export interface GeneratedSong {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  imageUrl?: string;
  artist: string;
  style: string;
  status: string;
  prompt?: string;
}

// State interface
export interface MusicGeneratorState {
  // Form state
  provider: string;
  model: string;
  customMode: boolean;
  title: string;
  style: string;
  instrumental: boolean;
  lyrics: string;
  prompt: string;
  costCredits: number;

  // Generation state
  isGenerating: boolean;
  progress: number;
  taskId: string | null;

  // Results
  generatedSongs: GeneratedSong[];
  currentPlayingSong: GeneratedSong | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;

  // Hydration state
  isMounted: boolean;
}

// Actions interface
export interface MusicGeneratorActions {
  // Form operations
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  setCustomMode: (customMode: boolean) => void;
  setTitle: (title: string) => void;
  setStyle: (style: string) => void;
  setInstrumental: (instrumental: boolean) => void;
  setLyrics: (lyrics: string) => void;
  setPrompt: (prompt: string) => void;

  // Core operations
  generate: () => Promise<void>;
  togglePlay: (song: GeneratedSong, audioRef: React.RefObject<HTMLAudioElement | null>) => Promise<void>;
  downloadAudio: (song: GeneratedSong) => Promise<void>;
  stopPlayback: () => void;
}

// Combined context type
export interface MusicGeneratorContextValue {
  state: MusicGeneratorState;
  actions: MusicGeneratorActions;
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVAL = 10000;
const GENERATION_TIMEOUT = 180000; // 3 minutes

export const MUSIC_COST_CREDITS = 10;

export const MUSIC_MODEL_OPTIONS = [
  { value: 'V5', label: 'Suno V5' },
  { value: 'V4_5PLUS', label: 'Suno V4.5+' },
  { value: 'V4_5', label: 'Suno V4.5' },
  { value: 'V4', label: 'Suno V4' },
  { value: 'V3_5', label: 'Suno V3.5' },
];

// ============================================================================
// Context
// ============================================================================

const MusicGeneratorContext = createContext<MusicGeneratorContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface MusicGeneratorProviderProps {
  children: ReactNode;
}

export function MusicGeneratorProvider({ children }: MusicGeneratorProviderProps) {
  // Auth & UI context
  const { user, refreshUser } = useAuth();
  const { setIsShowSignModal } = useUI();

  // Form state
  const [provider, setProviderState] = useState('kie');
  const [model, setModelState] = useState('V5');
  const [customMode, setCustomModeState] = useState(false);
  const [title, setTitleState] = useState('');
  const [style, setStyleState] = useState('');
  const [instrumental, setInstrumentalState] = useState(false);
  const [lyrics, setLyricsState] = useState('');
  const [prompt, setPromptState] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [generatedSongs, setGeneratedSongs] = useState<GeneratedSong[]>([]);
  const [currentPlayingSong, setCurrentPlayingSong] = useState<GeneratedSong | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Hydration state
  const [isMounted, setIsMounted] = useState(false);

  const costCredits = MUSIC_COST_CREDITS;

  // Refs
  const generationStartTimeRef = useRef(generationStartTime);
  generationStartTimeRef.current = generationStartTime;
  const audioRefInternal = useRef<HTMLAudioElement | null>(null);

  // Hydration effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Actions
  const setProvider = useCallback((value: string) => setProviderState(value), []);
  const setModel = useCallback((value: string) => setModelState(value), []);
  const setCustomMode = useCallback((value: boolean) => setCustomModeState(value), []);
  const setTitle = useCallback((value: string) => setTitleState(value), []);
  const setStyle = useCallback((value: string) => setStyleState(value), []);
  const setInstrumental = useCallback((value: boolean) => setInstrumentalState(value), []);
  const setLyrics = useCallback((value: string) => setLyricsState(value), []);
  const setPrompt = useCallback((value: string) => setPromptState(value), []);

  const resetTaskState = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setGenerationStartTime(null);
  }, []);

  const pollTaskStatus = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // Check timeout
        const startTime = generationStartTimeRef.current;
        if (startTime) {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > GENERATION_TIMEOUT) {
            resetTaskState();
            toast.error('Generate music timed out. Please try again.');
            return true;
          }
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
          throw new Error(message);
        }

        const { status, taskInfo } = data;
        if (!status || !taskInfo) {
          throw new Error('Query task info failed');
        }

        const task = JSON.parse(taskInfo);
        const { errorCode, errorMessage, songs } = task;
        if (errorCode || errorMessage) {
          throw new Error(errorMessage);
        }

        // Task pending
        if (status === AITaskStatus.PENDING) {
          setProgress(10);
          return false;
        }

        // Task processing
        if (status === AITaskStatus.PROCESSING) {
          setProgress(20);

          const isTextSuccess = songs?.some((song: AISong) => song.imageUrl);
          const isFirstSuccess = songs?.some((song: AISong) => song.audioUrl);

          if (isTextSuccess) {
            setProgress(60);
            setGeneratedSongs(songs);
            return false;
          }

          if (isFirstSuccess) {
            setProgress(85);
            setGeneratedSongs(songs);
            return false;
          }

          return false;
        }

        // Task failed
        if (status === AITaskStatus.FAILED) {
          resetTaskState();
          toast.error('Generate music failed: ' + errorMessage);
          void refreshUser();
          return true;
        }

        // Task success
        if (status === AITaskStatus.SUCCESS) {
          setGeneratedSongs(songs);
          setProgress(100);
          resetTaskState();
          return true;
        }

        // Still processing
        setProgress((prev) => Math.min(prev + 3, 80));
        return false;
      } catch (error: any) {
        console.error('Error polling task:', error);
        resetTaskState();
        toast.error('Create song failed: ' + error.message);
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

    const interval = setInterval(async () => {
      const completed = await pollTaskStatus(taskId);
      if (completed) {
        clearInterval(interval);
        setTaskId(null);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [taskId, isGenerating, pollTaskStatus]);

  const generate = useCallback(async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (!user.credits || user.credits.remainingCredits < costCredits) {
      toast.error('Insufficient credits');
      return;
    }

    if (!provider || !model) {
      toast.error('Invalid provider or model');
      return;
    }

    if (customMode) {
      if (!title || !style) {
        toast.error('Please enter title and style');
        return;
      }
      if (!instrumental && !lyrics) {
        toast.error('Please enter lyrics');
        return;
      }
    } else {
      if (!prompt) {
        toast.error('Please enter prompt');
        return;
      }
    }

    setIsGenerating(true);
    setProgress(10);
    setGeneratedSongs([]);
    setCurrentPlayingSong(null);
    setGenerationStartTime(Date.now());

    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: 'music',
          provider,
          model,
          prompt,
          options: {
            style,
            title,
            lyrics,
            customMode,
            instrumental,
          },
        }),
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Failed to generate music');
      }

      const newTaskId = data?.id;
      if (!newTaskId) {
        throw new Error('Failed to generate music');
      }

      await refreshUser();

      setTaskId(newTaskId);
      setProgress(20);
    } catch (err: any) {
      toast.error('Failed to generate music: ' + err.message);
      resetTaskState();
    }
  }, [
    user,
    setIsShowSignModal,
    costCredits,
    provider,
    model,
    customMode,
    title,
    style,
    instrumental,
    lyrics,
    prompt,
    refreshUser,
    resetTaskState,
  ]);

  const stopPlayback = useCallback(() => {
    if (audioRefInternal.current && !audioRefInternal.current.paused) {
      audioRefInternal.current.pause();
    }
    setIsPlaying(false);
    setCurrentPlayingSong(null);
    setIsLoadingAudio(false);
  }, []);

  const togglePlay = useCallback(
    async (song: GeneratedSong, audioRef: React.RefObject<HTMLAudioElement | null>) => {
      if (!song?.audioUrl) return;

      setIsLoadingAudio(true);

      try {
        // Stop current audio if playing
        if (audioRefInternal.current && !audioRefInternal.current.paused) {
          audioRefInternal.current.pause();
        }

        // If clicking on currently playing song, just pause
        if (currentPlayingSong?.id === song.id && isPlaying) {
          setIsPlaying(false);
          setCurrentPlayingSong(null);
          setIsLoadingAudio(false);
          return;
        }

        // Create new audio for the selected song
        audioRefInternal.current = new Audio(song.audioUrl);
        audioRefInternal.current.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentPlayingSong(null);
        });
        audioRefInternal.current.addEventListener('error', () => {
          setIsLoadingAudio(false);
          setIsPlaying(false);
          setCurrentPlayingSong(null);
        });

        // Play the selected song
        await audioRefInternal.current.play();
        setIsPlaying(true);
        setCurrentPlayingSong(song);
        setIsLoadingAudio(false);
      } catch (error) {
        console.error('Failed to play audio:', error);
        setIsLoadingAudio(false);
        setIsPlaying(false);
        setCurrentPlayingSong(null);
      }
    },
    [currentPlayingSong, isPlaying]
  );

  const downloadAudio = useCallback(async (song: GeneratedSong) => {
    if (!song?.audioUrl) return;

    try {
      toast.info('Downloading...');

      const response = await fetch(`/api/proxy/file?url=${encodeURIComponent(song.audioUrl)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audio file');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      toast.success('Download completed');
    } catch (error) {
      console.error('Failed to download audio:', error);
      toast.error('Failed to download');
    }
  }, []);

  // Build context value
  const state: MusicGeneratorState = useMemo(
    () => ({
      provider,
      model,
      customMode,
      title,
      style,
      instrumental,
      lyrics,
      prompt,
      costCredits,
      isGenerating,
      progress,
      taskId,
      generatedSongs,
      currentPlayingSong,
      isPlaying,
      isLoadingAudio,
      isMounted,
    }),
    [
      provider,
      model,
      customMode,
      title,
      style,
      instrumental,
      lyrics,
      prompt,
      costCredits,
      isGenerating,
      progress,
      taskId,
      generatedSongs,
      currentPlayingSong,
      isPlaying,
      isLoadingAudio,
      isMounted,
    ]
  );

  const actions: MusicGeneratorActions = useMemo(
    () => ({
      setProvider,
      setModel,
      setCustomMode,
      setTitle,
      setStyle,
      setInstrumental,
      setLyrics,
      setPrompt,
      generate,
      togglePlay,
      downloadAudio,
      stopPlayback,
    }),
    [
      setProvider,
      setModel,
      setCustomMode,
      setTitle,
      setStyle,
      setInstrumental,
      setLyrics,
      setPrompt,
      generate,
      togglePlay,
      downloadAudio,
      stopPlayback,
    ]
  );

  const value: MusicGeneratorContextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <MusicGeneratorContext.Provider value={value}>{children}</MusicGeneratorContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access Music Generator context with { state, actions } interface
 * Following code_principle.md
 */
export function useMusicGenerator(): MusicGeneratorContextValue {
  const context = useContext(MusicGeneratorContext);
  if (!context) {
    throw new Error('useMusicGenerator must be used within a MusicGeneratorProvider');
  }
  return context;
}
