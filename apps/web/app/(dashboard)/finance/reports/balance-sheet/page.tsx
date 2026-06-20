'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useBalanceSheetReport } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { cn } from '@/lib/utils';
import type { BalanceSheetManualEntry } from '@cdy/shared';
import { FeatureReadGate } from '@/components/FeatureReadGate';
import { PermissionGate } from '@/components/PermissionGate';

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function EntryModal({
  type,
  entry,
  date,
  onClose,
  onSaved,
}: {
  type: 'ASSET' | 'LIABILITY';
  entry?: BalanceSheetManualEntry;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [label, setLabel] = useState(entry?.label ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [currency, setCurrency] = useState(entry?.currency ?? 'RWF');
  const [asOfDate, setAsOfDate] = useState(
    entry ? format(new Date(entry.asOfDate), 'yyyy-MM-dd') : date,
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      if (entry) {
        await api.patch(`/reports/balance-sheet/entries/${entry.id}`, {
          label,
          amount: parseFloat(amount),
          currency,
          asOfDate,
          notes: notes || undefined,
        });
        toast.success('Entry updated');
      } else {
        await api.post('/reports/balance-sheet/entries', {
          type,
          label,
          amount: parseFloat(amount),
          currency,
          asOfDate,
          notes: notes || undefined,
        });
        toast.success('Entry created');
      }
      onSaved();
      onClose();
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="text-lg font-semibold text-cdy-white">
          {entry ? 'Edit Entry' : `Add ${type === 'ASSET' ? 'Asset' : 'Liability'}`}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-cdy-muted">
            Label
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm text-cdy-muted">
            Amount
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Currency
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            As of date
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Notes
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={saving}
            onClick={() => void save()}
          >
            Save Entry
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BalanceSheetPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pdfLoading, setPdfLoading] = useState(false);
  const [entryModal, setEntryModal] = useState<{
    type: 'ASSET' | 'LIABILITY';
    entry?: BalanceSheetManualEntry;
  } | null>(null);

  const { data, isLoading, isError } = useBalanceSheetReport(date);

  async function handleDownloadPdf(): Promise<void> {
    setPdfLoading(true);
    try {
      await downloadReportPdf(
        '/reports/balance-sheet/pdf',
        `CDY-BalanceSheet-${date}.pdf`,
        { date },
      );
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`/reports/balance-sheet/entries/${id}`);
      toast.success('Entry deleted');
      await queryClient.invalidateQueries({ queryKey: ['reports', 'balance-sheet'] });
    } catch {
      /* interceptor */
    }
  }

  if (isLoading) return <InvoiceTableSkeleton />;
  if (isError || !data) {
    return <p className="text-cdy-muted">Failed to load balance sheet.</p>;
  }

  const prev = data.previousPeriod;
  const asOfLabel = format(new Date(data.asOf), 'MMM d, yyyy');
  const prevLabel = prev
    ? format(
        new Date(new Date(data.asOf).setFullYear(new Date(data.asOf).getFullYear() - 1)),
        'MMM d, yyyy',
      )
    : '—';

  function changeColor(current: number, previous: number | undefined): string {
    if (previous === undefined) return 'text-cdy-muted';
    const change = current - previous;
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-cdy-red';
    return 'text-cdy-muted';
  }

  return (
    <FeatureReadGate feature="finance.reports" featureName="Financial Reports">
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cdy-muted">
            <Link href="/finance/reports" className="hover:text-cdy-white">
              Reports
            </Link>{' '}
            / Balance Sheet
          </p>
          <h1 className="text-2xl font-semibold text-cdy-white">Balance Sheet</h1>
        </div>
        <Button onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-cdy-muted">As of</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
      </div>

      {prev && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 text-sm">
          <div className="grid grid-cols-4 gap-4 font-medium text-cdy-muted">
            <span />
            <span className="text-right">{asOfLabel}</span>
            <span className="text-right">{prevLabel}</span>
            <span className="text-right">Change</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-wider text-cdy-red">
            ASSETS
          </h2>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-4 items-center gap-2">
              <Link
                href="/finance/ar"
                className="col-span-2 text-cdy-muted hover:text-cdy-red"
              >
                Accounts Receivable (system)
              </Link>
              <span className="text-right text-cdy-white">
                {formatCurrency(data.assets.accountsReceivable)}
              </span>
              {prev && (
                <>
                  <span className="text-right text-cdy-muted">
                    {formatCurrency(data.assets.accountsReceivable)}
                  </span>
                  <span
                    className={cn(
                      'text-right text-xs',
                      changeColor(
                        data.assets.accountsReceivable,
                        data.assets.accountsReceivable,
                      ),
                    )}
                  >
                    —
                  </span>
                </>
              )}
            </div>

            {data.assets.manual.map((entry) => (
              <div key={entry.id} className="grid grid-cols-4 items-center gap-2">
                <span className="col-span-2 text-cdy-muted">{entry.label}</span>
                <span className="text-right text-cdy-white">
                  {formatCurrency(entry.amount)}
                </span>
                <PermissionGate feature="finance.reports" action="write">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs text-cdy-red hover:underline"
                      onClick={() =>
                        setEntryModal({ type: 'ASSET', entry })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-cdy-muted hover:underline"
                      onClick={() => void deleteEntry(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </PermissionGate>
              </div>
            ))}

            <div className="flex justify-between border-t border-cdy-navy-border pt-3 font-semibold">
              <span className="text-cdy-white">TOTAL ASSETS</span>
              <span className="text-cdy-white">
                {formatCurrency(data.assets.totalAssets)}
              </span>
            </div>
            <PermissionGate feature="finance.reports" action="write">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEntryModal({ type: 'ASSET' })}
              >
                + Add Asset
              </Button>
            </PermissionGate>
          </div>
        </div>

        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-wider text-cdy-red">
            LIABILITIES
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <Link href="/finance/bills" className="text-cdy-muted hover:text-cdy-red">
                Accounts Payable (system)
              </Link>
              <span className="text-cdy-white">
                {formatCurrency(data.liabilities.accountsPayable)}
              </span>
            </div>

            {data.liabilities.manual.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between">
                <span className="text-cdy-muted">{entry.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-cdy-white">
                    {formatCurrency(entry.amount)}
                  </span>
                  <PermissionGate feature="finance.reports" action="write">
                    <button
                      type="button"
                      className="text-xs text-cdy-red hover:underline"
                      onClick={() =>
                        setEntryModal({ type: 'LIABILITY', entry })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-cdy-muted hover:underline"
                      onClick={() => void deleteEntry(entry.id)}
                    >
                      Delete
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}

            <div className="flex justify-between border-t border-cdy-navy-border pt-3 font-semibold">
              <span className="text-cdy-white">TOTAL LIABILITIES</span>
              <span className="text-cdy-white">
                {formatCurrency(data.liabilities.totalLiabilities)}
              </span>
            </div>
            {prev && (
              <p className="text-xs text-cdy-muted">
                YoY change:{' '}
                <span
                  className={changeColor(
                    data.liabilities.totalLiabilities,
                    prev.totalLiabilities,
                  )}
                >
                  {pctChange(
                    data.liabilities.totalLiabilities,
                    prev.totalLiabilities,
                  )}
                </span>
              </p>
            )}
            <PermissionGate feature="finance.reports" action="write">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEntryModal({ type: 'LIABILITY' })}
              >
                + Add Liability
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'rounded-lg p-6 text-center',
          data.equity >= 0 ? 'bg-cdy-navy' : 'bg-cdy-red-light',
        )}
      >
        <p className="text-sm text-cdy-muted">NET EQUITY (Assets − Liabilities)</p>
        <p
          className={cn(
            'mt-2 text-3xl font-bold',
            data.equity >= 0 ? 'text-green-400' : 'text-cdy-red',
          )}
        >
          {formatCurrency(data.equity)}
        </p>
        {prev && (
          <p className="mt-2 text-sm text-cdy-muted">
            vs prior year:{' '}
            <span className={changeColor(data.equity, prev.equity)}>
              {pctChange(data.equity, prev.equity)}
            </span>
          </p>
        )}
      </div>

      {entryModal && (
        <EntryModal
          type={entryModal.type}
          entry={entryModal.entry}
          date={date}
          onClose={() => setEntryModal(null)}
          onSaved={() =>
            void queryClient.invalidateQueries({
              queryKey: ['reports', 'balance-sheet'],
            })
          }
        />
      )}
    </div>
    </FeatureReadGate>
  );
}
