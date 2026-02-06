import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getQuotaOverview } from '@/shared/models/quota';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

export async function POST(req: Request) {
  try {
    // get sign user info
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // Fetch admin status and quota overview in parallel (per code_principle.md)
    const [isAdmin, quotaOverview] = await Promise.all([
      hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS),
      getQuotaOverview(user.id),
    ]);

    return respData({ ...user, isAdmin, quota: quotaOverview });
  } catch (e) {
    console.log('get user info failed:', e);
    return respErr('get user info failed');
  }
}
