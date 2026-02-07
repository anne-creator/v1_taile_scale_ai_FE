/**
 * Core Services - Gemini Image Generation Client
 *
 * Direct Gemini API client for watercolor illustration generation.
 * This module combines system messages (style prompt + reference images)
 * with user messages (scene description) to generate illustrations.
 */

import { nanoid } from 'nanoid';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { getUuid } from '@/shared/lib/hash';

import {
  SYSTEM_STYLE_PROMPT,
  REFERENCE_IMAGE_PATHS,
  DEFAULT_IMAGE_MODEL,
  GEMINI_API_BASE_URL,
} from './constants';
import type {
  GenerateIllustrationParams,
  GenerationResult,
  ReferenceImageData,
  GeminiRequestPart,
} from './types';

/**
 * Cache for loaded reference images to avoid repeated file reads.
 */
let cachedReferenceImages: ReferenceImageData[] | null = null;

/**
 * Load reference images from the public directory and convert to base64.
 * Results are cached for subsequent calls.
 */
async function loadReferenceImages(): Promise<ReferenceImageData[]> {
  if (cachedReferenceImages) {
    return cachedReferenceImages;
  }

  const images: ReferenceImageData[] = [];

  for (const imagePath of REFERENCE_IMAGE_PATHS) {
    try {
      // Resolve path relative to project root (public directory)
      const fullPath = join(process.cwd(), 'public', imagePath);
      const buffer = await readFile(fullPath);
      const base64 = buffer.toString('base64');

      // Determine MIME type from extension
      const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

      images.push({
        data: base64,
        mimeType,
      });
    } catch (error) {
      console.error(`Failed to load reference image: ${imagePath}`, error);
      // Continue loading other images even if one fails
    }
  }

  if (images.length === 0) {
    throw new Error('No reference images could be loaded');
  }

  cachedReferenceImages = images;
  return images;
}

/**
 * Build request parts for Gemini API.
 * Order: System Style Prompt -> Reference Images -> User Prompt
 */
function buildRequestParts(
  referenceImages: ReferenceImageData[],
  userPrompt: string
): GeminiRequestPart[] {
  const parts: GeminiRequestPart[] = [];

  // 1. System: Style prompt
  parts.push({ text: SYSTEM_STYLE_PROMPT });

  // 2. System: Reference images
  for (const image of referenceImages) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }

  // 3. User: Scene description
  parts.push({ text: userPrompt });

  return parts;
}

/**
 * Generate a watercolor illustration using Gemini API.
 *
 * This function:
 * 1. Loads bundled reference images (cached)
 * 2. Combines system prompt + reference images + user prompt
 * 3. Calls Gemini API
 * 4. Uploads generated image to storage
 * 5. Returns the image URL
 *
 * @param params - Generation parameters including user prompt and API key
 * @returns Generated image result with URL
 */
export async function generateIllustration({
  userPrompt,
  apiKey,
  model = DEFAULT_IMAGE_MODEL,
  style: _style,
  aspectRatio,
}: GenerateIllustrationParams): Promise<GenerationResult> {
  if (!userPrompt?.trim()) {
    throw new Error('User prompt is required');
  }

  if (!apiKey) {
    throw new Error('API key is required');
  }

  // Load reference images
  const referenceImages = await loadReferenceImages();

  // Build request parts
  const parts = buildRequestParts(referenceImages, userPrompt.trim());

  // Build API URL
  const apiUrl = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  // Build request payload
  const generationConfig: Record<string, unknown> = {
    responseModalities: ['TEXT', 'IMAGE'],
  };

  // Add aspect ratio via imageConfig (per Gemini API spec)
  if (aspectRatio) {
    generationConfig.imageConfig = { aspectRatio };
  }

  const payload = {
    contents: {
      role: 'user',
      parts,
    },
    generationConfig,
  };

  // Call Gemini API
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini API request failed with status ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  // Validate response
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No candidates returned from Gemini API');
  }

  const candidate = data.candidates[0];
  const responseParts = candidate.content?.parts;

  if (!responseParts || responseParts.length === 0) {
    throw new Error('No parts returned in response');
  }

  // Find image part in response
  const imagePart = responseParts.find((p: any) => p.inlineData);

  if (!imagePart) {
    throw new Error('No image generated in response');
  }

  const mimeType = imagePart.inlineData.mimeType;
  const base64Data = imagePart.inlineData.data;

  // Upload to storage
  const { getStorageService } = await import('@/shared/services/storage');
  const storageService = await getStorageService();
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType.split('/')[1] || 'png';
  const key = `illustrations/${getUuid()}.${ext}`;

  const uploadResult = await storageService.uploadFile({
    body: buffer,
    key,
    contentType: mimeType,
  });

  if (!uploadResult || !uploadResult.url) {
    throw new Error('Failed to upload generated image to storage');
  }

  const taskId = nanoid();

  return {
    taskId,
    imageUrl: uploadResult.url,
    mimeType,
    createdAt: new Date(),
  };
}

/**
 * Clear the reference images cache.
 * Useful for testing or when reference images are updated.
 */
export function clearReferenceImageCache(): void {
  cachedReferenceImages = null;
}
