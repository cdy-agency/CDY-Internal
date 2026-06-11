'use client';

import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Receipt,
  TrendingUp,
  Plus,
  Building2,
  AlertOctagon,
} from 'lucide-react';
import { MetricCard } from '@/components/finance/MetricCard';
import { Button } from '@/components/ui/button';
import { useFinanceSummary } from '@/hooks/useFinanceSummary';
import { calculateDelta, formatCurrency } from '@/lib/utils';

export default function FinanceOverviewPage(): JSX.Element {
  const { data, isLoading, isError, refetch } = useFinanceSummary();

  const metrics = data
    ? [
        {
          label: 'Total Invoiced (MTD)',
          value: formatCurrency(data.totalInvoiced),
          delta: calculateDelta(data.totalInvoiced, data.previousMonth.totalInvoiced),
          icon: FileText,
          iconColor: 'bg-blue-500/10 text-[var(--cdy-info)]',
        },
        {
          label: 'Total Collected (MTD)',
          value: formatCurrency(data.totalCollected),
          delta: calculateDelta(data.totalCollected, data.previousMonth.totalCollected),
          icon: CheckCircle,
          iconColor: 'bg-emerald-500/10 text-[var(--cdy-success)]',
        },
        {
          label: 'Outstanding',
          value: formatCurrency(data.outstanding),
          delta: calculateDelta(data.outstanding, data.previousMonth.outstanding),
          icon: Clock,
          iconColor: 'bg-amber-500/10 text-[var(--cdy-warning)]',
        },
        {
          label: 'Overdue',
          value: formatCurrency(data.overdue),
          delta: calculateDelta(data.overdue, data.previousMonth.overdue),
          icon: AlertTriangle,
          iconColor: 'bg-red-500/10 text-[var(--cdy-danger)]',
        },
        {
          label: 'Total Expenses (MTD)',
          value: formatCurrency(data.totalExpenses),
          delta: calculateDelta(data.totalExpenses, data.previousMonth.totalExpenses),
          icon: Receipt,
          iconColor: 'bg-purple-500/10 text-purple-400',
        },
        {
          label: 'Net Cash Position',
          value: formatCurrency(data.netCashPosition),
          delta: calculateDelta(data.netCashPosition, data.previousMonth.netCashPosition),
          icon: TrendingUp,
          iconColor:
            data.netCashPosition >= 0
              ? 'bg-emerald-500/10 text-[var(--cdy-success)]'
              : 'bg-red-500/10 text-[var(--cdy-danger)]',
        },
        {
          label: 'Bills Pending',
          value: formatCurrency(data.totalBillsPending),
          delta: calculateDelta(
            data.totalBillsPending,
            data.previousMonth.totalBillsPending,
          ),
          icon: Building2,
          iconColor: 'bg-amber-500/10 text-[var(--cdy-warning)]',
        },
        {
          label: 'Bills Overdue',
          value: formatCurrency(data.totalBillsOverdue),
          delta: calculateDelta(
            data.totalBillsOverdue,
            data.previousMonth.totalBillsOverdue,
          ),
          icon: AlertOctagon,
          iconColor: 'bg-red-500/10 text-[var(--cdy-danger)]',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {isError && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3">
          <p className="text-sm text-[var(--cdy-danger)]">
            Failed to load finance summary. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <MetricCard
                key={`skeleton-${index}`}
                label=""
                value=""
                delta={0}
                deltaLabel=""
                icon={FileText}
                iconColor=""
                isLoading
              />
            ))
          : metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                delta={metric.delta}
                deltaLabel="vs last month"
                icon={metric.icon}
                iconColor={metric.iconColor}
                isLoading={false}
              />
            ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium text-cdy-white">Quick links</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/finance/invoices/new">
              <Plus className="h-4 w-4" />
              New Invoice
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/finance/payments">
              <Plus className="h-4 w-4" />
              View Payments
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/finance/expenses">
              <Plus className="h-4 w-4" />
              Log Expense
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/finance/bills">
              <Plus className="h-4 w-4" />
              Add Bill
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
