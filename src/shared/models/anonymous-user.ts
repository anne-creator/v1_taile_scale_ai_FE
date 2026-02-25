import { and, eq, gt } from 'drizzle-orm';

import { db } from '@/core/db';
import { anonymousUser } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type AnonymousUser = typeof anonymousUser.$inferSelect;
export type NewAnonymousUser = typeof anonymousUser.$inferInsert;

export async function createAnonymousUser(
  data: Omit<NewAnonymousUser, 'id'>
): Promise<AnonymousUser> {
  const [result] = await db()
    .insert(anonymousUser)
    .values({ id: getUuid(), ...data })
    .returning();
  return result;
}

export async function findAnonymousUserById(
  id: string
): Promise<AnonymousUser | undefined> {
  const [result] = await db()
    .select()
    .from(anonymousUser)
    .where(eq(anonymousUser.id, id));
  return result;
}

export async function findAnonymousUserByShadowId(
  shadowUserId: string
): Promise<AnonymousUser | undefined> {
  const [result] = await db()
    .select()
    .from(anonymousUser)
    .where(eq(anonymousUser.shadowUserId, shadowUserId));
  return result;
}

/**
 * Find an active (non-converted, non-expired) session for a given fingerprint + IP.
 */
export async function findActiveAnonymousSession(
  fingerprintHash: string | null,
  ipAddress: string
): Promise<AnonymousUser | undefined> {
  const now = new Date();

  if (fingerprintHash) {
    const [result] = await db()
      .select()
      .from(anonymousUser)
      .where(
        and(
          eq(anonymousUser.fingerprintHash, fingerprintHash),
          eq(anonymousUser.ipAddress, ipAddress),
          eq(anonymousUser.isConverted, false),
          gt(anonymousUser.expiresAt, now)
        )
      );
    if (result) return result;
  }

  // Fallback: IP-only match (for users without fingerprint)
  const [ipResult] = await db()
    .select()
    .from(anonymousUser)
    .where(
      and(
        eq(anonymousUser.ipAddress, ipAddress),
        eq(anonymousUser.isConverted, false),
        gt(anonymousUser.expiresAt, now)
      )
    )
    .limit(1);
  return ipResult;
}

export async function updateAnonymousUser(
  id: string,
  data: Partial<Omit<NewAnonymousUser, 'id' | 'createdAt'>>
): Promise<AnonymousUser> {
  const [result] = await db()
    .update(anonymousUser)
    .set(data)
    .where(eq(anonymousUser.id, id))
    .returning();
  return result;
}
