export * from './music';
export * from './image';
export * from './video';

// Re-export wrapper components with Provider included
// Following code_principle.md: Page-level Provider wrapping

import {
  ImageGeneratorProvider,
  ImageGeneratorConfig,
  VideoGeneratorProvider,
  VideoGeneratorConfig,
  MusicGeneratorProvider,
} from '@/providers';
import { ImageGenerator } from './image';
import { VideoGenerator } from './video';
import { MusicGenerator } from './music';

// ============================================================================
// ImageGenerator with Provider
// ============================================================================

interface ImageGeneratorWithProviderProps {
  srOnlyTitle?: string;
  className?: string;
  config?: ImageGeneratorConfig;
}

/**
 * ImageGenerator with Provider wrapper
 * Use this in pages to avoid manual Provider wrapping
 */
export function ImageGeneratorWithProvider({
  config,
  ...props
}: ImageGeneratorWithProviderProps) {
  return (
    <ImageGeneratorProvider config={config}>
      <ImageGenerator {...props} />
    </ImageGeneratorProvider>
  );
}

// ============================================================================
// VideoGenerator with Provider
// ============================================================================

interface VideoGeneratorWithProviderProps {
  srOnlyTitle?: string;
  config?: VideoGeneratorConfig;
}

/**
 * VideoGenerator with Provider wrapper
 * Use this in pages to avoid manual Provider wrapping
 */
export function VideoGeneratorWithProvider({
  config,
  ...props
}: VideoGeneratorWithProviderProps) {
  return (
    <VideoGeneratorProvider config={config}>
      <VideoGenerator {...props} />
    </VideoGeneratorProvider>
  );
}

// ============================================================================
// MusicGenerator with Provider
// ============================================================================

interface MusicGeneratorWithProviderProps {
  srOnlyTitle?: string;
  className?: string;
}

/**
 * MusicGenerator with Provider wrapper
 * Use this in pages to avoid manual Provider wrapping
 */
export function MusicGeneratorWithProvider(props: MusicGeneratorWithProviderProps) {
  return (
    <MusicGeneratorProvider>
      <MusicGenerator {...props} />
    </MusicGeneratorProvider>
  );
}
