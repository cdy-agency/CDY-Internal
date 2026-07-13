'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { useGlobalContentCalendar } from '@/hooks/useMarketing';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import {
  currentMonth,
  formatMonth,
  prevMonth,
  nextMonth,
  platformShort,
  STATUS_CONFIG,
} from '@/lib/marketingUtils';
import type { GlobalContentItemRecord } from '@cdy/shared';

export default function GlobalContentCalendarPage(): JSX.Element {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const { data: calendar, isLoading } = useGlobalContentCalendar(month);

  function goToClient(item: GlobalContentItemRecord): void {
    router.push(`/marketing/${item.marketingClientId}`);
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/marketing" className="hover:text-cdy-white">
          Marketing
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Content Calendar</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cdy-white">Content Calendar</h1>
          <p className="mt-1 text-sm text-cdy-muted">
            Every client&apos;s scheduled content in one place. Click a post to open its client.
          </p>
        </div>
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
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {!isLoading && calendar && (
        <GlobalCalendarGrid
          month={month}
          byDate={calendar.byDate}
          onItemClick={goToClient}
        />
      )}
    </div>
  );
}

function GlobalCalendarGrid({
  month,
  byDate,
  onItemClick,
}: {
  month: string;
  byDate: Record<string, GlobalContentItemRecord[]>;
  onItemClick: (item: GlobalContentItemRecord) => void;
}): JSX.Element {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = getDaysInMonth(new Date(year, mon - 1, 1));
  const firstDayOfWeek = getDay(startOfMonth(new Date(year, mon - 1, 1)));
  const offset = (firstDayOfWeek + 6) % 7;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-lg border border-cdy-navy-border overflow-hidden">
      <div className="grid grid-cols-7 bg-cdy-navy-light border-b border-cdy-navy-border">
        {DAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-cdy-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-cdy-navy-border">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="min-h-24 bg-cdy-navy/30 p-1" />;
          }
          const dateKey = `${month}-${String(day).padStart(2, '0')}`;
          const items = byDate[dateKey] ?? [];
          return (
            <div key={dateKey} className="min-h-24 bg-cdy-navy p-1">
              <span className="text-xs text-cdy-muted">{day}</span>
              <div className="mt-1 space-y-0.5">
                {items.map((item) => {
                  const cfg = STATUS_CONFIG[item.status];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium ${cfg.bg} ${cfg.color} hover:opacity-80 transition-opacity`}
                      title={`${item.clientName} — ${item.title}`}
                    >
                      {platformShort(item.platform)} {item.clientName}
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
