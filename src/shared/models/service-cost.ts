import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { serviceCost } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type ServiceCost = typeof serviceCost.$inferSelect;
export type NewServiceCost = typeof serviceCost.$inferInsert;
export type UpdateServiceCost = Partial<
  Omit<NewServiceCost, 'id' | 'createdAt'>
>;

// In-memory cache for service costs (refreshed on demand)
let serviceCostCache: ServiceCost[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active service costs (with caching)
 */
export async function getAllServiceCosts(): Promise<ServiceCost[]> {
  const now = Date.now();
  if (serviceCostCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return serviceCostCache;
  }

  const result = await db()
    .select()
    .from(serviceCost)
    .where(eq(serviceCost.isActive, true));

  serviceCostCache = result;
  cacheTimestamp = now;

  return result;
}

/**
 * Invalidate the service cost cache (call after admin updates)
 */
export function invalidateServiceCostCache() {
  serviceCostCache = null;
  cacheTimestamp = 0;
}

/**
 * Get cost for a specific service + scene
 * Returns { dollarCost, unitCost } or throws if not found
 */
export async function getServiceCost(
  serviceType: string,
  scene: string
): Promise<ServiceCost> {
  const allCosts = await getAllServiceCosts();

  // Try exact match first
  let cost = allCosts.find(
    (c) => c.serviceType === serviceType && c.scene === scene
  );

  // Fallback: try with empty scene (default cost for service type)
  if (!cost && scene) {
    cost = allCosts.find(
      (c) => c.serviceType === serviceType && c.scene === ''
    );
  }

  if (!cost) {
    throw new Error(
      `Service cost not configured for serviceType=${serviceType}, scene=${scene}`
    );
  }

  return cost;
}

/**
 * Get all service costs (including inactive, for admin)
 */
export async function getServiceCostsForAdmin(): Promise<ServiceCost[]> {
  return db().select().from(serviceCost);
}

/**
 * Create a new service cost entry
 */
export async function createServiceCost(newCost: NewServiceCost) {
  const [result] = await db()
    .insert(serviceCost)
    .values(newCost)
    .returning();

  invalidateServiceCostCache();
  return result;
}

/**
 * Update a service cost entry by id
 */
export async function updateServiceCostById(
  id: string,
  update: UpdateServiceCost
) {
  const [result] = await db()
    .update(serviceCost)
    .set(update)
    .where(eq(serviceCost.id, id))
    .returning();

  invalidateServiceCostCache();
  return result;
}

/**
 * Upsert a service cost by (serviceType, scene)
 */
export async function upsertServiceCost(params: {
  serviceType: string;
  scene: string;
  dollarCost: string;
  unitCost: number;
  displayName?: string;
  description?: string;
}) {
  // Check if exists
  const [existing] = await db()
    .select()
    .from(serviceCost)
    .where(
      and(
        eq(serviceCost.serviceType, params.serviceType),
        eq(serviceCost.scene, params.scene)
      )
    );

  if (existing) {
    return updateServiceCostById(existing.id, {
      dollarCost: params.dollarCost,
      unitCost: params.unitCost,
      displayName: params.displayName,
      description: params.description,
    });
  }

  return createServiceCost({
    id: getUuid(),
    serviceType: params.serviceType,
    scene: params.scene,
    dollarCost: params.dollarCost,
    unitCost: params.unitCost,
    displayName: params.displayName,
    description: params.description,
    isActive: true,
  });
}
