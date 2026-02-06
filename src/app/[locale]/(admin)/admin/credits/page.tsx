import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/components/blocks/dashboard';
import { TableCard } from '@/components/blocks/table';
import {
  getQuotas,
  getQuotasCount,
  QuotaStatus,
  QuotaTransactionType,
} from '@/shared/models/quota';
import { Crumb, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function QuotasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read credits/quotas
  await requirePermission({
    code: PERMISSIONS.CREDITS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.credits');

  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.credits'), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: '/admin/credits',
      is_active: !type || type === 'all',
    },
    {
      name: 'grant',
      title: t('list.tabs.grant'),
      url: '/admin/credits?type=grant',
      is_active: type === 'grant',
    },
    {
      name: 'consume',
      title: t('list.tabs.consume'),
      url: '/admin/credits?type=consume',
      is_active: type === 'consume',
    },
  ];

  const total = await getQuotasCount({
    transactionType: type as QuotaTransactionType,
    status: QuotaStatus.ACTIVE,
  });

  const quotas = await getQuotas({
    transactionType: type as QuotaTransactionType,
    status: QuotaStatus.ACTIVE,
    getUser: true,
    page,
    limit,
  });

  const table: Table = {
    columns: [
      {
        name: 'transactionNo',
        title: t('fields.transaction_no'),
        type: 'copy',
      },
      { name: 'user', title: t('fields.user'), type: 'user' },
      {
        name: 'poolType',
        title: 'Pool',
        type: 'label',
      },
      {
        name: 'measurementType',
        title: 'Unit',
        type: 'label',
      },
      {
        name: 'amount',
        title: t('fields.amount'),
        callback: (item) => {
          const amount = parseFloat(item.amount);
          const prefix = item.measurementType === 'dollar' ? '$' : '';
          if (amount > 0) {
            return <div className="text-green-500">+{prefix}{amount}</div>;
          } else {
            return <div className="text-red-500">{prefix}{amount}</div>;
          }
        },
      },
      {
        name: 'remainingAmount',
        title: t('fields.remaining'),
        callback: (item) => {
          const remaining = parseFloat(item.remainingAmount || '0');
          if (remaining <= 0) return <span className="text-muted-foreground">-</span>;
          const prefix = item.measurementType === 'dollar' ? '$' : '';
          return <span>{prefix}{remaining}</span>;
        },
      },
      { name: 'transactionType', title: t('fields.type') },
      { name: 'transactionScene', title: t('fields.scene'), placeholder: '-' },
      { name: 'description', title: t('fields.description'), placeholder: '-' },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'expiresAt',
        title: t('fields.expires_at'),
        type: 'time',
        placeholder: '-',
        metadata: { format: 'YYYY-MM-DD HH:mm:ss' },
      },
      {
        name: 'metadata',
        title: t('fields.metadata'),
        type: 'json_preview',
        placeholder: '-',
      },
    ],
    data: quotas,
    pagination: {
      total,
      page,
      limit,
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} tabs={tabs} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
