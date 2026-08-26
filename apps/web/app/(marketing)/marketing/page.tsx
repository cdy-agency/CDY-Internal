'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns';
import api from '@/lib/api';
import {
  useAllMarketingSummary,
  useMarketingSummaryForPeriod,
  useMarketingClients,
} from '@/hooks/useMarketing';
import { AddMarketingClientDrawer } from '@/components/marketing/AddMarketingClientDrawer';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import {
  currentMonth,
  formatMonth,
  prevMonth,
  nextMonth,
  deliveryRateColor,
  platformShort,
} from '@/lib/marketingUtils';
import type {
  MarketingAllClientsSummaryItem,
  MarketingPeriodSummaryItem,
  MarketingSummaryPeriod,
} from '@cdy/shared';

const PERIODS: { value: MarketingSummaryPeriod; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatDay(dateStr: string): string {
  return format(new Date(dateStr), 'EEE, MMM d, yyyy');
}

function formatWeek(dateStr: string): string {
  const start = startOfWeek(new Date(dateStr), { weekStartsOn: 1 });
  const end = endOfWeek(new Date(dateStr), { weekStartsOn: 1 });
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

export default function MarketingOverviewPage(): JSX.Element {
  const [period, setPeriod] = useState<MarketingSummaryPeriod>('month');
  const [month, setMonth] = useState(currentMonth());
  const [anchorDate, setAnchorDate] = useState(todayString());
  const [addOpen, setAddOpen] = useState(false);

  const isMonth = period === 'month';
  const monthQuery = useAllMarketingSummary(month, isMonth);
  const periodQuery = useMarketingSummaryForPeriod(
    period === 'week' ? 'week' : 'day',
    anchorDate,
    !isMonth,
  );
  const { data: clients } = useMarketingClients();

  const summaries: (MarketingAllClientsSummaryItem | MarketingPeriodSummaryItem)[] | undefined =
    isMonth ? monthQuery.data : periodQuery.data;
  const isLoading = isMonth ? monthQuery.isLoading : periodQuery.isLoading;
  const isError = isMonth ? monthQuery.isError : periodQuery.isError;

  const totalPlanned = summaries?.reduce((s, c) => s + c.planned, 0) ?? 0;
  const totalPublished = summaries?.reduce((s, c) => s + c.published, 0) ?? 0;
  const totalPending = summaries?.reduce((s, c) => s + c.pending, 0) ?? 0;
  const activeCount = clients?.length ?? 0;

  function goPrev(): void {
    if (period === 'month') setMonth(prevMonth(month));
    else if (period === 'week') setAnchorDate(format(addWeeks(new Date(anchorDate), -1), 'yyyy-MM-dd'));
    else setAnchorDate(format(addDays(new Date(anchorDate), -1), 'yyyy-MM-dd'));
  }
  function goNext(): void {
    if (period === 'month') setMonth(nextMonth(month));
    else if (period === 'week') setAnchorDate(format(addWeeks(new Date(anchorDate), 1), 'yyyy-MM-dd'));
    else setAnchorDate(format(addDays(new Date(anchorDate), 1), 'yyyy-MM-dd'));
  }

  const rangeLabel =
    period === 'month' ? formatMonth(month) : period === 'week' ? formatWeek(anchorDate) : formatDay(anchorDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">Marketing</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  period === p.value
                    ? 'bg-cdy-red text-white'
                    : 'text-cdy-muted hover:text-cdy-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-3 py-1.5">
            <button
              type="button"
              onClick={goPrev}
              className="text-cdy-muted hover:text-cdy-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-32 text-center text-sm text-cdy-white">
              {rangeLabel}
            </span>
            <button
              type="button"
              onClick={goNext}
              className="text-cdy-muted hover:text-cdy-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <PermissionGate feature="marketing.clients" action="write">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Active clients', value: activeCount },
          { label: 'Posts planned', value: totalPlanned },
          { label: 'Posts published', value: totalPublished },
          { label: 'Pending approval', value: totalPending },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
          >
            <p className="text-xs text-cdy-muted">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold text-cdy-white">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          Failed to load marketing data.
        </div>
      )}

      {!isLoading && summaries && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Platforms</th>
                <th className="px-4 py-3 font-medium text-right">Monthly target</th>
                <th className="px-4 py-3 font-medium text-right">Planned</th>
                <th className="px-4 py-3 font-medium text-right">Published</th>
                <th className="px-4 py-3 font-medium text-right">Rate</th>
                {isMonth && <th className="px-4 py-3 font-medium">Invoice</th>}
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 && (
                <tr>
                  <td
                    colSpan={isMonth ? 8 : 7}
                    className="px-4 py-8 text-center text-cdy-muted"
                  >
                    No marketing clients yet
                  </td>
                </tr>
              )}
              {summaries.map((row) => (
                <ClientRow
                  key={row.marketingClientId}
                  row={row}
                  clients={clients}
                  showInvoice={isMonth}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddMarketingClientDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

function ClientRow({
  row,
  clients,
  showInvoice,
}: {
  row: MarketingAllClientsSummaryItem | MarketingPeriodSummaryItem;
  clients?: { id: string; platforms: string[] }[];
  showInvoice: boolean;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const clientPlatforms =
    clients?.find((c) => c.id === row.marketingClientId)?.platforms ?? [];
  const rateColor = deliveryRateColor(row.deliveryRate);

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await api.delete(`/marketing/clients/${row.marketingClientId}`);
      toast.success('Marketing client deleted');
      await queryClient.invalidateQueries({ queryKey: ['marketing'] });
      setDeleteOpen(false);
    } catch {
      /* interceptor handles toast */
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <tr className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50">
      <td className="px-4 py-3">
        <Link
          href={`/marketing/${row.marketingClientId}`}
          className="font-medium text-cdy-white hover:text-cdy-red hover:underline"
        >
          {row.clientName}
        </Link>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {clientPlatforms.map((p) => (
            <span
              key={p}
              className="rounded bg-cdy-navy px-1.5 py-0.5 text-xs text-cdy-muted"
            >
              {platformShort(p)}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-cdy-muted">{row.postsTarget}</td>
      <td className="px-4 py-3 text-right text-cdy-white">{row.planned}</td>
      <td className="px-4 py-3 text-right text-cdy-white">{row.published}</td>
      <td className={`px-4 py-3 text-right font-medium ${rateColor}`}>
        {row.deliveryRate}%
      </td>
      {showInvoice && 'invoice' in row && (
        <td className="px-4 py-3">
          {row.invoice ? (
            <Link
              href={`/finance/invoices/${row.invoice.id}`}
              className="font-mono text-xs text-cdy-red hover:underline"
            >
              {row.invoice.invoiceNumber}{' '}
              {row.invoice.status === 'PAID' ? '✅' : '⏳'}
            </Link>
          ) : (
            <span className="text-xs text-cdy-muted">—</span>
          )}
        </td>
      )}
      <td className="px-4 py-3">
        <PermissionGate feature="marketing.clients" action="write">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete marketing client"
            className="text-cdy-muted hover:text-cdy-red"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </PermissionGate>
      </td>
    </tr>
    <ConfirmDialog
      open={deleteOpen}
      title="Delete marketing client?"
      description={`This will permanently remove ${row.clientName} from marketing. This cannot be undone.`}
      confirmLabel="Delete"
      isLoading={deleting}
      onConfirm={() => void handleDelete()}
      onCancel={() => setDeleteOpen(false)}
    />
    </>
  );
}
