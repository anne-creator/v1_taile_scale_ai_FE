import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { findApikeyByKey } from '@/shared/models/apikey';
import { getAllConfigs } from '@/shared/models/config';
import { getRemainingCredits } from '@/shared/models/credit';
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
 * Body: { "prompt": "A hedgehog reading a book in a cozy library" }
 */
export async function POST(request: Request) {
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
    const { prompt } = body;

    if (!prompt) {
      return respErr('prompt is required');
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

    // Cost credits for illustration generation
    const costCredits = 2;

    // Check credits
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < costCredits) {
      return respErr('insufficient credits');
    }

    // Generate illustration using core-services
    // This automatically includes system prompt + reference images
    const result = await generateIllustration({
      userPrompt: prompt,
      apiKey: geminiApiKey,
      model,
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
      options: null,
      status: AITaskStatus.SUCCESS,
      costCredits,
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
