'use client';

import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/use-checkout';
import { usePromoEligibility } from '@/hooks/use-promo-eligibility';
import { useAuth } from '@/providers/auth-provider';
import { useUI } from '@/providers/ui-provider';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

/**
 * Pricing Block (Level 4)
 *
 * Following code_principle.md:
 * - Block only CONSUME context (call actions), not MANAGE state (define useState)
 * - All checkout logic is managed by useCheckout hook
 * - This component is purely for UI rendering
 */

export function Pricing({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const { user } = useAuth();
  const { setIsShowSignModal } = useUI();
  const { actions, isLoading, error } = useCheckout();
  const {
    isEligible: isPromoEligible,
    hasActiveSubscription,
    subscriptionNo,
    isLoading: isPromoLoading,
  } = usePromoEligibility();

  // Show promo pricing if: not logged in, or loading, or eligible
  // Hide promo pricing only when: logged in AND not eligible, OR already subscribed
  const showPromo =
    !hasActiveSubscription &&
    (!user || isPromoLoading || isPromoEligible !== false);

  const handleSubscribe = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // If already subscribed, go to Stripe management portal
    if (hasActiveSubscription && subscriptionNo) {
      window.location.href = `/settings/billing/retrieve?subscription_no=${subscriptionNo}`;
      return;
    }

    const result = await actions.checkout('pro-monthly');

    if (result.shouldRedirectToBilling) {
      window.location.href = '/settings/billing';
      return;
    }

    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  };

  const features = [
    { text: '1000 image generations/month', bold: true },
    { text: 'All style models & parameters', bold: false },
    { text: '99.9% uptime SLA', bold: false },
    { text: '$0.05 per additional image', bold: false },
    { text: 'Priority API access', bold: false },
    { text: 'Dedicated support channel', bold: false },
  ];

  return (
    <section
      id={section.id || 'pricing'}
      className={cn('py-section-sm bg-muted/50', section.className, className)}
    >
      <div className="container max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-h2 mb-4">
            {section.title || 'Simple Affordable Pricing'}
          </h2>
          <p className="text-lg text-muted-foreground">
            {showPromo
              ? section.description || 'Limited time offer for new subscribers'
              : 'Professional plan for unlimited creativity'}
          </p>
        </div>

        <div className="bg-background rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="p-8 md:p-12">
            {error && (
              <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Left: Price */}
              <div className="text-center md:text-left">
                {/* Discount Badge - only show for promo eligible users */}
                {showPromo && (
                  <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-primary rounded-full">
                    <span className="text-sm font-bold text-primary-foreground">
                      70% OFF
                    </span>
                    <span className="text-xs text-primary-foreground/70">
                      1st month
                    </span>
                  </div>
                )}

                {/* Price Display */}
                <div className="flex items-baseline justify-center md:justify-start gap-2">
                  {showPromo ? (
                    <>
                      <span className="text-5xl md:text-6xl font-bold">
                        $11.7
                      </span>
                      <span className="text-muted-foreground line-through">
                        $39
                      </span>
                    </>
                  ) : (
                    <span className="text-5xl md:text-6xl font-bold">$39</span>
                  )}
                  <span className="text-muted-foreground">/month</span>
                </div>

                {/* Renewal Note - only show for promo eligible users */}
                {showPromo && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Then $39/mo
                  </p>
                )}
              </div>

              {/* Middle: Features */}
              <div className="md:col-span-1">
                <h3 className="mb-4 font-semibold text-center md:text-left">Includes:</h3>
                <div className="space-y-3">
                  {features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <span className={cn('text-sm', feature.bold && 'font-bold')}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: More Features & CTA */}
              <div className="md:col-span-1">
                <div className="space-y-3 mb-6">
                  {features.slice(3).map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </div>
                  ))}
                </div>
                <Button
                  size="lg"
                  variant="default"
                  className="w-full"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : hasActiveSubscription ? (
                    'Manage Subscription'
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
