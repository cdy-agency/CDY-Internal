'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List, Download, Loader2 } from 'lucide-react';
import {
  useMarketingClient,
  useContentCalendar,
  useContentItems,
  useMarketingMonthlySummary,
  useUpdateContentStatus,
} from '@/hooks/useMarketing';
import { downloadClientCalendarPdf } from '@/lib/marketingCalendarPdf';
import { AddContentDrawer } from '@/components/marketing/AddContentDrawer';
import { ContentItemSlideOver } from '@/components/marketing/ContentItemSlideOver';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import {
  currentMonth,
  formatMonth,
  prevMonth,
  nextMonth,
  deliveryRateColor,
  platformShort,
  STATUS_CONFIG,
  ALLOWED_TRANSITIONS,
  STATUS_ACTION_LABELS,
} from '@/lib/marketingUtils';
import { formatCurrency } from '@/lib/utils';
import type { ContentItemRecord } from '@cdy/shared';
import { ContentStatus } from '@cdy/shared';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

type ViewMode = 'calendar' | 'list';

export default function ClientCalendarPage(): JSX.Element {
  const params = useParams();
  const clientId = params.id as string;

  const [month, setMonth] = useState(currentMonth());
  const [view, setView] = useState<ViewMode>('calendar');
  const [addOpen, setAddOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [slideOver, setSlideOver] = useState<ContentItemRecord | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: mc, isLoading: mcLoading } = useMarketingClient(clientId);
  const { data: calendar, isLoading: calendarLoading } = useContentCalendar(clientId, month);
  const { data: listItems, isLoading: listLoading } = useContentItems(clientId, month);
  const { data: summary, isLoading: summaryLoading } = useMarketingMonthlySummary(clientId, month);

  const isLoading = mcLoading || (view === 'calendar' ? calendarLoading : listLoading);

  function openAdd(date?: string): void {
    setPrefillDate(date);
    setAddOpen(true);
  }

  async function handleDownload(): Promise<void> {
    if (!mc) return;
    setDownloading(true);
    try {
      await downloadClientCalendarPdf(clientId, mc.client?.companyName ?? 'Client');
    } catch {
      toast.error('Failed to generate calendar PDF');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-cdy-muted">
        <Link href="/marketing" className="hover:text-cdy-white">
          Marketing
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">{mc?.client?.companyName ?? '…'}</span>
      </nav>

      {/* Header */}
      {mc && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-cdy-white">
                {mc.client?.companyName ?? '…'}
              </h1>
              <p className="mt-1 text-sm text-cdy-muted">
                Platforms:{' '}
                {mc.platforms
                  .map(platformShort)
                  .join(' · ')} · Target: {mc.postsPerMonth} posts/month
              </p>
              {summary && (
                <p className="mt-1 text-sm text-cdy-muted">
                  {formatMonth(month)}: {summary.published}/{summary.planned} published ·{' '}
                  <span className={deliveryRateColor(summary.deliveryRate)}>
                    {summary.deliveryRate}% delivery
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={downloading} onClick={() => void handleDownload()}>
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Calendar
              </Button>
              <PermissionGate feature="marketing.content" action="write">
                <Button onClick={() => openAdd()}>
                  <Plus className="h-4 w-4" />
                  Add Content
                </Button>
              </PermissionGate>
            </div>
          </div>
        </div>
      )}

      {/* Month selector + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-3 py-1.5">
          <button
            type="button"
            onClick={() => setMonth(prevMonth(month))}
            className="text-cdy-muted hover:text-cdy-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm text-cdy-white">
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

        <div className="flex rounded-lg border border-cdy-navy-border overflow-hidden">
          {(['calendar', 'list'] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-cdy-red text-white'
                  : 'bg-cdy-navy-light text-cdy-muted hover:text-cdy-white'
              }`}
            >
              {v === 'calendar' ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {/* Calendar view */}
      {!isLoading && view === 'calendar' && calendar && mc && (
        <CalendarGrid
          month={month}
          byDate={calendar.byDate}
          onDayClick={openAdd}
          onItemClick={setSlideOver}
        />
      )}

      {/* List view */}
      {!isLoading && view === 'list' && listItems && mc && (
        <ListView
          items={listItems}
          clientId={clientId}
          onItemClick={setSlideOver}
        />
      )}

      {/* Monthly summary */}
      {!summaryLoading && summary && (
        <MonthlySummaryCard summary={summary} month={month} />
      )}

      {/* Drawers */}
      {mc && (
        <AddContentDrawer
          open={addOpen}
          clientId={clientId}
          allowedPlatforms={mc.platforms}
          prefillDate={prefillDate}
          onClose={() => {
            setAddOpen(false);
            setPrefillDate(undefined);
          }}
        />
      )}

      {slideOver && (
        <ContentItemSlideOver
          item={slideOver}
          clientId={clientId}
          onClose={() => setSlideOver(null)}
        />
      )}
    </div>
  );
}

/* ─── Calendar Grid ─────────────────────────────────────────── */

function CalendarGrid({
  month,
  byDate,
  onDayClick,
  onItemClick,
}: {
  month: string;
  byDate: Record<string, ContentItemRecord[]>;
  onDayClick: (date: string) => void;
  onItemClick: (item: ContentItemRecord) => void;
}): JSX.Element {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = getDaysInMonth(new Date(year, mon - 1, 1));
  const firstDayOfWeek = getDay(startOfMonth(new Date(year, mon - 1, 1)));
  // Monday first: shift so Mon=0
  const offset = (firstDayOfWeek + 6) % 7;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-lg border border-cdy-navy-border overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-cdy-navy-light border-b border-cdy-navy-border">
        {DAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium text-cdy-muted"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="grid grid-cols-7 divide-x divide-y divide-cdy-navy-border">
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-20 bg-cdy-navy/30 p-1"
              />
            );
          }
          const dateKey = `${month}-${String(day).padStart(2, '0')}`;
          const items = byDate[dateKey] ?? [];
          return (
            <div key={dateKey} className="min-h-20 bg-cdy-navy p-1 group relative">
              <div className="flex items-center justify-between">
                <span className="text-xs text-cdy-muted">{day}</span>
                <PermissionGate feature="marketing.content" action="write">
                  <button
                    type="button"
                    onClick={() => onDayClick(dateKey)}
                    className="hidden group-hover:block text-cdy-muted hover:text-cdy-white"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </PermissionGate>
              </div>
              <div className="mt-1 space-y-0.5">
                {items.map((item) => {
                  const cfg = STATUS_CONFIG[item.status];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium ${cfg.bg} ${cfg.color} hover:opacity-80 transition-opacity`}
                      title={item.title}
                    >
                      {platformShort(item.platform)} {item.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── List View ─────────────────────────────────────────────── */

function ListView({
  items,
  clientId,
  onItemClick,
}: {
  items: ContentItemRecord[];
  clientId: string;
  onItemClick: (item: ContentItemRecord) => void;
}): JSX.Element {
  const { mutateAsync, isPending } = useUpdateContentStatus(clientId);

  async function handleStatus(itemId: string, status: ContentStatus): Promise<void> {
    try {
      await mutateAsync({ itemId, status });
      toast.success('Status updated');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to update');
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-cdy-muted">
        No content scheduled this month.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Platform</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const nextStatuses = ALLOWED_TRANSITIONS[item.status];
            return (
              <tr
                key={item.id}
                className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50"
              >
                <td className="px-4 py-3 text-cdy-muted">
                  {format(new Date(item.scheduledDate), 'MMM d')}
                </td>
                <td className="px-4 py-3 capitalize text-cdy-muted">
                  {item.platform}
                </td>
                <td className="px-4 py-3 text-cdy-muted">{item.contentType}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onItemClick(item)}
                    className="text-left text-cdy-white hover:text-cdy-red hover:underline"
                  >
                    {item.title}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PermissionGate feature="marketing.content" action="write">
                    <div className="flex flex-wrap gap-1">
                      {nextStatuses.slice(0, 2).map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={isPending}
                          onClick={() => void handleStatus(item.id, s)}
                          className="rounded border border-cdy-navy-border px-2 py-0.5 text-xs text-cdy-muted hover:border-cdy-red hover:text-cdy-red disabled:opacity-50 transition-colors"
                        >
                          {STATUS_ACTION_LABELS[s] ?? STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </PermissionGate>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Monthly Summary Card ───────────────────────────────────── */

function MonthlySummaryCard({
  summary,
  month,
}: {
  summary: ReturnType<typeof useMarketingMonthlySummary>['data'];
  month: string;
}): JSX.Element | null {
  if (!summary) return null;

  const platforms = Object.entries(summary.byPlatform);

  return (
    <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 space-y-5">
      <h2 className="text-base font-semibold text-cdy-white">
        {formatMonth(month)} Summary
      </h2>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm lg:grid-cols-4">
        {[
          { label: 'Posts target', value: summary.postsTarget },
          { label: 'Published', value: summary.published },
          { label: 'Approved', value: summary.approved },
          { label: 'Pending review', value: summary.pending },
          { label: 'Rejected', value: summary.rejected },
          {
            label: 'Delivery rate',
            value: `${summary.deliveryRate}%`,
            className: deliveryRateColor(summary.deliveryRate),
          },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xs text-cdy-muted">{item.label}</p>
            <p className={`mt-0.5 font-semibold text-cdy-white ${item.className ?? ''}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-cdy-muted">
          <span>Published</span>
          <span>
            {summary.published} / {summary.postsTarget}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
          <div
            className={`h-full rounded-full transition-all ${
              summary.deliveryRate >= 90
                ? 'bg-green-500'
                : summary.deliveryRate >= 70
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{
              width: `${Math.min(
                summary.postsTarget > 0
                  ? (summary.published / summary.postsTarget) * 100
                  : 0,
                100,
              )}%`,
            }}
          />
        </div>
      </div>

      {/* By platform */}
      {platforms.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-cdy-muted">
            By platform
          </p>
          <div className="space-y-2">
            {platforms.map(([platform, stats]) => (
              <div key={platform}>
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="capitalize text-cdy-muted">{platform}</span>
                  <span className="text-cdy-white">
                    {stats.planned} planned · {stats.published} published
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                  <div
                    className="h-full rounded-full bg-cdy-red"
                    style={{
                      width: `${stats.planned > 0 ? (stats.published / stats.planned) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice */}
      {summary.invoice ? (
        <div className="flex items-center gap-4 rounded-md border border-cdy-navy-border bg-cdy-navy px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-cdy-muted">Invoice</p>
            <Link
              href={`/finance/invoices/${summary.invoice.id}`}
              className="font-mono text-cdy-red hover:underline"
            >
              {summary.invoice.invoiceNumber}
            </Link>
          </div>
          <div>
            <p className="text-xs text-cdy-muted">Amount</p>
            <p className="text-cdy-white">
              {formatCurrency(summary.invoice.total, summary.invoice.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-cdy-muted">Status</p>
            <span
              className={`text-xs font-medium ${
                summary.invoice.status === 'PAID'
                  ? 'text-green-400'
                  : 'text-amber-400'
              }`}
            >
              {summary.invoice.status === 'PAID' ? '✅ PAID' : '⏳ ' + summary.invoice.status}
            </span>
          </div>
          <Link
            href={`/finance/invoices/${summary.invoice.id}`}
            className="ml-auto text-xs text-cdy-red hover:underline"
          >
            View →
          </Link>
        </div>
      ) : (
        <p className="rounded-md border border-cdy-navy-border bg-cdy-navy px-4 py-3 text-sm text-cdy-muted">
          No retainer linked.{' '}
          <Link href="/finance/invoices" className="text-cdy-red hover:underline">
            Log income manually in Finance →
          </Link>
        </p>
      )}
    </div>
  );
}
