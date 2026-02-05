import moment from 'moment';
import { getTranslations } from 'next-intl/server';

import { Empty } from '@/components/custom';
import { PanelCard } from '@/components/blocks/panel';
import { TableCard } from '@/components/blocks/table';
import { Button } from '@/components/ui/button';
import {
  getCurrentSubscription,
  getSubscriptions,
  getSubscriptionsCount,
  Subscription,
  SubscriptionStatus,
} from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { Button as ButtonType, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; status?: string }>;
}) {
  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.billing');

  const currentSubscription = await getCurrentSubscription(user.id);

  const total = await getSubscriptionsCount({
    userId: user.id,
    status,
  });

  const subscriptions = await getSubscriptions({
    userId: user.id,
    status,
    page,
    limit,
  });

  const table: Table = {
    title: t('list.title'),
    columns: [
      {
        name: 'subscriptionNo',
        title: t('fields.subscription_no'),
        type: 'copy',
      },
      {
        name: 'interval',
        title: t('fields.interval'),
        callback: function (item) {
          if (!item.interval || !item.intervalCount) {
            return '-';
          }
          return <div>{`${item.intervalCount}-${item.interval}`}</div>;
        },
      },
      {
        name: 'status',
        title: t('fields.status'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        title: t('fields.amount'),
        callback: function (item) {
          const currency = (item.currency || 'USD').toUpperCase();

          let prefix = '';
          if (currency === 'USD') {
            prefix = `$`;
          } else if (currency === 'EUR') {
            prefix = `€`;
          } else if (currency === 'CNY') {
            prefix = `¥`;
          } else {
            prefix = `${currency} `;
          }

          return (
            <div className="text-primary">{`${prefix}${item.amount / 100}`}</div>
          );
        },
      },
      {
        name: 'createdAt',
        title: t('fields.created_at'),
        type: 'time',
      },
      {
        title: t('fields.current_period'),
        callback: function (item) {
          let period = (
            <div>
              {`${moment(item.currentPeriodStart).format('YYYY-MM-DD')}`} ~
              <br />
              {`${moment(item.currentPeriodEnd).format('YYYY-MM-DD')}`}
            </div>
          );

          return period;
        },
      },
      {
        title: t('fields.end_time'),
        callback: function (item) {
          if (item.canceledEndAt) {
            return <div>{moment(item.canceledEndAt).format('YYYY-MM-DD')}</div>;
          }
          return '-';
        },
      },
      {
        title: t('fields.action'),
        type: 'dropdown',
        callback: function (item) {
          if (
            item.status !== SubscriptionStatus.ACTIVE &&
            item.status !== SubscriptionStatus.TRIALING
          ) {
            return null;
          }

          return [
            {
              title: t('view.buttons.cancel'),
              url: `/settings/billing/cancel?subscription_no=${item.subscriptionNo}`,
              icon: 'Ban',
              size: 'sm',
              variant: 'outline',
            },
          ];
        },
      },
    ],
    data: subscriptions,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: '/settings/billing',
      is_active: !status || status === 'all',
    },
    {
      title: t('list.tabs.active'),
      name: 'active',
      url: '/settings/billing?status=active',
      is_active: status === 'active',
    },
    {
      title: t('list.tabs.trialing'),
      name: 'trialing',
      url: '/settings/billing?status=trialing',
      is_active: status === 'trialing',
    },
    {
      title: t('list.tabs.paused'),
      name: 'paused',
      url: '/settings/billing?status=paused',
      is_active: status === 'paused',
    },
    {
      title: t('list.tabs.expired'),
      name: 'expired',
      url: '/settings/billing?status=expired',
      is_active: status === 'expired',
    },
    {
      title: t('list.tabs.pending_cancel'),
      name: 'pending_cancel',
      url: '/settings/billing?status=pending_cancel',
      is_active: status === 'pending_cancel',
    },
    {
      title: t('list.tabs.canceled'),
      name: 'canceled',
      url: '/settings/billing?status=canceled',
      is_active: status === 'canceled',
    },
  ];

  let buttons: ButtonType[] = [];
  if (currentSubscription) {
    if (
      currentSubscription.status === SubscriptionStatus.ACTIVE ||
      currentSubscription.status === SubscriptionStatus.TRIALING ||
      currentSubscription.status === SubscriptionStatus.PENDING_CANCEL
    ) {
      // ACTIVE/TRIALING/PENDING_CANCEL (still within cycle): Show Manage Subscription button
      if (currentSubscription.paymentUserId) {
        buttons = [
          {
            title: t('view.buttons.manage'),
            url: `/settings/billing/retrieve?subscription_no=${currentSubscription.subscriptionNo}`,
            target: '_blank',
            icon: 'Settings',
            size: 'sm',
          },
        ];
      }
    }
  } else {
    // No subscription: Show Subscribe button → direct checkout
    buttons = [
      {
        title: t('view.buttons.subscribe'),
        url: '/settings/billing/subscribe',
        icon: 'ArrowUpRight',
        size: 'sm',
      },
    ];
  }

  return (
    <div className="space-y-8">
      <PanelCard
        label={currentSubscription?.status}
        title={t('view.title')}
        buttons={buttons}
        className="max-w-md"
      >
        <div className="text-primary text-3xl font-bold">
          {currentSubscription?.planName || t('view.no_subscription')}
        </div>
        {currentSubscription?.status ===
        SubscriptionStatus.PENDING_CANCEL ? (
          <div className="text-muted-foreground mt-4 text-sm font-normal">
            {t('view.canceled_tip', {
              date: moment(
                currentSubscription?.canceledEndAt ||
                  currentSubscription?.currentPeriodEnd
              ).format('YYYY-MM-DD'),
            })}
          </div>
        ) : null}
      </PanelCard>
      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
