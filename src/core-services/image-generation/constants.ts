/**
 * Core Services - Image Generation Constants
 *
 * System-level configuration for watercolor illustration generation.
 * These are fixed/bundled resources that define the style and reference images.
 */

/**
 * System style prompt for watercolor illustration generation.
 * This prompt instructs the AI to replicate a specific visual style.
 */
export const SYSTEM_STYLE_PROMPT = `Analyze the attached reference images and replicate the exact visual style, line work, and atmosphere so that the new illustration appears to be from the same physical book.

Use medium dry watercolor with overlapping watercolor strokes to create variety and texture. Background should has less object details and firm lines, but the texture with water color strokes still needs to be there. Ensure characters are anthropomorphic animals wearing clothing.`;

/**
 * Paths to bundled reference images (relative to public directory).
 * These images define the target watercolor style.
 */
export const REFERENCE_IMAGE_PATHS = [
  '/reference-images/style-1.png',
  '/reference-images/style-2.png',
  '/reference-images/style-3.png',
  '/reference-images/style-4.png',
  '/reference-images/style-5.png',
] as const;

/**
 * Default model for image generation.
 * gemini-3-pro-image-preview is also known as "Nano Banana Pro".
 */
export const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';

/**
 * Gemini API base URL for image generation.
 */
export const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';
