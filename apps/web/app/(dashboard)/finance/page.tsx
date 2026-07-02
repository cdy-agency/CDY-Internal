'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { subMonths, format } from 'date-fns';
import { useFinanceSummary } from '@/hooks/useFinanceSummary';
import { usePermissions } from '@/context/PermissionContext';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { DirectIncomeDrawer } from '@/components/finance/directIncome/DirectIncomeDrawer';
import {
  MetricHero,
  SectionCard,
  DonutChart,
  LineChart,
  GaugeChart,
  QualityBadge,
  DataTable,
} from '@/components/dashboard';

function collectionQuality(rate: number): { label: string; variant: 'green' | 'blue' | 'amber' | 'red' } {
  if (rate >= 80) return { label: 'GREAT', variant: 'green' };
  if (rate >= 60) return { label: 'GOOD', variant: 'blue' };
  if (rate >= 40) return { label: 'NEEDS ATTENTION', variant: 'amber' };
  return { label: 'POOR', variant: 'red' };
}

function serviceColor(service: string): string {
  const colors: Record<string, string> = {
    software_dev:         '#60A5FA',
    branding:             '#A78BFA',
    social_media:         '#F472B6',
    influencer_marketing: '#FBBF24',
    sales_services:       '#4ADE80',
    general:              '#94A3B8',
    retainer:             '#C41E3A',
    historical_import:    '#64748B',
  };
  return colors[service] ?? '#94A3B8';
}

function paymentMethodColor(method: string): string {
  const colors: Record<string, string> = {
    BANK_TRANSFER: '#60A5FA',
    MOBILE_MONEY:  '#FBBF24',
    MTN_MOMO:      '#FBBF24',
    AIRTEL_MONEY:  '#F87171',
    CARD:          '#A78BFA',
    CASH:          '#4ADE80',
    OTHER:         '#94A3B8',
  };
  return colors[method] ?? '#94A3B8';
}

export default function FinanceDashboard(): JSX.Element {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [directIncomeOpen, setDirectIncomeOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useFinanceSummary({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { canRead, canWrite } = usePermissions();

  const months = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(new Date(), 5 - i), 'MMM'),
  );

  const hasDateRange = !!(dateFrom && dateTo);
  const displayIncome = hasDateRange ? (data?.rangeIncome ?? 0) : (data?.totalIncome ?? 0);
  const displayExpenses = hasDateRange ? (data?.rangeExpenses ?? 0) : (data?.totalExpenses ?? 0);
  const displayBalance = hasDateRange ? (data?.rangeBalance ?? 0) : (data?.difference ?? 0);
  const periodLabel = hasDateRange ? 'Selected period' : 'MTD';

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

      {/* Date range filter + Record Income */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-xs text-cdy-muted">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-xs text-cdy-muted">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-cdy-muted underline hover:text-cdy-white"
            >
              Clear
            </button>
          )}
        </div>
        <PermissionGate feature="finance.payments" action="write">
          <Button size="sm" onClick={() => setDirectIncomeOpen(true)}>
            <Plus className="h-4 w-4" />
            Record Income
          </Button>
        </PermissionGate>
      </div>

      {/* Row 1 — Hero metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Row 1b — Total Income / Expenses / Balance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SectionCard>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-400">
            Total Income — {periodLabel}
          </p>
          <p className="mt-2 text-2xl font-bold text-cdy-white">
            {isLoading ? '—' : formatCurrency(displayIncome)}
          </p>
          <p className="mt-1 text-xs text-cdy-muted">Invoice + direct income</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs font-medium uppercase tracking-wide text-red-400">
            Total Expenses — {periodLabel}
          </p>
          <p className="mt-2 text-2xl font-bold text-cdy-white">
            {isLoading ? '—' : formatCurrency(displayExpenses)}
          </p>
          <p className="mt-1 text-xs text-cdy-muted">All expense categories</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-400">
            Balance — {periodLabel}
          </p>
          <p className={`mt-2 text-2xl font-bold ${displayBalance >= 0 ? 'text-cdy-white' : 'text-orange-400'}`}>
            {isLoading ? '—' : formatCurrency(displayBalance)}
          </p>
          <p className="mt-1 text-xs text-cdy-muted">Income − Expenses</p>
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

      {/* Row 4 — Income by service + Expense by category + Payment method breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Income by service bar chart */}
        <SectionCard
          title="Income by service — this month"
          action={
            <span className="text-xs text-cdy-muted">
              {data?.charts?.totals?.income
                ? formatCurrency(data.charts.totals.income)
                : ''}
            </span>
          }
        >
          <div className="space-y-3">
            {(data?.charts?.incomeByService ?? []).map((item) => (
              <div key={item.service}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-cdy-muted">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-cdy-dim">
                      {item.count} invoice{item.count !== 1 ? 's' : ''}
                    </span>
                    <span className="font-mono font-medium text-cdy-white">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="w-10 text-right text-cdy-dim">{item.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: serviceColor(item.service),
                    }}
                  />
                </div>
              </div>
            ))}
            {(data?.charts?.incomeByService ?? []).length === 0 && !isLoading && (
              <p className="py-4 text-center text-sm text-cdy-muted">
                No income recorded this month
              </p>
            )}
          </div>
        </SectionCard>

        {/* Expense by category bar chart */}
        <SectionCard
          title="Expenses by category — this month"
          action={
            <span className="text-xs text-cdy-muted">
              {data?.charts?.totals?.expenses
                ? formatCurrency(data.charts.totals.expenses)
                : ''}
            </span>
          }
        >
          <div className="space-y-3">
            {(data?.charts?.expenseByCategory ?? []).map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="capitalize text-cdy-muted">
                    {item.category.toLowerCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-cdy-white">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="w-10 text-right text-cdy-dim">{item.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                  <div
                    className="h-full rounded-full bg-cdy-red transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {(data?.charts?.expenseByCategory ?? []).length === 0 && !isLoading && (
              <p className="py-4 text-center text-sm text-cdy-muted">
                No expenses this month
              </p>
            )}
          </div>
        </SectionCard>

        {/* Payment method — income vs expenses vs net */}
        <SectionCard title="Payment methods — income vs expenses">
          {/* Header row */}
          <div className="mb-1 grid grid-cols-4 gap-2 border-b border-cdy-navy-border pb-2">
            {(['Method', 'Income', 'Expenses', 'Net'] as const).map((h, i) => (
              <span
                key={h}
                className={`text-xs uppercase tracking-wide text-cdy-dim ${i > 0 ? 'text-right' : ''}`}
              >
                {h}
              </span>
            ))}
          </div>
          {(data?.charts?.paymentMethodSummary ?? []).map((item) => (
            <div
              key={item.method}
              className="grid grid-cols-4 gap-2 border-b border-cdy-navy-border/50 py-3 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-sm text-cdy-muted">{item.label}</span>
              </div>
              <div className="text-right">
                {item.income.amount > 0 ? (
                  <>
                    <span className="font-mono text-sm text-green-400">
                      +{formatCurrency(item.income.amount)}
                    </span>
                    {item.income.count > 0 && (
                      <span className="block text-xs text-cdy-dim">{item.income.count}×</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-cdy-dim">—</span>
                )}
              </div>
              <div className="text-right">
                {item.expenses.amount > 0 ? (
                  <>
                    <span className="font-mono text-sm text-red-400">
                      −{formatCurrency(item.expenses.amount)}
                    </span>
                    {item.expenses.count > 0 && (
                      <span className="block text-xs text-cdy-dim">{item.expenses.count}×</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-cdy-dim">—</span>
                )}
              </div>
              <div className="text-right">
                <span
                  className={`font-mono text-sm font-semibold ${
                    item.net > 0
                      ? 'text-cdy-white'
                      : item.net < 0
                        ? 'text-red-400'
                        : 'text-cdy-dim'
                  }`}
                >
                  {item.net > 0 ? '+' : ''}{formatCurrency(item.net)}
                </span>
              </div>
            </div>
          ))}
          {(data?.charts?.paymentMethodSummary ?? []).length === 0 && !isLoading && (
            <p className="py-6 text-center text-sm text-cdy-muted">
              No payment activity this month
            </p>
          )}
        </SectionCard>
      </div>

      {/* Row 5 — MRR + Pending actions */}
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

      {/* Row 6 — Ventures summary (CEO + Finance Manager only) */}
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

      {/* Row 7 — Reserve Fund (Finance Manager + CEO only) */}
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

      {/* Row 7b — Recent Due Bills + Monthly Comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Bills due soon"
          action={
            <Link href="/finance/bills" className="text-xs text-cdy-red hover:underline">
              View all →
            </Link>
          }
        >
          {(data?.recentDueBills ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-cdy-muted">No bills due in the next 7 days</p>
          ) : (
            <div className="space-y-2">
              {(data?.recentDueBills ?? []).map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-lg border border-cdy-navy-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-cdy-white">{bill.vendorName}</p>
                    <p className={`text-xs ${bill.daysUntilDue <= 0 ? 'text-red-400' : bill.daysUntilDue <= 2 ? 'text-amber-400' : 'text-cdy-muted'}`}>
                      {bill.daysUntilDue <= 0
                        ? `${Math.abs(bill.daysUntilDue)} days overdue`
                        : bill.daysUntilDue === 0
                          ? 'Due today'
                          : `Due in ${bill.daysUntilDue} day${bill.daysUntilDue === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-cdy-white">
                    {formatCurrency(bill.amount, bill.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Income vs Expenses — 6 months">
          <div className="space-y-0">
            <div className="grid grid-cols-4 gap-2 border-b border-cdy-navy-border pb-2 text-xs uppercase tracking-wide text-cdy-dim">
              <span>Month</span>
              <span className="text-right">Income</span>
              <span className="text-right">Expenses</span>
              <span className="text-right">Net</span>
            </div>
            {(data?.monthlyComparison ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-cdy-muted">No data available</p>
            ) : (
              (data?.monthlyComparison ?? []).map((row) => (
                <div
                  key={row.month}
                  className="grid grid-cols-4 gap-2 border-b border-cdy-navy-border/40 py-2 text-sm last:border-0"
                >
                  <span className="font-medium text-cdy-muted">{row.month}</span>
                  <span className="text-right font-mono text-green-400">
                    {formatCurrency(row.income)}
                  </span>
                  <span className="text-right font-mono text-red-400">
                    {formatCurrency(row.expenses)}
                  </span>
                  <span className={`text-right font-mono font-semibold ${row.net >= 0 ? 'text-cdy-white' : 'text-orange-400'}`}>
                    {row.net >= 0 ? '+' : ''}{formatCurrency(row.net)}
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Row 8 — Recent income + Recent expenses */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Recent income">
          <DataTable
            columns={['Description', 'Client', 'Method', 'Amount']}
            rows={(data?.recentIncomeTransactions ?? []).map((t) => [
              t.description,
              t.clientName,
              t.method.replace(/_/g, ' '),
              formatCurrency(t.amount),
            ])}
          />
        </SectionCard>

        <SectionCard title="Recent expenses">
          <DataTable
            columns={['Vendor', 'Category', 'Method', 'Amount']}
            rows={(data?.recentExpenseTransactions ?? []).map((e) => [
              e.vendorName,
              e.category.replace(/_/g, ' '),
              e.paymentMethod ? e.paymentMethod.replace(/_/g, ' ') : '—',
              formatCurrency(e.amount),
            ])}
          />
        </SectionCard>
      </div>

      {/* Row 9 — Recent invoices + Top clients */}
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

      <DirectIncomeDrawer
        open={directIncomeOpen}
        onClose={() => setDirectIncomeOpen(false)}
      />
    </div>
  );
}
