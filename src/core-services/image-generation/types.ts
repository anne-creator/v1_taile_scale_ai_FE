/**
 * Core Services - Image Generation Types
 *
 * Type definitions for the watercolor illustration generation service.
 */

/**
 * Parameters for generating an illustration.
 */
export interface GenerateIllustrationParams {
  /**
   * User's scene description (e.g., "A hedgehog reading a book in a cozy library").
   * This will be combined with the system style prompt.
   */
  userPrompt: string;

  /**
   * Gemini API key.
   */
  apiKey: string;

  /**
   * Optional model override.
   * Defaults to gemini-3-pro-image-preview (Nano Banana Pro).
   */
  model?: string;
}

/**
 * Result of a successful illustration generation.
 */
export interface GenerationResult {
  /**
   * Unique task ID.
   */
  taskId: string;

  /**
   * URL of the generated image (uploaded to storage).
   */
  imageUrl: string;

  /**
   * MIME type of the generated image.
   */
  mimeType: string;

  /**
   * Timestamp of generation.
   */
  createdAt: Date;
}

/**
 * Internal type for reference image data.
 */
export interface ReferenceImageData {
  /**
   * Base64 encoded image data.
   */
  data: string;

  /**
   * MIME type of the image.
   */
  mimeType: string;
}

/**
 * Gemini API request part with inline data.
 */
export interface GeminiInlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

/**
 * Gemini API request part with text.
 */
export interface GeminiTextPart {
  text: string;
}

/**
 * Union type for Gemini API request parts.
 */
export type GeminiRequestPart = GeminiTextPart | GeminiInlineDataPart;
