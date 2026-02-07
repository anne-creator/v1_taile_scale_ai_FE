'use client';

import { useState } from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card as CardComponent,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCheckout } from '@/hooks/use-checkout';
import { cn } from '@/shared/lib/utils';

/**
 * Addon Top-up Block (Level 4)
 *
 * Client component that allows users to purchase additional
 * pay-as-you-go credits when their subscription quota is depleted.
 *
 * Following code_principle.md:
 * - Block CONSUME context (call actions), not MANAGE state
 * - Checkout logic is managed by useCheckout hook
 * - Only internal UI state (amount input) is managed here (L2.5 equivalent)
 */

const MIN_AMOUNT = 3;
const COST_PER_IMAGE = 0.09;

export function AddonTopup({ className }: { className?: string }) {
  const [amount, setAmount] = useState(MIN_AMOUNT);
  const { actions, isLoading, error } = useCheckout();

  const estimatedImages = Math.floor(amount / COST_PER_IMAGE);

  const handleAmountChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setAmount(MIN_AMOUNT);
      return;
    }
    setAmount(Math.max(MIN_AMOUNT, num));
  };

  const handleIncrement = () => {
    setAmount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setAmount((prev) => Math.max(MIN_AMOUNT, prev - 1));
  };

  const handleTopUp = async () => {
    const result = await actions.checkoutAddon(amount);
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  };

  return (
    <CardComponent className={cn('overflow-hidden pb-0', className)}>
      <CardHeader>
        <CardTitle>Add-on Credits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Your monthly quota is depleted. Top up to continue generating images
            at $0.09 per image.
          </p>

          {error && (
            <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-2 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="topup-amount"
              className="text-sm font-medium"
            >
              Top-up amount (min ${MIN_AMOUNT})
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={amount <= MIN_AMOUNT || isLoading}
                aria-label="Decrease amount"
                className="h-9 w-9 shrink-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="relative flex-1">
                <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="topup-amount"
                  type="number"
                  min={MIN_AMOUNT}
                  step={1}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={() => {
                    if (amount < MIN_AMOUNT) setAmount(MIN_AMOUNT);
                  }}
                  className="pl-7"
                  disabled={isLoading}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={isLoading}
                aria-label="Increase amount"
                className="h-9 w-9 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">
                Estimated images
              </span>
              <span className="text-lg font-semibold">
                ~{estimatedImages} images
              </span>
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              ${COST_PER_IMAGE} per image · Balance deducted per generation
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted py-4">
        <Button
          onClick={handleTopUp}
          disabled={isLoading || amount < MIN_AMOUNT}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Top Up $${amount}`
          )}
        </Button>
      </CardFooter>
    </CardComponent>
  );
}
