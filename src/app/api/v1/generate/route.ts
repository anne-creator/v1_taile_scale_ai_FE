import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { findApikeyByKey } from '@/shared/models/apikey';
import { getAllConfigs } from '@/shared/models/config';
import { canConsumeService } from '@/shared/models/quota';
import { findUserById } from '@/shared/models/user';
import {
  generateIllustration,
  DEFAULT_IMAGE_MODEL,
} from '@/core-services/image-generation';

/**
 * Public API for generating watercolor illustrations.
 *
 * This endpoint uses the core-services image generation module which:
 * - Includes pre-configured system messages (style prompt + 5 reference images)
 * - User only needs to provide a scene description
 *
 * Requires X-API-Key header for authentication.
 *
 * @example
 * POST /api/v1/generate
 * Headers: { "X-API-Key": "your-api-key" }
 * Body: { "prompt": "A hedgehog reading a book in a cozy library", "style": "children_book", "aspect_ratio": "16:9" }
 */
const FUNCTION_MAX_DURATION_MS = 115_000;

export async function POST(request: Request) {
  const deadlineMs = Date.now() + FUNCTION_MAX_DURATION_MS;
  try {
    // Get API key from header (user's API key for authentication)
    const userApiKey = request.headers.get('X-API-Key');
    if (!userApiKey) {
      return respErr('API key is required. Please provide X-API-Key header.');
    }

    // Validate API key
    const apikeyRecord = await findApikeyByKey(userApiKey);
    if (!apikeyRecord) {
      return respErr('Invalid API key');
    }

    // Get user from API key
    const user = await findUserById(apikeyRecord.userId);
    if (!user) {
      return respErr('User not found');
    }

    // Parse request body
    const body = await request.json();
    const { prompt, style, aspect_ratio } = body;

    if (!prompt) {
      return respErr('prompt is required');
    }

    // Validate style if provided (currently only children_book is supported)
    const validStyles = ['children_book'];
    const illustrationStyle = style || 'children_book';
    if (!validStyles.includes(illustrationStyle)) {
      return respErr(`Unsupported style: "${style}". Supported styles: ${validStyles.join(', ')}`);
    }

    // Validate aspect_ratio if provided
    const validAspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'];
    if (aspect_ratio && !validAspectRatios.includes(aspect_ratio)) {
      return respErr(`Unsupported aspect_ratio: "${aspect_ratio}". Supported: ${validAspectRatios.join(', ')}`);
    }

    // Get configs from database and environment
    const configs = await getAllConfigs();

    // Get Gemini API key from configs (database) or environment
    const geminiApiKey =
      configs.gemini_api_key ||
      process.env.GEMINI_IMAGE_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return respErr('Image generation service is not configured');
    }

    // Default values
    const provider = 'gemini';
    const model = DEFAULT_IMAGE_MODEL;
    const mediaType = AIMediaType.IMAGE;
    const scene = 'text-to-image';

    // Check quota (cost is looked up from service_cost table)
    const hasQuota = await canConsumeService(user.id, `ai-${mediaType}`, scene);
    if (!hasQuota) {
      return respErr('insufficient quota');
    }

    const result = await generateIllustration({
      userPrompt: prompt,
      apiKey: geminiApiKey,
      model,
      style: illustrationStyle,
      aspectRatio: aspect_ratio,
      deadlineMs,
    });

    // Create AI task record
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: JSON.stringify({ style: illustrationStyle, aspect_ratio: aspect_ratio || '1:1' }),
      status: AITaskStatus.SUCCESS,
      taskId: result.taskId,
      taskInfo: JSON.stringify({
        images: [{ imageUrl: result.imageUrl, imageType: result.mimeType }],
        status: 'success',
        createTime: result.createdAt,
      }),
      taskResult: null,
    };
    await createAITask(newAITask);

    // Return the generated image URL
    return respData({
      id: newAITask.id,
      status: 'success',
      image_url: result.imageUrl,
    });
  } catch (e: any) {
    console.error('v1/generate failed', e);
    return respErr(e.message || 'Generation failed');
  }
}
