'use client';

import { useState } from 'react';
import Link from 'next/link';
import { subMonths, format } from 'date-fns';
import { useFinanceSummary } from '@/hooks/useFinanceSummary';
import { usePermissions } from '@/context/PermissionContext';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';
import {
  MetricHero,
  SectionCard,
  DonutChart,
  LineChart,
  GaugeChart,
  QualityBadge,
  DataTable,
} from '@/components/dashboard';

const PERIODS = [
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'ytd', label: 'YTD' },
] as const;

function collectionQuality(rate: number): { label: string; variant: 'green' | 'blue' | 'amber' | 'red' } {
  if (rate >= 80) return { label: 'GREAT', variant: 'green' };
  if (rate >= 60) return { label: 'GOOD', variant: 'blue' };
  if (rate >= 40) return { label: 'NEEDS ATTENTION', variant: 'amber' };
  return { label: 'POOR', variant: 'red' };
}

export default function FinanceDashboard(): JSX.Element {
  const [period, setPeriod] = useState<string>('month');
  const { data, isLoading, isError, refetch } = useFinanceSummary();
  const { canRead, canWrite } = usePermissions();

  const months = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(new Date(), 5 - i), 'MMM'),
  );

  const collectionRate = data?.collectionRate ?? 0;
  const { label: collLabel, variant: collVariant } = collectionQuality(collectionRate);

  const pendingActions = [
    {
      icon: '⏳',
      label: `${data?.commissionsPending ?? 0} commissions to review`,
      href: '/finance/commissions',
      warn: (data?.commissionsPending ?? 0) > 0,
      show: canRead('finance.commissions'),
    },
    {
      icon: '⏳',
      label: `${data?.pendingLeaveRequests ?? 0} leave requests pending`,
      href: '/hr/leave',
      warn: (data?.pendingLeaveRequests ?? 0) > 0,
      show: true,
    },
    {
      icon: '🔴',
      label: `${data?.blockedProjects ?? 0} projects over budget`,
      href: '/finance/budget',
      warn: (data?.blockedProjects ?? 0) > 0,
      show: true,
    },
    {
      icon: '⚠️',
      label: `${data?.pendingReconciliations ?? 0} reconciliations incomplete`,
      href: '/finance/reconciliation',
      warn: (data?.pendingReconciliations ?? 0) > 0,
      show: canWrite('finance.reconciliation'),
    },
  ].filter((a) => a.show);

  return (
    <div className="space-y-6 p-6">
      {isError && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3">
          <p className="text-sm text-[var(--cdy-danger)]">
            Failed to load finance summary.
          </p>
          <button
            onClick={() => void refetch()}
            className="text-sm text-cdy-muted underline hover:text-cdy-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p.key
                ? 'bg-blue-900/40 text-blue-400'
                : 'text-cdy-muted hover:bg-cdy-navy-light'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Row 1 — Hero metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SectionCard>
          <MetricHero
            value={formatCurrency(data?.totalInvoiced ?? 0)}
            label="Total revenue MTD"
            trend={data?.revenueTrend}
            trendLabel="vs last month"
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={formatCurrency(data?.totalCollected ?? 0)}
            label="Cash collected MTD"
            trend={data?.collectionTrend}
            trendLabel="vs last month"
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={formatCurrency(data?.outstanding ?? 0)}
            label="Outstanding AR"
            trend={data?.outstandingTrend}
            trendLabel="vs last month"
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={formatCurrency(data?.overdue ?? 0)}
            label="Overdue amount"
            badge={(data?.overdueCount ?? 0) > 0 ? 'NEEDS ATTENTION' : 'GREAT'}
            badgeVariant={(data?.overdueCount ?? 0) > 0 ? 'amber' : 'green'}
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Revenue trend — 6 months" className="lg:col-span-2">
          <LineChart
            labels={months}
            series={[
              {
                label: 'Revenue',
                color: '#C41E3A',
                data: data?.monthlyRevenue ?? Array(6).fill(0),
              },
              {
                label: 'Collected',
                color: '#4ADE80',
                data: data?.monthlyCollected ?? Array(6).fill(0),
              },
            ]}
            height={160}
          />
        </SectionCard>

        <SectionCard title="Invoices by status">
          <DonutChart
            segments={[
              { label: 'Paid', value: data?.paidCount ?? 0, color: '#4ADE80' },
              { label: 'Sent', value: data?.totalSentInvoices ?? 0, color: '#60A5FA' },
              { label: 'Overdue', value: data?.overdueCount ?? 0, color: '#F87171' },
              { label: 'Partial', value: data?.partialCount ?? 0, color: '#FBBF24' },
            ]}
            size={120}
            thickness={22}
          />
        </SectionCard>
      </div>

      {/* Row 3 — Collection rate + Expenses */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Collection rate">
          <div className="flex items-center gap-6">
            <GaugeChart value={collectionRate} label="collected vs invoiced" />
            <div className="space-y-2">
              <QualityBadge label={collLabel} variant={collVariant} />
              <p className="text-sm text-cdy-muted">
                {formatCurrency(data?.totalCollected ?? 0)} collected
                <br />
                of {formatCurrency(data?.totalInvoiced ?? 0)} invoiced
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Expenses MTD by category"
          action={
            <span className="text-xs text-cdy-muted">
              {formatCurrency(data?.totalExpenses ?? 0)} total
            </span>
          }
        >
          <div className="space-y-2.5">
            {(data?.expensesByCategory ?? []).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-cdy-muted">
                    {cat.category.toLowerCase()}
                  </span>
                  <span className="font-mono text-cdy-white">
                    {formatCurrency(cat.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                  <div
                    className="h-full rounded-full bg-cdy-red transition-all"
                    style={{
                      width: `${((cat.amount / (data?.totalExpenses ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {(data?.expensesByCategory ?? []).length === 0 && !isLoading && (
              <p className="text-sm text-cdy-muted">No expenses this month.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Row 4 — MRR + Pending actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Recurring revenue">
          <div className="space-y-3">
            <MetricHero
              value={formatCurrency(data?.totalMRR ?? 0)}
              label="Monthly recurring revenue"
              size="md"
              isLoading={isLoading}
            />
            <div className="grid grid-cols-3 gap-3 border-t border-cdy-navy-border pt-3">
              <div>
                <p className="text-xs text-cdy-dim">ARR</p>
                <p className="font-mono text-sm font-semibold text-cdy-white">
                  {formatCurrency((data?.totalMRR ?? 0) * 12)}
                </p>
              </div>
              <div>
                <p className="text-xs text-cdy-dim">Active retainers</p>
                <p className="font-mono text-sm font-semibold text-cdy-white">
                  {data?.activeRetainers ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-cdy-dim">Up for renewal</p>
                <p
                  className={`font-mono text-sm font-semibold ${
                    (data?.retainersUpForRenewal ?? 0) > 0
                      ? 'text-amber-400'
                      : 'text-cdy-white'
                  }`}
                >
                  {data?.retainersUpForRenewal ?? 0}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Pending actions">
          <div className="space-y-1">
            {pendingActions.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-cdy-navy ${
                  item.warn ? 'text-cdy-white' : 'text-cdy-muted'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto text-cdy-dim">→</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Row 5 — Ventures summary (CEO + Finance Manager only) */}
      {canRead('ventures.manage') && data?.ventures && (
        <SectionCard
          title="Ventures — MTD"
          action={
            <Link href="/finance/ventures" className="text-xs text-cdy-red hover:underline">
              View all →
            </Link>
          }
        >
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-cdy-muted">Active Ventures</p>
              <p className="mt-1 text-xl font-semibold text-cdy-white">{data.ventures.count}</p>
            </div>
            <div>
              <p className="text-xs text-cdy-muted">Income MTD</p>
              <p className="mt-1 text-xl font-semibold text-green-400">
                {formatCurrency(data.ventures.totalIncomeMTD)}
              </p>
            </div>
            <div>
              <p className="text-xs text-cdy-muted">Expenses MTD</p>
              <p className="mt-1 text-xl font-semibold text-cdy-white">
                {formatCurrency(data.ventures.totalExpensesMTD)}
              </p>
            </div>
            <div>
              <p className="text-xs text-cdy-muted">Net MTD</p>
              <p
                className={`mt-1 text-xl font-semibold ${
                  data.ventures.totalIncomeMTD - data.ventures.totalExpensesMTD >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {formatCurrency(data.ventures.totalIncomeMTD - data.ventures.totalExpensesMTD)}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Row 6 — Reserve Fund (Finance Manager + CEO only) */}
      <PermissionGate feature="finance.reserve" action="read">
        <SectionCard>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-cdy-dim">
              Reserve Fund
            </p>
            <Link href="/finance/reserve" className="text-xs text-cdy-red hover:underline">
              Manage →
            </Link>
          </div>
          <MetricHero
            value={`${data?.reserve?.currency ?? 'RWF'} ${Number(data?.reserve?.balance ?? 0).toLocaleString()}`}
            label="Current balance"
            size="md"
            isLoading={isLoading}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-cdy-navy-border pt-3">
            <div>
              <p className="text-xs text-cdy-dim">In this month</p>
              <p className="font-mono text-sm text-green-400">
                + {Number(data?.reserve?.depositsThisMonth ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-cdy-dim">Out this month</p>
              <p className="font-mono text-sm text-red-400">
                − {Number(data?.reserve?.withdrawalsThisMonth ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </SectionCard>
      </PermissionGate>

      {/* Row 7 — Recent invoices + Top clients */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Recent invoices"
          action={
            <Link href="/finance/invoices" className="text-xs text-cdy-red hover:underline">
              View all →
            </Link>
          }
        >
          <DataTable
            columns={['Invoice', 'Client', 'Amount', 'Status']}
            rows={(data?.recentInvoices ?? []).map((inv) => [
              inv.invoiceNumber,
              inv.clientName,
              formatCurrency(Number(inv.total)),
              inv.status,
            ])}
          />
        </SectionCard>

        <SectionCard
          title="Top clients by revenue"
          action={
            <Link href="/crm/clients" className="text-xs text-cdy-red hover:underline">
              View all →
            </Link>
          }
        >
          <DataTable
            columns={['Client', 'Invoiced', 'Collected', 'Outstanding']}
            rows={(data?.topClients ?? []).map((c) => [
              c.companyName,
              formatCurrency(Number(c.totalInvoiced)),
              formatCurrency(Number(c.totalCollected)),
              formatCurrency(Number(c.outstanding)),
            ])}
          />
        </SectionCard>
      </div>
    </div>
  );
}
