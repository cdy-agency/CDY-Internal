'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { ApiResponse, InvoiceDetail } from '@cdy/shared';
import { WriteOffCategory } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface WriteOffModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
}

const CATEGORY_OPTIONS: { value: WriteOffCategory; label: string }[] = [
  { value: WriteOffCategory.CLIENT_DISPUTE, label: 'Client Dispute' },
  { value: WriteOffCategory.CLIENT_INSOLVENT, label: 'Client Insolvent' },
  { value: WriteOffCategory.AGREED_WRITE_OFF, label: 'Agreed Write Off' },
  { value: WriteOffCategory.UNCOLLECTABLE, label: 'Uncollectable' },
  { value: WriteOffCategory.OTHER, label: 'Other' },
];

export function WriteOffModal({
  open,
  onClose,
  invoice,
}: WriteOffModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<WriteOffCategory>(
    WriteOffCategory.CLIENT_DISPUTE,
  );
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setCategory(WriteOffCategory.CLIENT_DISPUTE);
      setReason('');
    }
  }, [open]);

  const fmt = (n: number): string => formatCurrency(n, invoice.currency);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason for the write-off');
      return;
    }

    setLoading(true);
    try {
      await api.post<ApiResponse<unknown>>(`/invoices/${invoice.id}/write-off`, {
        reason: reason.trim(),
        category,
      });
      toast.success(`Invoice ${invoice.invoiceNumber} written off`);
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['ar'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to write off invoice');
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
          className="w-full max-w-[480px] rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="write-off-title"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2
              id="write-off-title"
              className="text-lg font-semibold text-cdy-white"
            >
              Write Off Invoice
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
            Are you sure you want to write off this invoice? This action is
            irreversible. The invoice will be removed from your AR balance and
            recorded as a bad debt expense.
          </p>

          <div className="mb-5 space-y-1 rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-4 text-sm">
            <div className="flex justify-between text-cdy-muted">
              <span>Invoice:</span>
              <span className="font-mono text-cdy-white">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-cdy-muted">Amount:</span>
              <span className="text-cdy-white">{fmt(invoice.total)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="writeOffCategory">Category</Label>
              <select
                id="writeOffCategory"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as WriteOffCategory)
                }
                className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-2 focus:ring-cdy-red"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="writeOffReason">Reason</Label>
              <Input
                id="writeOffReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this invoice is being written off"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-cdy-red hover:bg-cdy-red/90"
                disabled={loading || !reason.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Write Off Invoice'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
