import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { deviceFingerprint } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type DeviceFingerprint = typeof deviceFingerprint.$inferSelect;

export async function findDeviceFingerprint(
  fingerprintHash: string
): Promise<DeviceFingerprint | undefined> {
  const [result] = await db()
    .select()
    .from(deviceFingerprint)
    .where(eq(deviceFingerprint.fingerprintHash, fingerprintHash));
  return result;
}

export async function upsertDeviceFingerprint(
  fingerprintHash: string,
  components?: unknown
): Promise<DeviceFingerprint> {
  const existing = await findDeviceFingerprint(fingerprintHash);

  if (existing) {
    const [updated] = await db()
      .update(deviceFingerprint)
      .set({
        anonymousAccountCount: existing.anonymousAccountCount + 1,
        lastAccountCreatedAt: new Date(),
        lastSeenAt: new Date(),
        components: components ?? existing.components,
      })
      .where(eq(deviceFingerprint.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db()
    .insert(deviceFingerprint)
    .values({
      id: getUuid(),
      fingerprintHash,
      components: components ?? null,
    })
    .returning();
  return created;
}

export async function touchDeviceFingerprint(
  fingerprintHash: string
): Promise<void> {
  await db()
    .update(deviceFingerprint)
    .set({ lastSeenAt: new Date() })
    .where(eq(deviceFingerprint.fingerprintHash, fingerprintHash));
}

export function checkDeviceLimit(device: DeviceFingerprint): boolean {
  return device.anonymousAccountCount < device.maxAnonymousAccounts;
}

export function checkDeviceCooldown(
  device: DeviceFingerprint,
  cooldownHours = 48
): { passed: boolean; remainingMs: number } {
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const elapsed = Date.now() - device.lastAccountCreatedAt.getTime();
  if (elapsed >= cooldownMs) {
    return { passed: true, remainingMs: 0 };
  }
  return { passed: false, remainingMs: cooldownMs - elapsed };
}
