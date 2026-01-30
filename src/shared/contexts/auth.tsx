'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { authClient, signIn, signOut, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { User } from '@/shared/models/user';

export interface AuthContextType {
  user: User | null;
  isCheckSign: boolean;
  login: (
    email: string,
    password: string,
    callbackURL?: string
  ) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  showOneTap: (configs: Record<string, string>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractSessionUser(data: any): User | null {
  const u = data?.user ?? data?.data?.user ?? null;
  return u && typeof u === 'object' ? (u as User) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [isCheckSign, setIsCheckSign] = useState(false);

  // Get session from Better Auth
  const { data: session, isPending } = useSession();
  const sessionUser = extractSessionUser(session);

  // In dev (React StrictMode) effects can run twice; ensure we don't spam getSession().
  const didFallbackSyncRef = useRef(false);

  // Update isCheckSign based on session loading state
  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  // Sync session user to local state
  useEffect(() => {
    const currentUserId = user?.id;
    const sessionUserId = (sessionUser as any)?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser as User);
      void fetchUserInfo();
    } else if (!sessionUser && currentUserId) {
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id, (sessionUser as any)?.email, user?.id]);

  // Fallback: if the session cookie is present but useSession lags, do a single refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
  }, [isPending, sessionUser, user?.id]);

  // Keep userRef in sync
  useEffect(() => {
    userRef.current = user;
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

  const fetchUserCredits = useCallback(async () => {
    try {
      if (!userRef.current) {
        return;
      }

      const resp = await fetch('/api/user/get-user-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser((prev) => (prev ? { ...prev, credits: data } : prev));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user credits failed:', e);
      }
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string, callbackURL?: string) => {
      await signIn.email(
        {
          email,
          password,
          callbackURL: callbackURL || '/',
        },
        {
          onSuccess: () => {
            router.refresh();
            // Reset fallback sync to allow re-check
            didFallbackSyncRef.current = false;
          },
        }
      );
    },
    [router]
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

  const refreshUser = useCallback(async () => {
    // Reset fallback sync to allow immediate re-check
    didFallbackSyncRef.current = false;
    
    // Try to get fresh session from Better Auth
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
    
    // Fetch extended user info and credits
    await fetchUserInfo();
    await fetchUserCredits();
  }, [fetchUserInfo, fetchUserCredits]);

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

  const value = {
    user,
    isCheckSign,
    login,
    logout,
    refreshUser,
    showOneTap,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
