'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useTodaysContent } from '@/hooks/useMarketing';
import { ContentItemSlideOver } from '@/components/marketing/ContentItemSlideOver';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { STATUS_CONFIG, platformShort } from '@/lib/marketingUtils';
import type { GlobalContentItemRecord } from '@cdy/shared';

export default function TodaysContentPage(): JSX.Element {
  const { data, isLoading } = useTodaysContent();
  const [selected, setSelected] = useState<GlobalContentItemRecord | null>(null);

  const groupedByClient = useMemo(() => {
    const groups = new Map<string, GlobalContentItemRecord[]>();
    for (const item of data?.items ?? []) {
      const list = groups.get(item.clientName) ?? [];
      list.push(item);
      groups.set(item.clientName, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/marketing" className="hover:text-cdy-white">
          Marketing
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Today</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold text-cdy-white">Today&apos;s Content</h1>
        <p className="mt-1 text-sm text-cdy-muted">
          {data ? format(new Date(data.date), 'EEEE, MMMM d, yyyy') : '…'} — every client with
          something scheduled today, in one place.
        </p>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {!isLoading && groupedByClient.length === 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-8 text-center">
          <p className="text-sm text-cdy-muted">Nothing scheduled for today.</p>
        </div>
      )}

      {!isLoading && groupedByClient.length > 0 && (
        <div className="space-y-4">
          {groupedByClient.map(([clientName, items]) => (
            <div
              key={clientName}
              className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light"
            >
              <div className="flex items-center justify-between border-b border-cdy-navy-border px-4 py-3">
                <h2 className="font-medium text-cdy-white">{clientName}</h2>
                <span className="text-xs text-cdy-muted">
                  {items.length} post{items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="divide-y divide-cdy-navy-border">
                {items.map((item) => {
                  const cfg = STATUS_CONFIG[item.status];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cdy-navy/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 rounded-full border border-cdy-navy-border px-2 py-0.5 text-xs text-cdy-muted">
                          {platformShort(item.platform)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-cdy-white">
                            {item.title}
                          </p>
                          <p className="text-xs capitalize text-cdy-muted">
                            {item.contentType.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ContentItemSlideOver
          item={selected}
          clientId={selected.marketingClientId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
