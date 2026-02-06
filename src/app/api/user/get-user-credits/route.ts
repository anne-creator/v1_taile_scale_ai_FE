import { respData, respErr } from '@/shared/lib/resp';
import { getQuotaOverview, getRemainingQuota } from '@/shared/models/quota';
import { getUserInfo } from '@/shared/models/user';

/**
 * @deprecated Use /api/user/get-user-info which returns quota overview.
 * Kept for backward compatibility.
 */
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // Return total remaining across all pools for backward compatibility
    const remaining = await getRemainingQuota(user.id);

    return respData({ remainingCredits: remaining });
  } catch (e) {
    console.log('get user quota failed:', e);
    return respErr('get user quota failed');
  }
}
