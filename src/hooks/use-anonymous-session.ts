'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';

const STORAGE_KEY = 'talecraft_anonymous_session';
const FP_TIMEOUT_MS = 2000;

interface AnonymousSession {
  anonymousUserId: string;
  apiKey: string;
  remainingGenerations: number;
}

function loadSession(): AnonymousSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AnonymousSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAnonymousSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('talecraft_api_key');
}

async function getFingerprint(): Promise<string | null> {
  try {
    const fpPromise = import('@fingerprintjs/fingerprintjs').then((mod) =>
      mod.default.load()
    );
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), FP_TIMEOUT_MS)
    );
    const agent = await Promise.race([fpPromise, timeoutPromise]);
    if (!agent) return null;
    const result = await agent.get();
    return result.visitorId;
  } catch {
    return null;
  }
}

export function useAnonymousSession() {
  const { user } = useAuth();
  const [session, setSession] = useState<AnonymousSession | null>(loadSession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Clear session when user authenticates
  useEffect(() => {
    if (user && session) {
      clearAnonymousSession();
      setSession(null);
    }
  }, [user, session]);

  const createSession = useCallback(async (): Promise<AnonymousSession | null> => {
    if (user) return null;

    const existing = loadSession();
    if (existing) {
      setSession(existing);
      return existing;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fingerprintHash = await getFingerprint();

      const resp = await fetch('/api/anonymous/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint_hash: fingerprintHash,
        }),
      });

      const { code, message, data } = await resp.json();

      if (code !== 0) {
        setError(message || 'Failed to create session');
        return null;
      }

      const newSession: AnonymousSession = {
        anonymousUserId: data.anonymousUserId,
        apiKey: data.apiKey,
        remainingGenerations: data.remainingGenerations,
      };

      saveSession(newSession);
      // Also store in the legacy key storage for hero compatibility
      localStorage.setItem('talecraft_api_key', data.apiKey);
      setSession(newSession);
      return newSession;
    } catch (e: any) {
      setError(e.message || 'Failed to create anonymous session');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateRemainingGenerations = useCallback(
    (remaining: number) => {
      if (!session) return;
      const updated = { ...session, remainingGenerations: remaining };
      saveSession(updated);
      setSession(updated);
    },
    [session]
  );

  // Auto-init on mount for unauthenticated users (lazy: only loads fingerprint, doesn't auto-create session)
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (!user) {
      const existing = loadSession();
      if (existing) {
        setSession(existing);
      }
    }
  }, [user]);

  return {
    session,
    isAnonymous: !user && !!session,
    anonymousApiKey: session?.apiKey ?? null,
    remainingGenerations: session?.remainingGenerations ?? 0,
    isLoading,
    error,
    createSession,
    updateRemainingGenerations,
    clearSession: () => {
      clearAnonymousSession();
      setSession(null);
    },
  };
}
