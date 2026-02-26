'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authClient, signIn, signOut, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { clearAnonymousSession } from '@/hooks/use-anonymous-session';
import { User } from '@/shared/models/user';

/**
 * Auth Context - Global Authentication Provider
 * 
 * Following code_principle.md: Provider uses { state, actions } interface
 */

// State interface
export interface AuthState {
  user: User | null;
  isCheckSign: boolean;
}

// Actions interface
export interface AuthActions {
  login: (
    email: string,
    password: string,
    callbackURL?: string
  ) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  showOneTap: (configs: Record<string, string>) => Promise<void>;
}

// Combined context type following { state, actions } pattern
export interface AuthContextValue {
  state: AuthState;
  actions: AuthActions;
}

// Legacy flat interface for backward compatibility
export interface AuthContextType extends AuthState, AuthActions {}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractSessionUser(data: any): User | null {
  const u = data?.user ?? data?.data?.user ?? null;
  return u && typeof u === 'object' ? (u as User) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  
  // Track if component has mounted (for hydration safety)
  // This prevents hydration mismatch by ensuring server and client initial render are identical
  const [hasMounted, setHasMounted] = useState(false);
  
  // Initialize as true to match server/client initial state and prevent hydration mismatch
  // This ensures loading state is shown until session check completes
  const [isCheckSign, setIsCheckSign] = useState(true);

  // Get session from Better Auth
  const { data: session, isPending } = useSession();
  const sessionUser = extractSessionUser(session);

  // In dev (React StrictMode) effects can run twice; ensure we don't spam getSession().
  const didFallbackSyncRef = useRef(false);

  // Guard: prevent sync effect from clearing user right after refreshUser() set it
  const lastManualRefreshRef = useRef(0);

  // Set mounted state after hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Update isCheckSign based on session loading state
  // Only set to false when: 1) component has mounted, and 2) session check is complete
  useEffect(() => {
    if (hasMounted && !isPending) {
      setIsCheckSign(false);
    }
  }, [hasMounted, isPending]);

  // Timeout fallback: if session check takes too long, stop showing loading
  // This prevents infinite loading if useSession() gets stuck
  useEffect(() => {
    if (!hasMounted) return;
    
    const timeout = setTimeout(() => {
      if (isCheckSign) {
        console.log('[AuthProvider] Session check timeout, stopping loading state');
        setIsCheckSign(false);
      }
    }, 3000); // 3 seconds timeout
    
    return () => clearTimeout(timeout);
  }, [hasMounted, isCheckSign]);

  // Sync session user to local state (only after mount to avoid hydration issues)
  // Uses userRef instead of user state to avoid re-triggering when refreshUser() sets user
  useEffect(() => {
    if (!hasMounted) return;

    const currentUserId = userRef.current?.id;
    const sessionUserId = (sessionUser as any)?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser as User);
      void fetchUserInfo();
    } else if (!sessionUser && currentUserId) {
      if (Date.now() - lastManualRefreshRef.current < 5000) return;
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, sessionUser?.id, (sessionUser as any)?.email]);

  // Fallback: if the session cookie is present but useSession lags, do a single refresh.
  useEffect(() => {
    if (!hasMounted) return;
    if (didFallbackSyncRef.current) return;
    // Only run when useSession is done but still no user.
    if (isPending) return;
    if (sessionUser || user) return;

    didFallbackSyncRef.current = true;
    void (async () => {
      try {
        const res: any = await authClient.getSession();
        const fresh = extractSessionUser(res?.data ?? res);
        if (fresh?.id) {
          setUser(fresh);
          await fetchUserInfo();
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, isPending, sessionUser, user?.id]);

  // Keep userRef in sync
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Capture anonymous session data on mount before any child effect clears localStorage
  const anonSessionRef = useRef<{ anonymousUserId: string } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('talecraft_anonymous_session');
      if (raw) anonSessionRef.current = JSON.parse(raw);
    } catch {}
  }, []);

  // Convert anonymous session when user authenticates (signup or login)
  const prevUserRef = useRef<User | null>(null);
  useEffect(() => {
    const wasNull = prevUserRef.current === null;
    prevUserRef.current = user;
    if (!wasNull || !user?.id) return;

    const anonData = anonSessionRef.current;
    if (!anonData?.anonymousUserId) return;
    anonSessionRef.current = null;

    fetch('/api/anonymous/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousUserId: anonData.anonymousUserId }),
    })
      .catch(() => {})
      .finally(() => {
        clearAnonymousSession();
      });
  }, [user]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const resp = await fetch('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user info failed:', e);
      }
    }
  }, []);

  const fetchUserQuota = useCallback(async () => {
    try {
      if (!userRef.current) {
        return;
      }

      const resp = await fetch('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      if (data?.quota) {
        setUser((prev) => (prev ? { ...prev, quota: data.quota } : prev));
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user quota failed:', e);
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    didFallbackSyncRef.current = false;

    try {
      const res: any = await authClient.getSession();
      const fresh = extractSessionUser(res?.data ?? res);
      if (fresh?.id) {
        setUser(fresh);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('get session failed:', e);
      }
    }

    await fetchUserInfo();

    // Prevent the sync effect from clearing user while useSession() catches up
    lastManualRefreshRef.current = Date.now();
  }, [fetchUserInfo]);

  const login = useCallback(
    async (email: string, password: string, callbackURL?: string) => {
      await signIn.email(
        {
          email,
          password,
          callbackURL: callbackURL || '/',
        },
        {
          onSuccess: async () => {
            router.refresh();
            didFallbackSyncRef.current = false;
            await refreshUser();
          },
        }
      );
    },
    [router, refreshUser]
  );

  const logout = useCallback(
    async (redirectTo?: string) => {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            setUser(null);
            if (redirectTo) {
              router.push(redirectTo);
            }
          },
        },
      });
    },
    [router]
  );

  const showOneTap = useCallback(
    async (configs: Record<string, string>) => {
      try {
        const { getAuthClient } = await import('@/core/auth/client');
        const authClientWithPlugins = getAuthClient(configs);
        await authClientWithPlugins.oneTap({
          callbackURL: '/',
          onPromptNotification: (notification: any) => {
            // Handle prompt dismissal silently
            if (process.env.NODE_ENV !== 'production') {
              console.log('One Tap prompt notification:', notification);
            }
          },
        });
      } catch (error) {
        // Silently handle One Tap cancellation errors
      }
    },
    []
  );

  const state: AuthState = useMemo(
    () => ({
      user,
      isCheckSign,
    }),
    [user, isCheckSign]
  );

  const actions: AuthActions = useMemo(
    () => ({
      login,
      logout,
      refreshUser,
      showOneTap,
    }),
    [login, logout, refreshUser, showOneTap]
  );

  const value: AuthContextValue = useMemo(
    () => ({ state, actions }),
    [state, actions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access Auth context
 * 
 * Recommended usage (following code_principle.md):
 * ```tsx
 * const { state, actions } = useAuth();
 * // state.user, actions.login()
 * ```
 * 
 * Legacy usage (still supported for backward compatibility):
 * ```tsx
 * const { user, login } = useAuth();
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Return flattened interface for backward compatibility
  return {
    ...context.state,
    ...context.actions,
  };
}

/**
 * Hook to access Auth context with { state, actions } interface
 * Preferred usage following code_principle.md
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
