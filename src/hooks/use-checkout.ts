'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * Checkout Hook - Payment Processing
 *
 * Following code_principle.md:
 * - Hook returns { actions, isLoading, error } interface
 * - Self-contained module with all API calls encapsulated
 * - Can be reused across different components
 */

// ============================================================================
// Types
// ============================================================================

export interface CheckoutResult {
  checkoutUrl: string | null;
  shouldRedirectToBilling: boolean;
}

export interface CheckoutActions {
  checkout: (productId: string) => Promise<CheckoutResult>;
  clearError: () => void;
}

export interface UseCheckoutReturn {
  actions: CheckoutActions;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useCheckout(): UseCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async (productId: string): Promise<CheckoutResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
        }),
      });

      if (!resp.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { code, data, message } = await resp.json();

      if (code !== 0) {
        // If user already has subscription, redirect to billing page
        if (message?.includes('subscription') || message?.includes('active')) {
          return {
            checkoutUrl: null,
            shouldRedirectToBilling: true,
          };
        }
        throw new Error(message || 'Failed to create checkout');
      }

      if (!data?.checkoutUrl) {
        throw new Error('No checkout URL returned');
      }

      return {
        checkoutUrl: data.checkoutUrl,
        shouldRedirectToBilling: false,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start checkout. Please try again.';
      setError(errorMessage);
      return {
        checkoutUrl: null,
        shouldRedirectToBilling: false,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const actions: CheckoutActions = useMemo(
    () => ({
      checkout,
      clearError,
    }),
    [checkout, clearError]
  );

  return {
    actions,
    isLoading,
    error,
  };
}
