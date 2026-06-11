'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiResponse, BillRecord } from '@cdy/shared';
import { PaymentMethod } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface BillPayModalProps {
  open: boolean;
  onClose: () => void;
  bill: BillRecord;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.CARD, label: 'Card' },
];

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function BillPayModal({
  open,
  onClose,
  bill,
}: BillPayModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [paidAt, setPaidAt] = useState(todayString());
  const [method, setMethod] = useState<PaymentMethod>(
    PaymentMethod.BANK_TRANSFER,
  );
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (open) {
      setPaidAt(todayString());
      setMethod(PaymentMethod.BANK_TRANSFER);
      setReference('');
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
      });
      toast.success(`Bill for ${bill.vendorName} marked as paid`);
      await queryClient.invalidateQueries({ queryKey: ['bills'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
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
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
        role="presentation"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-[400px] rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cdy-white">
              Mark as Paid
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

          <p className="mb-4 text-sm text-cdy-muted">
            {bill.vendorName} — {bill.category}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paidAt">Payment Date</Label>
              <Input
                id="paidAt"
                type="date"
                value={paidAt}
                max={todayString()}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                {PAYMENT_METHODS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TXN-12345"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
