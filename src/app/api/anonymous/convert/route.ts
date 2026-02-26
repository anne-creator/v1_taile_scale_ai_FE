import { respErr, respOk } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { convertAnonymousUser } from '@/shared/services/anonymous';

const CONVERT_TIMEOUT_MS = 5000;

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

    const convertPromise = convertAnonymousUser(anonymousUserId, user.id);
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, CONVERT_TIMEOUT_MS)
    );

    await Promise.race([convertPromise, timeoutPromise]);

    return respOk();
  } catch (e: any) {
    console.error('anonymous/convert failed', e);
    return respOk();
  }
}
