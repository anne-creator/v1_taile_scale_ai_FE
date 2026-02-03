'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/shared/contexts/auth';
import { useUI } from '@/shared/contexts/ui';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function Pricing({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const { user } = useAuth();
  const { setIsShowSignModal, setIsShowPaymentModal } = useUI();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Stripe checkout URL
      const resp = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_default', // You can make this configurable
        }),
      });

      if (!resp.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { code, data, message } = await resp.json();
      
      if (code !== 0) {
        // If user already has subscription, show billing page
        if (message?.includes('subscription') || message?.includes('active')) {
          window.location.href = '/settings/billing';
          return;
        }
        throw new Error(message || 'Failed to create checkout');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
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
      className={cn('py-12 bg-muted/50', section.className, className)}
    >
      <div className="container max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-1">
            {section.title || 'Simple Affordable Pricing'}
          </h2>
          <p className="text-lg text-muted-foreground">
            {section.description || '70% off for 1st month, then $39/month'}
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
                <div className="mb-2">
                  <div className="flex items-baseline justify-center md:justify-start gap-2">
                    <span className="text-5xl md:text-6xl font-bold">$11.7</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="mt-2 inline-block px-3 py-1 bg-muted rounded">
                    <span className="text-sm text-foreground">$39/month after 1st month</span>
                  </div>
                </div>
              </div>

              {/* Middle: Features */}
              <div className="md:col-span-1">
                <h3 className="mb-4 font-semibold text-center md:text-left">Includes:</h3>
                <div className="space-y-3">
                  {features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#FFC928] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#030213]" />
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
                      <div className="w-5 h-5 rounded-full bg-[#FFC928] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#030213]" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </div>
                  ))}
                </div>
                <Button
                  size="lg"
                  className="w-full bg-[#FFC928] hover:bg-[#FFD54F] text-[#030213]"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
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
