'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAllMarketingSummary, useMarketingClients } from '@/hooks/useMarketing';
import { AddMarketingClientDrawer } from '@/components/marketing/AddMarketingClientDrawer';
import { Button } from '@/components/ui/button';
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
import type { MarketingAllClientsSummaryItem } from '@cdy/shared';

export default function MarketingOverviewPage(): JSX.Element {
  const [month, setMonth] = useState(currentMonth());
  const [addOpen, setAddOpen] = useState(false);

  const { data: summaries, isLoading, isError } = useAllMarketingSummary(month);
  const { data: clients } = useMarketingClients();

  const totalPlanned = summaries?.reduce((s, c) => s + c.planned, 0) ?? 0;
  const totalPublished = summaries?.reduce((s, c) => s + c.published, 0) ?? 0;
  const totalPending = summaries?.reduce((s, c) => s + c.pending, 0) ?? 0;
  const activeCount = clients?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">Marketing</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-3 py-1.5">
            <button
              type="button"
              onClick={() => setMonth(prevMonth(month))}
              className="text-cdy-muted hover:text-cdy-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-32 text-center text-sm text-cdy-white">
              {formatMonth(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth(nextMonth(month))}
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
                <th className="px-4 py-3 font-medium text-right">Target</th>
                <th className="px-4 py-3 font-medium text-right">Planned</th>
                <th className="px-4 py-3 font-medium text-right">Published</th>
                <th className="px-4 py-3 font-medium text-right">Rate</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
}: {
  row: MarketingAllClientsSummaryItem;
  clients?: { id: string; platforms: string[] }[];
}): JSX.Element {
  const clientPlatforms =
    clients?.find((c) => c.id === row.marketingClientId)?.platforms ?? [];
  const rateColor = deliveryRateColor(row.deliveryRate);

  return (
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
    </tr>
  );
}
