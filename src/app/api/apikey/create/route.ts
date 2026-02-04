import { respData, respErr } from '@/shared/lib/resp';
import { getNonceStr, getUuid } from '@/shared/lib/hash';
import {
  ApikeyStatus,
  createApikey,
  getApikeysCount,
  NewApikey,
} from '@/shared/models/apikey';
import { getUserInfo } from '@/shared/models/user';

const MAX_API_KEYS = 20;

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // Check if user has reached the maximum number of API keys
    const existingCount = await getApikeysCount({
      userId: user.id,
      status: ApikeyStatus.ACTIVE,
    });

    if (existingCount >= MAX_API_KEYS) {
      return respErr(`Maximum ${MAX_API_KEYS} API keys allowed`);
    }

    // Parse request body for optional title
    let title = 'API Key';
    try {
      const body = await request.json();
      if (body.title) {
        title = body.title;
      }
    } catch {
      // Use default title if no body provided
    }

    // Generate new API key
    const key = `sk-${getNonceStr(32)}`;

    const newApikey: NewApikey = {
      id: getUuid(),
      userId: user.id,
      title: title,
      key: key,
      status: ApikeyStatus.ACTIVE,
    };

    await createApikey(newApikey);

    return respData({
      id: newApikey.id,
      key: key,
      title: title,
    });
  } catch (e: any) {
    console.error('create apikey failed', e);
    return respErr(e.message);
  }
}
