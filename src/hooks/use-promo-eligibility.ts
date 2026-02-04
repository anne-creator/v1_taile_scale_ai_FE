'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/providers/auth-provider';

interface PromoEligibility {
  eligible: boolean;
  reason: string;
}

/**
 * Hook to check if current user is eligible for promotion codes
 * Used to conditionally show/hide discount information in pricing UI
 */
export function usePromoEligibility() {
  const { user } = useAuth();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkEligibility = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch('/api/payment/check-promo-eligibility');
        const data = await resp.json();

        if (data.data) {
          setIsEligible(data.data.eligible);
        } else {
          // Default to showing promo on error
          setIsEligible(true);
        }
      } catch (e) {
        console.log('Failed to check promo eligibility:', e);
        // Default to showing promo on error
        setIsEligible(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkEligibility();
  }, [user]); // Re-check when user changes (login/logout)

  return {
    isEligible,
    isLoading,
  };
}
