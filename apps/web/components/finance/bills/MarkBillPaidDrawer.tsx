'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X, Loader2, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { ApiResponse, BillRecord } from '@cdy/shared';
import { PaymentMethod } from '@cdy/shared';
import type { AxiosError } from 'axios';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.MTN_MOMO, label: 'MTN MoMo' },
  { value: PaymentMethod.AIRTEL_MONEY, label: 'Airtel Money' },
  { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.CARD, label: 'Card' },
  { value: PaymentMethod.OTHER, label: 'Other' },
];

interface MarkBillPaidDrawerProps {
  open: boolean;
  onClose: () => void;
  bill: BillRecord;
}

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function MarkBillPaidDrawer({
  open,
  onClose,
  bill,
}: MarkBillPaidDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [paidAt, setPaidAt] = useState(todayString());
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setPaidAt(todayString());
      setMethod(PaymentMethod.BANK_TRANSFER);
      setReference('');
      setNotes('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<BillRecord>>(`/bills/${bill.id}/pay`, {
        paidAt,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      toast.success(`Bill for ${bill.vendorName} marked as paid`);
      await queryClient.invalidateQueries({ queryKey: ['bills'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to mark bill as paid');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-cdy-white">Mark as Paid</h2>
            <p className="text-sm text-cdy-muted">{bill.vendorName} — {bill.category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-cdy-muted hover:text-cdy-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <div className="flex gap-2 text-sm text-blue-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  An expense record of{' '}
                  <strong>{formatCurrency(bill.amount, bill.currency)}</strong> will be automatically
                  created in the Expenses ledger.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mbp-paid-at">Payment Date</Label>
              <Input
                id="mbp-paid-at"
                type="date"
                value={paidAt}
                max={todayString()}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mbp-method">Payment Method</Label>
              <select
                id="mbp-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {PAYMENT_METHODS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mbp-reference">Reference (optional)</Label>
              <Input
                id="mbp-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TXN-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mbp-notes">Notes (optional)</Label>
              <textarea
                id="mbp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none"
                placeholder="Payment notes..."
              />
            </div>
          </div>

          <div className="border-t border-cdy-navy-border p-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
