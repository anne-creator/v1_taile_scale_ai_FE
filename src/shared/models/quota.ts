import { and, asc, count, desc, eq, gt, isNull, or, sql, sum } from 'drizzle-orm';

import { db } from '@/core/db';
import { quota } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import { getAllConfigs } from './config';
import { getServiceCost } from './service-cost';
import { appendUserToResult, User } from './user';

export type Quota = typeof quota.$inferSelect & {
  user?: User;
};
export type NewQuota = typeof quota.$inferInsert;
export type UpdateQuota = Partial<
  Omit<NewQuota, 'id' | 'transactionNo' | 'createdAt'>
>;

// --- Enums ---

export enum QuotaPoolType {
  TRIAL = 'trial',
  SUBSCRIPTION = 'subscription',
  PAYGO = 'paygo',
}

export enum QuotaMeasurementType {
  DOLLAR = 'dollar',
  UNIT = 'unit',
}

export enum QuotaStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum QuotaTransactionType {
  GRANT = 'grant',
  CONSUME = 'consume',
}

export enum QuotaTransactionScene {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  RENEWAL = 'renewal',
  GIFT = 'gift',
  REWARD = 'reward',
  TRIAL = 'trial',
}

// --- Types ---

export interface GrantQuotaParams {
  userId: string;
  userEmail?: string;
  poolType: QuotaPoolType;
  measurementType: QuotaMeasurementType;
  amount: number;
  validDays?: number;
  currentPeriodEnd?: Date;
  orderNo?: string;
  subscriptionNo?: string;
  transactionScene?: QuotaTransactionScene;
  description?: string;
}

export interface ConsumeResult {
  quotaId: string;
  transactionNo: string;
  poolType: QuotaPoolType;
  measurementType: QuotaMeasurementType;
  costAmount: number;
  consumedDetail: any[];
}

export interface QuotaPoolOverview {
  poolType: QuotaPoolType;
  measurementType: QuotaMeasurementType;
  totalGranted: number;
  totalConsumed: number;
  remaining: number;
  earliestExpiry: Date | null;
}

export interface QuotaOverview {
  trial: QuotaPoolOverview | null;
  subscription: QuotaPoolOverview | null;
  paygo: QuotaPoolOverview | null;
}

// --- Expiration helpers ---

/**
 * Calculate quota expiration time based on order/subscription info
 */
export function calculateQuotaExpirationTime({
  validDays,
  currentPeriodEnd,
}: {
  validDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  // Never expires
  if (!validDays || validDays <= 0) {
    return null;
  }

  if (currentPeriodEnd) {
    // For subscription: expires at end of current period
    return new Date(currentPeriodEnd.getTime());
  }

  // For one-time payment: use configured validity days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validDays);
  return expiresAt;
}

/**
 * Helper: creates the SQL condition for non-expired quota
 */
function createExpirationCondition() {
  const currentTime = new Date();
  return or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime));
}

// --- CRUD ---

export async function createQuota(newQuota: NewQuota) {
  const [result] = await db().insert(quota).values(newQuota).returning();
  return result;
}

export async function getQuotas({
  userId,
  poolType,
  status,
  transactionType,
  getUser = false,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  poolType?: QuotaPoolType;
  status?: QuotaStatus;
  transactionType?: QuotaTransactionType;
  getUser?: boolean;
  page?: number;
  limit?: number;
}): Promise<Quota[]> {
  const result = await db()
    .select()
    .from(quota)
    .where(
      and(
        userId ? eq(quota.userId, userId) : undefined,
        poolType ? eq(quota.poolType, poolType) : undefined,
        status ? eq(quota.status, status) : undefined,
        transactionType ? eq(quota.transactionType, transactionType) : undefined
      )
    )
    .orderBy(desc(quota.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function getQuotasCount({
  userId,
  poolType,
  status,
  transactionType,
}: {
  userId?: string;
  poolType?: QuotaPoolType;
  status?: QuotaStatus;
  transactionType?: QuotaTransactionType;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(quota)
    .where(
      and(
        userId ? eq(quota.userId, userId) : undefined,
        poolType ? eq(quota.poolType, poolType) : undefined,
        status ? eq(quota.status, status) : undefined,
        transactionType ? eq(quota.transactionType, transactionType) : undefined
      )
    );

  return result?.count || 0;
}

// --- Grant ---

/**
 * Grant quota to a user (called on payment/subscription/gift)
 */
export async function grantQuota(params: GrantQuotaParams): Promise<Quota> {
  if (params.amount <= 0) {
    throw new Error('Grant amount must be positive');
  }

  const expiresAt = calculateQuotaExpirationTime({
    validDays: params.validDays || 0,
    currentPeriodEnd: params.currentPeriodEnd,
  });

  const newQuota: NewQuota = {
    id: getUuid(),
    userId: params.userId,
    userEmail: params.userEmail,
    poolType: params.poolType,
    measurementType: params.measurementType,
    orderNo: params.orderNo || '',
    subscriptionNo: params.subscriptionNo || '',
    transactionNo: getSnowId(),
    transactionType: QuotaTransactionType.GRANT,
    transactionScene: params.transactionScene,
    amount: String(params.amount),
    remainingAmount: String(params.amount),
    description: params.description || 'Grant quota',
    expiresAt: expiresAt,
    status: QuotaStatus.ACTIVE,
  };

  return createQuota(newQuota);
}

/**
 * Grant initial quota for a new user (called from auth hooks)
 */
export async function grantQuotaForNewUser(user: User) {
  const configs = await getAllConfigs();

  if (configs.initial_credits_enabled !== 'true') {
    return;
  }

  const amount = parseFloat(configs.initial_credits_amount as string) || 0;
  if (amount <= 0) {
    return;
  }

  const validDays =
    parseInt(configs.initial_credits_valid_days as string) || 0;
  const description = configs.initial_credits_description || 'Initial quota';

  // Default: grant as subscription unit-based (consumed first before paid quota)
  const poolType =
    (configs.initial_quota_pool_type as QuotaPoolType) ||
    QuotaPoolType.SUBSCRIPTION;
  const measurementType =
    (configs.initial_quota_measurement_type as QuotaMeasurementType) ||
    QuotaMeasurementType.UNIT;

  return grantQuota({
    userId: user.id,
    userEmail: user.email,
    poolType,
    measurementType,
    amount,
    validDays,
    transactionScene: QuotaTransactionScene.GIFT,
    description,
  });
}

/**
 * Grant quota to a user (admin action)
 */
export async function grantQuotaForUser({
  user,
  poolType,
  measurementType,
  amount,
  validDays,
  description,
}: {
  user: User;
  poolType: QuotaPoolType;
  measurementType: QuotaMeasurementType;
  amount: number;
  validDays?: number;
  description?: string;
}) {
  if (amount <= 0) {
    return;
  }

  return grantQuota({
    userId: user.id,
    userEmail: user.email,
    poolType,
    measurementType,
    amount,
    validDays: validDays && validDays > 0 ? validDays : 0,
    transactionScene: QuotaTransactionScene.GIFT,
    description: description || 'Admin grant quota',
  });
}

// --- Consume ---

/**
 * Check if a user can consume a service (quick check without consuming)
 */
export async function canConsumeService(
  userId: string,
  serviceType: string,
  scene: string
): Promise<boolean> {
  try {
    const cost = await getServiceCost(serviceType, scene);
    const currentTime = new Date();

    const poolOrder: QuotaPoolType[] = [
      QuotaPoolType.TRIAL,
      QuotaPoolType.SUBSCRIPTION,
      QuotaPoolType.PAYGO,
    ];

    for (const poolType of poolOrder) {
      const [balanceResult] = await db()
        .select({ total: sum(quota.remainingAmount) })
        .from(quota)
        .where(
          and(
            eq(quota.userId, userId),
            eq(quota.poolType, poolType),
            eq(quota.transactionType, QuotaTransactionType.GRANT),
            eq(quota.status, QuotaStatus.ACTIVE),
            gt(quota.remainingAmount, '0'),
            or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
          )
        );

      const [pool] = await db()
        .select()
        .from(quota)
        .where(
          and(
            eq(quota.userId, userId),
            eq(quota.poolType, poolType),
            eq(quota.transactionType, QuotaTransactionType.GRANT),
            eq(quota.status, QuotaStatus.ACTIVE),
            gt(quota.remainingAmount, '0'),
            or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
          )
        )
        .limit(1);

      if (pool && balanceResult?.total) {
        const balance = parseFloat(balanceResult.total);
        const requiredCost =
          pool.measurementType === QuotaMeasurementType.DOLLAR
            ? parseFloat(cost.dollarCost)
            : cost.unitCost;
        if (balance >= requiredCost) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Consume quota for a service usage.
 * Priority: subscription pools first (FIFO by expiry), then paygo pools.
 * A single consumption draws from ONE pool type only (no cross-pool splitting).
 */
export async function consumeQuota({
  userId,
  serviceType,
  scene,
  description,
  metadata,
  tx,
}: {
  userId: string;
  serviceType: string;
  scene: string;
  description?: string;
  metadata?: string;
  tx?: any;
}): Promise<ConsumeResult> {
  const cost = await getServiceCost(serviceType, scene);

  const execute = async (tx: any) => {
    const currentTime = new Date();

    const poolOrder: QuotaPoolType[] = [
      QuotaPoolType.TRIAL,
      QuotaPoolType.SUBSCRIPTION,
      QuotaPoolType.PAYGO,
    ];

    for (const poolType of poolOrder) {
      const result = await tryConsumeFromPool({
        tx,
        userId,
        poolType,
        cost,
        currentTime,
        serviceType,
        scene,
        description,
        metadata,
      });

      if (result) return result;
    }

    throw new Error('Insufficient quota');
  };

  if (tx) {
    return execute(tx);
  }

  return db().transaction(execute);
}

/**
 * Try to consume from a specific pool type.
 * Returns null if pool doesn't have enough balance.
 */
async function tryConsumeFromPool({
  tx,
  userId,
  poolType,
  cost,
  currentTime,
  serviceType,
  scene,
  description,
  metadata,
}: {
  tx: any;
  userId: string;
  poolType: QuotaPoolType;
  cost: { dollarCost: string; unitCost: number };
  currentTime: Date;
  serviceType: string;
  scene: string;
  description?: string;
  metadata?: string;
}): Promise<ConsumeResult | null> {
  // Get first available pool record to determine measurement type
  const availablePools = await tx
    .select()
    .from(quota)
    .where(
      and(
        eq(quota.userId, userId),
        eq(quota.poolType, poolType),
        eq(quota.transactionType, QuotaTransactionType.GRANT),
        eq(quota.status, QuotaStatus.ACTIVE),
        gt(quota.remainingAmount, '0'),
        or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
      )
    )
    .orderBy(asc(quota.expiresAt))
    .limit(1);

  if (!availablePools || availablePools.length === 0) {
    return null;
  }

  const measurementType = availablePools[0]
    .measurementType as QuotaMeasurementType;
  const requiredCost =
    measurementType === QuotaMeasurementType.DOLLAR
      ? parseFloat(cost.dollarCost)
      : cost.unitCost;

  if (requiredCost <= 0) {
    return null;
  }

  // Check total balance for this pool type
  const [balanceResult] = await tx
    .select({ total: sum(quota.remainingAmount) })
    .from(quota)
    .where(
      and(
        eq(quota.userId, userId),
        eq(quota.poolType, poolType),
        eq(quota.transactionType, QuotaTransactionType.GRANT),
        eq(quota.status, QuotaStatus.ACTIVE),
        gt(quota.remainingAmount, '0'),
        or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
      )
    );

  const totalBalance = parseFloat(balanceResult?.total || '0');
  if (totalBalance < requiredCost) {
    return null; // Not enough in this pool, try next
  }

  // FIFO consumption: get records ordered by expiry, with row lock
  let remainingToConsume = requiredCost;
  const batchSize = 1000;
  const maxBatches = 10;
  let batchNo = 1;
  const consumedItems: any[] = [];

  while (remainingToConsume > 0 && batchNo <= maxBatches) {
    const batchRecords = await tx
      .select()
      .from(quota)
      .where(
        and(
          eq(quota.userId, userId),
          eq(quota.poolType, poolType),
          eq(quota.transactionType, QuotaTransactionType.GRANT),
          eq(quota.status, QuotaStatus.ACTIVE),
          gt(quota.remainingAmount, '0'),
          or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
        )
      )
      .orderBy(asc(quota.expiresAt))
      .limit(batchSize)
      .offset((batchNo - 1) * batchSize)
      .for('update');

    if (!batchRecords || batchRecords.length === 0) break;

    for (const record of batchRecords) {
      if (remainingToConsume <= 0) break;

      const recordRemaining = parseFloat(record.remainingAmount);
      const toConsume = Math.min(remainingToConsume, recordRemaining);

      // Update remaining amount
      await tx
        .update(quota)
        .set({
          remainingAmount: String(
            Math.round((recordRemaining - toConsume) * 10000) / 10000
          ),
        })
        .where(eq(quota.id, record.id));

      consumedItems.push({
        quotaId: record.id,
        transactionNo: record.transactionNo,
        expiresAt: record.expiresAt,
        costToConsume: remainingToConsume,
        amountConsumed: toConsume,
        amountBefore: recordRemaining,
        amountAfter:
          Math.round((recordRemaining - toConsume) * 10000) / 10000,
        batchNo,
      });

      remainingToConsume =
        Math.round((remainingToConsume - toConsume) * 10000) / 10000;
    }

    batchNo++;
  }

  if (remainingToConsume > 0) {
    throw new Error(
      `Failed to fully consume quota: ${remainingToConsume} remaining`
    );
  }

  // Create consume record
  const consumeRecord: NewQuota = {
    id: getUuid(),
    transactionNo: getSnowId(),
    transactionType: QuotaTransactionType.CONSUME,
    transactionScene: serviceType,
    userId: userId,
    poolType: poolType,
    measurementType: measurementType,
    status: QuotaStatus.ACTIVE,
    description: description || `Consume for ${serviceType}/${scene}`,
    amount: String(-requiredCost),
    consumedDetail: JSON.stringify(consumedItems),
    metadata: metadata,
  };
  await tx.insert(quota).values(consumeRecord);

  return {
    quotaId: consumeRecord.id!,
    transactionNo: consumeRecord.transactionNo!,
    poolType,
    measurementType,
    costAmount: requiredCost,
    consumedDetail: consumedItems,
  };
}

/**
 * Refund quota for a failed task.
 * Restores the consumed amounts back to the original grant records.
 */
export async function refundQuota(quotaId: string, tx?: any) {
  const execute = async (tx: any) => {
    // Get the consume record
    const [consumeRecord] = await tx
      .select()
      .from(quota)
      .where(eq(quota.id, quotaId));

    if (!consumeRecord || consumeRecord.status !== QuotaStatus.ACTIVE) {
      return;
    }

    const consumedItems = JSON.parse(consumeRecord.consumedDetail || '[]');

    // Restore consumed amounts to original grant records
    await Promise.all(
      consumedItems.map((item: any) => {
        if (item && item.quotaId && item.amountConsumed > 0) {
          return tx
            .update(quota)
            .set({
              remainingAmount: sql`${quota.remainingAmount} + ${String(item.amountConsumed)}`,
            })
            .where(eq(quota.id, item.quotaId));
        }
      })
    );

    // Mark the consume record as deleted
    await tx
      .update(quota)
      .set({ status: QuotaStatus.DELETED })
      .where(eq(quota.id, quotaId));
  };

  if (tx) {
    return execute(tx);
  }

  return db().transaction(execute);
}

// --- Overview / Balance ---

/**
 * Get quota overview for a user (for Usage Panel)
 */
export async function getQuotaOverview(userId: string): Promise<QuotaOverview> {
  const currentTime = new Date();

  const getPoolOverview = async (
    poolType: QuotaPoolType
  ): Promise<QuotaPoolOverview | null> => {
    // Get total granted (remaining) for this pool type
    const [balanceResult] = await db()
      .select({
        total: sum(quota.remainingAmount),
      })
      .from(quota)
      .where(
        and(
          eq(quota.userId, userId),
          eq(quota.poolType, poolType),
          eq(quota.transactionType, QuotaTransactionType.GRANT),
          eq(quota.status, QuotaStatus.ACTIVE),
          gt(quota.remainingAmount, '0'),
          or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
        )
      );

    // Get total originally granted for this pool type
    const [totalGranted] = await db()
      .select({
        total: sum(quota.amount),
      })
      .from(quota)
      .where(
        and(
          eq(quota.userId, userId),
          eq(quota.poolType, poolType),
          eq(quota.transactionType, QuotaTransactionType.GRANT),
          eq(quota.status, QuotaStatus.ACTIVE),
          or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
        )
      );

    const remaining = parseFloat(balanceResult?.total || '0');
    const granted = parseFloat(totalGranted?.total || '0');

    if (granted <= 0) {
      return null;
    }

    // Get measurement type from most recent grant
    const [latestGrant] = await db()
      .select()
      .from(quota)
      .where(
        and(
          eq(quota.userId, userId),
          eq(quota.poolType, poolType),
          eq(quota.transactionType, QuotaTransactionType.GRANT),
          eq(quota.status, QuotaStatus.ACTIVE),
          or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
        )
      )
      .orderBy(desc(quota.createdAt))
      .limit(1);

    // Get earliest expiry
    const [earliestExpiry] = await db()
      .select({ expiresAt: quota.expiresAt })
      .from(quota)
      .where(
        and(
          eq(quota.userId, userId),
          eq(quota.poolType, poolType),
          eq(quota.transactionType, QuotaTransactionType.GRANT),
          eq(quota.status, QuotaStatus.ACTIVE),
          gt(quota.remainingAmount, '0'),
          gt(quota.expiresAt, currentTime) // Only non-null expiry dates
        )
      )
      .orderBy(asc(quota.expiresAt))
      .limit(1);

    return {
      poolType,
      measurementType: (latestGrant?.measurementType ||
        QuotaMeasurementType.UNIT) as QuotaMeasurementType,
      totalGranted: granted,
      totalConsumed: Math.round((granted - remaining) * 10000) / 10000,
      remaining,
      earliestExpiry: earliestExpiry?.expiresAt || null,
    };
  };

  const [trialOverview, subscriptionOverview, paygoOverview] =
    await Promise.all([
      getPoolOverview(QuotaPoolType.TRIAL),
      getPoolOverview(QuotaPoolType.SUBSCRIPTION),
      getPoolOverview(QuotaPoolType.PAYGO),
    ]);

  return {
    trial: trialOverview,
    subscription: subscriptionOverview,
    paygo: paygoOverview,
  };
}

/**
 * Get remaining quota amount for a specific pool type (simple helper)
 */
export async function getRemainingQuota(
  userId: string,
  poolType?: QuotaPoolType
): Promise<number> {
  const currentTime = new Date();

  const [result] = await db()
    .select({ total: sum(quota.remainingAmount) })
    .from(quota)
    .where(
      and(
        eq(quota.userId, userId),
        poolType ? eq(quota.poolType, poolType) : undefined,
        eq(quota.transactionType, QuotaTransactionType.GRANT),
        eq(quota.status, QuotaStatus.ACTIVE),
        gt(quota.remainingAmount, '0'),
        or(isNull(quota.expiresAt), gt(quota.expiresAt, currentTime))
      )
    );

  return parseFloat(result?.total || '0');
}
