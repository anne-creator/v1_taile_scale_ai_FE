import { Progress } from '@/components/ui/progress';
import {
  Card as CardComponent,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { QuotaPoolOverview } from '@/shared/models/quota';

/**
 * Usage Panel Block (Level 4)
 *
 * Server component that displays subscription quota usage.
 * Receives data via props from the Page layer (Level 5).
 */

export function UsagePanel({
  pool,
  className,
}: {
  pool: QuotaPoolOverview | null;
  className?: string;
}) {
  if (!pool) {
    return (
      <CardComponent className={cn('overflow-hidden pb-0', className)}>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <div className="text-sm">No active subscription</div>
        </CardContent>
      </CardComponent>
    );
  }

  const isUnitBased = pool.measurementType === 'unit';
  const totalGranted = pool.totalGranted;
  const consumed = pool.totalConsumed;
  const remaining = pool.remaining;
  const percentage =
    totalGranted > 0 ? Math.round((consumed / totalGranted) * 100) : 0;

  return (
    <CardComponent className={cn('overflow-hidden pb-0', className)}>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-primary text-3xl font-bold">
            {isUnitBased
              ? `${Math.round(consumed)} / ${Math.round(totalGranted)}`
              : `$${consumed.toFixed(2)} / $${totalGranted.toFixed(2)}`}
          </div>
          <Progress value={percentage} className="h-2" />
          <div className="text-muted-foreground text-sm">
            {isUnitBased
              ? `${Math.round(remaining)} images remaining this period`
              : `$${remaining.toFixed(2)} remaining this period`}
            {pool.earliestExpiry && (
              <span className="ml-2">
                · Resets{' '}
                {new Date(pool.earliestExpiry).toLocaleDateString()}
              </span>
            )}
          </div>
          {remaining <= 0 && (
            <div className="text-sm font-medium text-destructive">
              Monthly quota depleted
            </div>
          )}
        </div>
      </CardContent>
    </CardComponent>
  );
}
