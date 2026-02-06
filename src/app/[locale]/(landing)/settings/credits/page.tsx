import { getTranslations } from 'next-intl/server';

import { Empty } from '@/components/custom';
import { PanelCard } from '@/components/blocks/panel';
import { TableCard } from '@/components/blocks/table';
import { Progress } from '@/components/ui/progress';
import {
  getQuotas,
  getQuotasCount,
  getQuotaOverview,
  QuotaStatus,
  QuotaTransactionType,
  QuotaPoolOverview,
} from '@/shared/models/quota';
import { getUserInfo } from '@/shared/models/user';
import { Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

function QuotaPoolCard({
  title,
  pool,
  purchaseUrl,
  purchaseLabel,
}: {
  title: string;
  pool: QuotaPoolOverview | null;
  purchaseUrl?: string;
  purchaseLabel?: string;
}) {
  if (!pool) {
    return (
      <PanelCard
        title={title}
        buttons={
          purchaseUrl
            ? [
                {
                  title: purchaseLabel || 'Purchase',
                  url: purchaseUrl,
                  target: '_blank',
                  icon: 'Coins',
                },
              ]
            : undefined
        }
        className="max-w-md"
      >
        <div className="text-muted-foreground text-sm">No active quota</div>
      </PanelCard>
    );
  }

  const prefix = pool.measurementType === 'dollar' ? '$' : '';
  const suffix = pool.measurementType === 'unit' ? ' units' : '';
  const percentage =
    pool.totalGranted > 0
      ? Math.round((pool.remaining / pool.totalGranted) * 100)
      : 0;

  return (
    <PanelCard
      title={title}
      buttons={
        purchaseUrl
          ? [
              {
                title: purchaseLabel || 'Purchase',
                url: purchaseUrl,
                target: '_blank',
                icon: 'Coins',
              },
            ]
          : undefined
      }
      className="max-w-md"
    >
      <div className="space-y-3">
        <div className="text-primary text-3xl font-bold">
          {prefix}
          {pool.remaining}
          {suffix}
        </div>
        <Progress value={percentage} className="h-2" />
        <div className="text-muted-foreground text-sm">
          {prefix}
          {pool.totalConsumed}
          {suffix} used of {prefix}
          {pool.totalGranted}
          {suffix}
          {pool.earliestExpiry && (
            <span className="ml-2">
              · Expires{' '}
              {new Date(pool.earliestExpiry).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </PanelCard>
  );
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.credits');

  const total = await getQuotasCount({
    transactionType: type as QuotaTransactionType,
    userId: user.id,
    status: QuotaStatus.ACTIVE,
  });

  const quotas = await getQuotas({
    userId: user.id,
    status: QuotaStatus.ACTIVE,
    transactionType: type as QuotaTransactionType,
    page,
    limit,
  });

  const table: Table = {
    title: t('list.title'),
    columns: [
      {
        name: 'transactionNo',
        title: t('fields.transaction_no'),
        type: 'copy',
      },
      { name: 'description', title: t('fields.description') },
      {
        name: 'transactionType',
        title: t('fields.type'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'poolType',
        title: 'Pool',
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'amount',
        title: t('fields.credits'),
        callback: (item) => {
          const amount = parseFloat(item.amount);
          const prefix = item.measurementType === 'dollar' ? '$' : '';
          if (amount > 0) {
            return (
              <span className="text-green-500">
                +{prefix}
                {amount}
              </span>
            );
          }
          return (
            <span className="text-red-500">
              {prefix}
              {amount}
            </span>
          );
        },
      },
      {
        name: 'expiresAt',
        title: t('fields.expires_at'),
        type: 'time',
        placeholder: '-',
        metadata: { format: 'YYYY-MM-DD HH:mm:ss' },
      },
      {
        name: 'createdAt',
        title: t('fields.created_at'),
        type: 'time',
      },
    ],
    data: quotas,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const overview = await getQuotaOverview(user.id);

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: '/settings/credits',
      is_active: !type || type === 'all',
    },
    {
      title: t('list.tabs.grant'),
      name: 'grant',
      url: '/settings/credits?type=grant',
      is_active: type === 'grant',
    },
    {
      title: t('list.tabs.consume'),
      name: 'consume',
      url: '/settings/credits?type=consume',
      is_active: type === 'consume',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row">
        <QuotaPoolCard
          title="Monthly Subscription"
          pool={overview.subscription}
        />
        <QuotaPoolCard
          title="Pay-as-you-go"
          pool={overview.paygo}
          purchaseUrl="/pricing"
          purchaseLabel={t('view.buttons.purchase')}
        />
      </div>
      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
