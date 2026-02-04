'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Subscribe Hook - Email Subscription
 *
 * Following code_principle.md:
 * - Hook returns { actions, isLoading } interface
 * - Error handling via toast (no error state needed)
 * - Self-contained module with API call encapsulated
 */

// ============================================================================
// Types
// ============================================================================

export interface SubscribeActions {
  subscribe: (email: string, actionUrl: string) => Promise<boolean>;
}

export interface UseSubscribeReturn {
  actions: SubscribeActions;
  isLoading: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useSubscribe(): UseSubscribeReturn {
  const [isLoading, setIsLoading] = useState(false);

  const subscribe = useCallback(async (email: string, actionUrl: string): Promise<boolean> => {
    if (!email) {
      return false;
    }

    if (!actionUrl) {
      return false;
    }

    setIsLoading(true);

    try {
      const resp = await fetch(actionUrl, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (!resp.ok) {
        throw new Error(`request failed with status ${resp.status}`);
      }

      const { code, message } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      if (message) {
        toast.success(message);
      }

      return true;
    } catch (e: any) {
      toast.error(e.message || 'subscribe failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const actions: SubscribeActions = useMemo(
    () => ({
      subscribe,
    }),
    [subscribe]
  );

  return {
    actions,
    isLoading,
  };
}
