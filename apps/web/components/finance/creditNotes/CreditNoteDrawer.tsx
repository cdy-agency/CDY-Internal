'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { ApiResponse, CreditNoteRecord, InvoiceDetail } from '@cdy/shared';
import { CreditNoteReason, CreditNoteStatus, InvoiceStatus } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface CreditNoteDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
}

const REASON_OPTIONS: { value: CreditNoteReason; label: string }[] = [
  { value: CreditNoteReason.OVERCHARGE, label: 'Overcharge' },
  {
    value: CreditNoteReason.SERVICE_NOT_DELIVERED,
    label: 'Service not delivered',
  },
  { value: CreditNoteReason.DISCOUNT_AGREED, label: 'Discount agreed' },
  { value: CreditNoteReason.REFUND_APPROVED, label: 'Refund approved' },
  { value: CreditNoteReason.OTHER, label: 'Other' },
];

export function CreditNoteDrawer({
  open,
  onClose,
  invoice,
}: CreditNoteDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<CreditNoteReason>(
    CreditNoteReason.OVERCHARGE,
  );
  const [description, setDescription] = useState('');

  const existingCreditTotal = useMemo(() => {
    return invoice.creditNotes
      .filter((cn) => cn.status !== CreditNoteStatus.VOID)
      .reduce((sum, cn) => sum + cn.amount, 0);
  }, [invoice.creditNotes]);

  const maxCredit = invoice.total - existingCreditTotal;
  const parsedAmount = parseFloat(amount) || 0;
  const isPaid = invoice.status === InvoiceStatus.PAID;
  const remainingAfterCredit = invoice.total - existingCreditTotal - parsedAmount;

  useEffect(() => {
    if (open) {
      setAmount('');
      setReason(CreditNoteReason.OVERCHARGE);
      setDescription('');
    }
  }, [open]);

  const fmt = (n: number): string => formatCurrency(n, invoice.currency);

  function validateAmount(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return 'Amount must be greater than zero';
    }
    if (num > maxCredit + 0.001) {
      return `Maximum creditable: ${fmt(maxCredit)}`;
    }
    return '';
  }

  const amountError = amount ? validateAmount(amount) : '';

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    const error = validateAmount(amount);
    if (error) {
      toast.error(error);
      return;
    }

    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<ApiResponse<CreditNoteRecord>>(
        `/invoices/${invoice.id}/credit-notes`,
        {
          amount: parsedAmount,
          reason,
          description: description.trim(),
        },
      );
      toast.success(
        `Credit note ${response.data.data.creditNoteNumber} issued`,
      );
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosErr.response?.data?.message ?? 'Failed to issue credit note',
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
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border p-6">
          <h2 className="text-lg font-semibold text-cdy-white">
            Raise Credit Note
          </h2>
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
          <div className="space-y-2">
            <Label htmlFor="cnAmount">Credit amount</Label>
            <Input
              id="cnAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxCredit}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {amountError && (
              <p className="text-xs text-[var(--cdy-danger)]">{amountError}</p>
            )}
            <p className="text-xs text-cdy-muted">
              Max creditable: {fmt(maxCredit)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnReason">Reason</Label>
            <select
              id="cnReason"
              value={reason}
              onChange={(e) => setReason(e.target.value as CreditNoteReason)}
              className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-2 focus:ring-cdy-red"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnDescription">Description</Label>
            <textarea
              id="cnDescription"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-2 focus:ring-cdy-red"
              placeholder="Explain the credit..."
              required
            />
          </div>

          {parsedAmount > 0 && !amountError && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                isPaid
                  ? 'border-amber-500/30 bg-amber-950/30 text-amber-200'
                  : 'border-cdy-navy-border bg-cdy-navy/50 text-cdy-muted'
              }`}
            >
              {isPaid ? (
                <>
                  <p className="font-medium text-amber-300">
                    This invoice has already been paid in full.
                  </p>
                  <p className="mt-1">
                    Issuing this credit note will create a refund obligation of{' '}
                    {fmt(parsedAmount)} which will appear as a bill in Accounts
                    Payable.
                  </p>
                </>
              ) : (
                <p>
                  This credit note will reduce the client&apos;s outstanding
                  balance by {fmt(parsedAmount)}. The remaining balance will
                  be {fmt(Math.max(0, remainingAfterCredit))}.
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              Boolean(amountError) ||
              !amount ||
              !description.trim()
            }
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Issue Credit Note'
            )}
          </Button>
        </form>
      </div>
    </>
  );
}
