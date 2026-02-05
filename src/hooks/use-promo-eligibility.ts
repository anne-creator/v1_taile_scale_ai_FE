'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/providers/auth-provider';

/**
 * Hook to check if current user is eligible for promotion codes
 * and whether they have an active subscription.
 * Used to conditionally show/hide discount information and
 * toggle Subscribe/Manage Subscription button in pricing UI.
 */
export function usePromoEligibility() {
  const { user } = useAuth();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionNo, setSubscriptionNo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkEligibility = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch('/api/payment/check-promo-eligibility');
        const data = await resp.json();

        if (data.data) {
          setIsEligible(data.data.eligible);
          setHasActiveSubscription(!!data.data.hasActiveSubscription);
          setSubscriptionNo(data.data.subscriptionNo || null);
        } else {
          // Default to showing promo on error
          setIsEligible(true);
          setHasActiveSubscription(false);
          setSubscriptionNo(null);
        }
      } catch (e) {
        console.log('Failed to check promo eligibility:', e);
        // Default to showing promo on error
        setIsEligible(true);
        setHasActiveSubscription(false);
        setSubscriptionNo(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkEligibility();
  }, [user]); // Re-check when user changes (login/logout)

  return {
    isEligible,
    hasActiveSubscription,
    subscriptionNo,
    isLoading,
  };
}
