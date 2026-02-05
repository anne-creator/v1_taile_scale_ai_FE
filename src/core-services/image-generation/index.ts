/**
 * Core Services - Image Generation
 *
 * Business-specific image generation service for watercolor illustrations.
 * This module directly calls Gemini API without going through the generic AI abstraction layer.
 */

// Main client
export { generateIllustration, clearReferenceImageCache } from './gemini-client';

// Types
export type {
  GenerateIllustrationParams,
  GenerationResult,
  ReferenceImageData,
} from './types';

// Constants
export {
  SYSTEM_STYLE_PROMPT,
  REFERENCE_IMAGE_PATHS,
  DEFAULT_IMAGE_MODEL,
  GEMINI_API_BASE_URL,
} from './constants';
