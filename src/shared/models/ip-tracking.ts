import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { ipTracking } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type IpTracking = typeof ipTracking.$inferSelect;

export async function findIpTracking(
  ipAddress: string
): Promise<IpTracking | undefined> {
  const [result] = await db()
    .select()
    .from(ipTracking)
    .where(eq(ipTracking.ipAddress, ipAddress));
  return result;
}

export async function upsertIpTracking(
  ipAddress: string
): Promise<IpTracking> {
  const existing = await findIpTracking(ipAddress);

  if (existing) {
    const [updated] = await db()
      .update(ipTracking)
      .set({
        anonymousAccountCount: existing.anonymousAccountCount + 1,
        lastAccountCreatedAt: new Date(),
        lastSeenAt: new Date(),
      })
      .where(eq(ipTracking.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db()
    .insert(ipTracking)
    .values({ id: getUuid(), ipAddress })
    .returning();
  return created;
}

export async function touchIpTracking(ipAddress: string): Promise<void> {
  await db()
    .update(ipTracking)
    .set({ lastSeenAt: new Date() })
    .where(eq(ipTracking.ipAddress, ipAddress));
}

export function checkIpLimit(
  ip: IpTracking,
  maxAccounts?: number
): boolean {
  const limit = maxAccounts ?? ip.maxAnonymousAccounts;
  return ip.anonymousAccountCount < limit;
}

export function checkIpCooldown(
  ip: IpTracking
): { passed: boolean; remainingMs: number } {
  const cooldownMs = ip.cooldownHours * 60 * 60 * 1000;
  const elapsed = Date.now() - ip.lastAccountCreatedAt.getTime();
  if (elapsed >= cooldownMs) {
    return { passed: true, remainingMs: 0 };
  }
  return { passed: false, remainingMs: cooldownMs - elapsed };
}
