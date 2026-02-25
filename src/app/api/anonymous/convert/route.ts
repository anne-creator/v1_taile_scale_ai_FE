import { respErr, respOk } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { convertAnonymousUser } from '@/shared/services/anonymous';

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Authentication required');
    }

    const body = await request.json();
    const { anonymousUserId } = body;

    if (!anonymousUserId) {
      return respErr('anonymousUserId is required');
    }

    await convertAnonymousUser(anonymousUserId, user.id);

    return respOk();
  } catch (e: any) {
    console.error('anonymous/convert failed', e);
    return respErr(e.message || 'Failed to convert anonymous session');
  }
}
