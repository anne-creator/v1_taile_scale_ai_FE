import { eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, anonymousUser, apikey, quota, user } from '@/config/db/schema';
import { getNonceStr, getUuid } from '@/shared/lib/hash';
import {
  createAnonymousUser,
  findActiveAnonymousSession,
  findAnonymousUserById,
  updateAnonymousUser,
} from '@/shared/models/anonymous-user';
import { ApikeyStatus, createApikey } from '@/shared/models/apikey';
import {
  findDeviceFingerprint,
  upsertDeviceFingerprint,
  checkDeviceLimit,
  checkDeviceCooldown,
} from '@/shared/models/device-fingerprint';
import {
  findIpTracking,
  upsertIpTracking,
  checkIpLimit,
  checkIpCooldown,
} from '@/shared/models/ip-tracking';
import {
  grantQuota,
  getRemainingQuota,
  QuotaPoolType,
  QuotaMeasurementType,
  QuotaTransactionScene,
  QuotaStatus,
} from '@/shared/models/quota';
import { getAllConfigs } from '@/shared/models/config';

export interface AnonymousSessionResult {
  anonymousUserId: string;
  apiKey: string;
  remainingGenerations: number;
}

export interface AnonymousSessionError {
  error: string;
  cooldownRemainingMs?: number;
}

function isError(
  result: AnonymousSessionResult | AnonymousSessionError
): result is AnonymousSessionError {
  return 'error' in result;
}

export { isError };

export async function createAnonymousSession({
  fingerprintHash,
  ipAddress,
  userAgent,
  components,
}: {
  fingerprintHash: string | null;
  ipAddress: string;
  userAgent: string;
  components?: unknown;
}): Promise<AnonymousSessionResult | AnonymousSessionError> {
  const configs = await getAllConfigs();

  if (configs.anonymous_trial_enabled === 'false') {
    return { error: 'Anonymous trial is currently disabled.' };
  }

  const trialAmount = parseFloat(configs.anonymous_trial_amount as string) || 3;
  const cooldownHours =
    parseInt(configs.anonymous_cooldown_hours as string) || 48;
  const ipMaxAccounts =
    parseInt(configs.anonymous_ip_max_accounts as string) || 5;
  const deviceMaxAccounts =
    parseInt(configs.anonymous_device_max_accounts as string) || 3;

  // If fingerprinting failed, use stricter IP-only limits
  const ipOnlyMode = !fingerprintHash;
  const effectiveIpMax = ipOnlyMode ? 1 : ipMaxAccounts;

  // Step 1: Reuse existing active session
  const existing = await findActiveAnonymousSession(fingerprintHash, ipAddress);
  if (existing && existing.tempApiKeyId) {
    const [existingKey] = await db()
      .select()
      .from(apikey)
      .where(eq(apikey.id, existing.tempApiKeyId));

    if (existingKey && existingKey.status === ApikeyStatus.ACTIVE) {
      const remaining = await getRemainingQuota(
        existing.shadowUserId,
        QuotaPoolType.TRIAL
      );
      return {
        anonymousUserId: existing.id,
        apiKey: existingKey.key,
        remainingGenerations: remaining,
      };
    }
  }

  // Step 2: Device checks (skip if no fingerprint)
  if (fingerprintHash) {
    const device = await findDeviceFingerprint(fingerprintHash);
    if (device) {
      if (!checkDeviceLimit({ ...device, maxAnonymousAccounts: deviceMaxAccounts })) {
        return { error: 'Device limit reached. Please sign up to continue.' };
      }
      const deviceCooldown = checkDeviceCooldown(device, cooldownHours);
      if (!deviceCooldown.passed) {
        return {
          error: 'Please wait or sign up to continue.',
          cooldownRemainingMs: deviceCooldown.remainingMs,
        };
      }
    }
  }

  // Step 3: IP checks
  const ipRecord = await findIpTracking(ipAddress);
  if (ipRecord) {
    if (!checkIpLimit(ipRecord, effectiveIpMax)) {
      return {
        error: 'Too many sessions from this network. Please sign up.',
      };
    }
    const ipCooldown = checkIpCooldown(ipRecord);
    if (!ipCooldown.passed) {
      return {
        error: 'Please wait or sign up to continue.',
        cooldownRemainingMs: ipCooldown.remainingMs,
      };
    }
  }

  // Step 4: Update tracking records
  if (fingerprintHash) {
    await upsertDeviceFingerprint(fingerprintHash, components);
  }
  await upsertIpTracking(ipAddress);

  // Step 5: Create shadow user
  const shadowUserId = getUuid();
  await db()
    .insert(user)
    .values({
      id: shadowUserId,
      name: 'Anonymous',
      email: `anon-${shadowUserId}@anonymous.local`,
      emailVerified: false,
    });

  // Step 6: Create anonymous_user record
  const anonUser = await createAnonymousUser({
    fingerprintHash,
    ipAddress,
    shadowUserId,
    userAgent,
  });

  // Step 7: Create temporary API key
  const tempKey = `sk-${getNonceStr(32)}`;
  const newApikey = await createApikey({
    id: getUuid(),
    userId: shadowUserId,
    key: tempKey,
    title: 'Anonymous Trial',
    status: ApikeyStatus.ACTIVE,
    isTemporary: true,
    anonymousUserId: anonUser.id,
  });

  // Step 8: Grant trial quota
  const trialQuota = await grantQuota({
    userId: shadowUserId,
    poolType: QuotaPoolType.TRIAL,
    measurementType: QuotaMeasurementType.UNIT,
    amount: trialAmount,
    transactionScene: QuotaTransactionScene.TRIAL,
    description: 'Anonymous trial quota',
  });

  // Step 9: Update anonymous_user with references
  await updateAnonymousUser(anonUser.id, {
    tempApiKeyId: newApikey.id,
    trialQuotaId: trialQuota.id,
  });

  return {
    anonymousUserId: anonUser.id,
    apiKey: tempKey,
    remainingGenerations: trialAmount,
  };
}

/**
 * Convert an anonymous user session to a registered user.
 * Transfers ai_task history, expires trial quota, revokes temp API key.
 * Works for both new signups and logins to existing accounts.
 */
export async function convertAnonymousUser(
  anonymousUserId: string,
  newUserId: string
): Promise<void> {
  await db().transaction(async (tx: any) => {
    // Lock the anonymous_user row to prevent race conditions
    const [anonUser] = await tx
      .select()
      .from(anonymousUser)
      .where(eq(anonymousUser.id, anonymousUserId))
      .for('update');

    if (!anonUser || anonUser.isConverted) {
      return;
    }

    const shadowUserId = anonUser.shadowUserId;

    // Expire all trial quota for the shadow user
    await tx
      .update(quota)
      .set({
        status: QuotaStatus.EXPIRED,
        remainingAmount: '0',
      })
      .where(
        sql`${quota.userId} = ${shadowUserId} AND ${quota.poolType} = 'trial' AND ${quota.status} = 'active'`
      );

    // Soft-delete temp API key
    if (anonUser.tempApiKeyId) {
      await tx
        .update(apikey)
        .set({ status: ApikeyStatus.DELETED, deletedAt: new Date() })
        .where(eq(apikey.id, anonUser.tempApiKeyId));
    }

    // Transfer ai_task records to the new user
    await tx
      .update(aiTask)
      .set({ userId: newUserId })
      .where(eq(aiTask.userId, shadowUserId));

    // Mark anonymous_user as converted
    await tx
      .update(anonymousUser)
      .set({
        isConverted: true,
        convertedToUserId: newUserId,
      })
      .where(eq(anonymousUser.id, anonymousUserId));
  });
}
