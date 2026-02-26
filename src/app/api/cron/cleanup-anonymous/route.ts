import { and, eq, inArray, lt, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  anonymousUser,
  deviceFingerprint,
  ipTracking,
  user,
} from '@/config/db/schema';

const BATCH_SIZE = 500;
const STALE_TRACKING_DAYS = 30;

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    let totalCleaned = 0;

    // Process in batches to avoid Vercel execution timeouts
    let hasMore = true;
    while (hasMore) {
      // Find expired, non-converted anonymous users
      const expired = await db()
        .select({ id: anonymousUser.id, shadowUserId: anonymousUser.shadowUserId })
        .from(anonymousUser)
        .where(
          and(
            eq(anonymousUser.isConverted, false),
            lt(anonymousUser.expiresAt, now)
          )
        )
        .limit(BATCH_SIZE);

      if (expired.length === 0) {
        hasMore = false;
        break;
      }

      const shadowUserIds = expired.map((e: { id: string; shadowUserId: string }) => e.shadowUserId);
      const anonIds = expired.map((e: { id: string; shadowUserId: string }) => e.id);

      // Delete anonymous_user records first (they FK to user with CASCADE from user side)
      await db()
        .delete(anonymousUser)
        .where(inArray(anonymousUser.id, anonIds));

      // Delete shadow users -- CASCADE deletes apikey, quota, ai_task, session automatically
      await db()
        .delete(user)
        .where(inArray(user.id, shadowUserIds));

      totalCleaned += expired.length;

      if (expired.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // Also clean up converted anonymous users whose shadow users are now inert
    const convertedExpired = await db()
      .select({ id: anonymousUser.id, shadowUserId: anonymousUser.shadowUserId })
      .from(anonymousUser)
      .where(
        and(
          eq(anonymousUser.isConverted, true),
          lt(anonymousUser.expiresAt, now)
        )
      )
      .limit(BATCH_SIZE);

    if (convertedExpired.length > 0) {
      const shadowIds = convertedExpired.map((e: { id: string; shadowUserId: string }) => e.shadowUserId);
      const anonIds = convertedExpired.map((e: { id: string; shadowUserId: string }) => e.id);

      await db()
        .delete(anonymousUser)
        .where(inArray(anonymousUser.id, anonIds));

      // Shadow users for converted sessions should have no remaining FKs
      // (ai_tasks were transferred, quota expired, apikeys deleted)
      await db()
        .delete(user)
        .where(inArray(user.id, shadowIds));

      totalCleaned += convertedExpired.length;
    }

    // Reset stale tracking counters
    const staleDate = new Date(
      now.getTime() - STALE_TRACKING_DAYS * 24 * 60 * 60 * 1000
    );

    await db()
      .update(ipTracking)
      .set({ anonymousAccountCount: 0 })
      .where(lt(ipTracking.lastSeenAt, staleDate));

    await db()
      .update(deviceFingerprint)
      .set({ anonymousAccountCount: 0 })
      .where(lt(deviceFingerprint.lastSeenAt, staleDate));

    return Response.json({
      ok: true,
      cleaned: totalCleaned,
      timestamp: now.toISOString(),
    });
  } catch (e: any) {
    console.error('cleanup-anonymous cron failed', e);
    return Response.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
