import { headers } from 'next/headers';

import { respData, respErr } from '@/shared/lib/resp';
import {
  createAnonymousSession,
  isError,
} from '@/shared/services/anonymous';

// Simple in-memory rate limiter: max requests per IP per window
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const ipRequestLog = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestLog.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRequestLog.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequestLog.entries()) {
    if (now > entry.resetAt) {
      ipRequestLog.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2);

function getIpFromHeaders(h: Headers): string {
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '127.0.0.1').split(',')[0]
  );
}

export async function POST(request: Request) {
  try {
    const h = await headers();
    const ip = getIpFromHeaders(h);

    if (!checkRateLimit(ip)) {
      return respErr('Too many requests. Please try again later.');
    }

    const body = await request.json();
    const { fingerprint_hash, components } = body;
    const userAgent = h.get('user-agent') || '';

    const result = await createAnonymousSession({
      fingerprintHash: fingerprint_hash || null,
      ipAddress: ip,
      userAgent,
      components,
    });

    if (isError(result)) {
      return Response.json(
        {
          code: -1,
          message: result.error,
          data: {
            cooldownRemainingMs: result.cooldownRemainingMs ?? null,
          },
        }
      );
    }

    return respData({
      anonymousUserId: result.anonymousUserId,
      apiKey: result.apiKey,
      remainingGenerations: result.remainingGenerations,
    });
  } catch (e: any) {
    console.error('anonymous/session failed', e);
    return respErr(e.message || 'Failed to create anonymous session');
  }
}
