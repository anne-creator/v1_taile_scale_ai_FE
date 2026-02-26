import { betterAuth, BetterAuthOptions } from 'better-auth';

import { getAllConfigs } from '@/shared/models/config';

import { getAuthOptions } from './config';

let cachedAuth: ReturnType<typeof betterAuth> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

export async function getAuth() {
  const now = Date.now();
  if (cachedAuth && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedAuth;
  }

  const configs = await getAllConfigs();
  const authOptions = await getAuthOptions(configs);
  cachedAuth = betterAuth(authOptions as BetterAuthOptions);
  cacheTimestamp = now;

  return cachedAuth;
}
