'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { invoiceRemainingBalance } from '@/lib/invoice-balance';
import type { ApiResponse, InvoiceDetail, PaymentPlanRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface InstalmentFormRow {
  id: string;
  amount: string;
  dueDate: string;
}

interface PaymentPlanDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
}

function newRow(): InstalmentFormRow {
  return {
    id: crypto.randomUUID(),
    amount: '',
    dueDate: '',
  };
}

function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function PaymentPlanDrawer({
  open,
  onClose,
  invoice,
}: PaymentPlanDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [instalments, setInstalments] = useState<InstalmentFormRow[]>([
    newRow(),
    newRow(),
  ]);

  const remaining = invoiceRemainingBalance({
    total: invoice.total,
    payments: invoice.payments,
    creditNotes: invoice.creditNotes,
  });

  const instalmentTotal = useMemo(() => {
    return instalments.reduce((s, row) => s + (parseFloat(row.amount) || 0), 0);
  }, [instalments]);

  const difference = remaining - instalmentTotal;
  const totalsMatch = Math.abs(difference) < 0.01;

  const allDatesFuture = instalments.every((row) => {
    if (!row.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(row.dueDate) > today;
  });

  const canSubmit =
    instalments.length >= 2 &&
    instalments.length <= 12 &&
    totalsMatch &&
    allDatesFuture &&
    instalments.every((row) => parseFloat(row.amount) > 0 && row.dueDate);

  useEffect(() => {
    if (open) {
      setInstalments([newRow(), newRow()]);
    }
  }, [open]);

  const fmt = (n: number): string => formatCurrency(n, invoice.currency);

  function updateRow(
    id: string,
    field: 'amount' | 'dueDate',
    value: string,
  ): void {
    setInstalments((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function addInstalment(): void {
    if (instalments.length >= 12) return;
    setInstalments((rows) => [...rows, newRow()]);
  }

  function removeInstalment(id: string): void {
    if (instalments.length <= 2) return;
    setInstalments((rows) => rows.filter((row) => row.id !== id));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      await api.post<ApiResponse<PaymentPlanRecord>>(
        `/invoices/${invoice.id}/payment-plan`,
        {
          instalments: instalments.map((row) => ({
            amount: parseFloat(row.amount),
            dueDate: row.dueDate,
          })),
        },
      );
      toast.success('Payment plan created');
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosErr.response?.data?.message ?? 'Failed to create payment plan',
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
        role="presentation"
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border p-6">
          <div>
            <h2 className="text-lg font-semibold text-cdy-white">
              Payment Plan
            </h2>
            <p className="text-sm text-cdy-muted">
              Invoice {invoice.invoiceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-sm text-cdy-muted">
            Remaining balance:{' '}
            <span className="font-medium text-cdy-red">{fmt(remaining)}</span>
          </p>

          <div className="space-y-3">
            <Label>Instalments</Label>
            {instalments.map((row, index) => (
              <div
                key={row.id}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-cdy-navy-border bg-cdy-navy/30 p-3"
              >
                <span className="w-6 text-sm text-cdy-muted">#{index + 1}</span>
                <div className="min-w-[100px] flex-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={row.amount}
                    onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                    required
                  />
                </div>
                <div className="min-w-[140px] flex-1">
                  <Label className="text-xs">Due date</Label>
                  <Input
                    type="date"
                    min={tomorrowString()}
                    value={row.dueDate}
                    onChange={(e) => updateRow(row.id, 'dueDate', e.target.value)}
                    required
                  />
                </div>
                {instalments.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeInstalment(row.id)}
                    className="rounded p-2 text-cdy-muted hover:text-cdy-red"
                    aria-label="Remove instalment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {instalments.length < 12 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInstalment}
            >
              <Plus className="h-4 w-4" />
              Add instalment
            </Button>
          )}

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-4 text-sm">
            <div className="flex justify-between text-cdy-muted">
              <span>Total entered:</span>
              <span
                className={
                  totalsMatch ? 'text-[var(--cdy-success)]' : 'text-cdy-white'
                }
              >
                {fmt(instalmentTotal)} {totalsMatch ? '✓' : ''}
              </span>
            </div>
            <div className="flex justify-between text-cdy-muted">
              <span>Difference:</span>
              <span
                className={
                  totalsMatch ? 'text-[var(--cdy-success)]' : 'text-cdy-red'
                }
              >
                {fmt(Math.abs(difference))}
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Payment Plan'
            )}
          </Button>
        </form>
      </div>
    </>
  );
}
