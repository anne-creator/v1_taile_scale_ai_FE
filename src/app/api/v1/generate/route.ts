import { envConfigs } from '@/config';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { findApikeyByKey } from '@/shared/models/apikey';
import { getRemainingCredits } from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

/**
 * Public API for generating images
 * Requires X-API-Key header for authentication
 */
export async function POST(request: Request) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return respErr('API key is required. Please provide X-API-Key header.');
    }

    // Validate API key
    const apikeyRecord = await findApikeyByKey(apiKey);
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

    // Default values
    const provider = 'gemini';
    const model = 'gemini-2.0-flash-exp-image-generation';
    const mediaType = AIMediaType.IMAGE;
    const scene = 'text-to-image';

    const aiService = await getAIService();

    // Check AI provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      return respErr('AI provider not available');
    }

    // Cost credits for image generation
    const costCredits = 2;

    // Check credits
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < costCredits) {
      return respErr('insufficient credits');
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
    };

    // Generate content
    const result = await aiProvider.generate({ params });
    if (!result?.taskId) {
      return respErr('Generation failed');
    }

    // Create AI task record
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: JSON.stringify({ style, aspect_ratio }),
      status: result.taskStatus,
      costCredits,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
    };
    await createAITask(newAITask);

    // For synchronous providers (like Gemini), return the image URL directly
    if (result.taskStatus === AITaskStatus.SUCCESS && result.taskInfo?.images?.[0]?.imageUrl) {
      return respData({
        id: newAITask.id,
        status: 'success',
        image_url: result.taskInfo.images[0].imageUrl,
      });
    }

    // For async providers, return task ID for polling
    return respData({
      id: newAITask.id,
      status: 'processing',
      message: 'Image is being generated. Poll /api/v1/status/{id} for result.',
    });
  } catch (e: any) {
    console.error('v1/generate failed', e);
    return respErr(e.message || 'Generation failed');
  }
}
