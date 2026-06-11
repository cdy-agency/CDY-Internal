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
import { formatCurrency } from '@/lib/utils';
import type { ApiResponse, RetainerRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface AmendRetainerModalProps {
  open: boolean;
  onClose: () => void;
  retainer: RetainerRecord;
}

export function AmendRetainerModal({
  open,
  onClose,
  retainer,
}: AmendRetainerModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(retainer.amount));
  const [serviceName, setServiceName] = useState(retainer.serviceName);

  useEffect(() => {
    if (open) {
      setAmount(String(retainer.amount));
      setServiceName(retainer.serviceName);
    }
  }, [open, retainer]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch<ApiResponse<RetainerRecord>>(`/retainers/${retainer.id}`, {
        amount: parseFloat(amount),
        serviceName,
      });
      toast.success('Retainer amended');
      await queryClient.invalidateQueries({ queryKey: ['retainers'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to amend retainer');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cdy-white">Amend Retainer</h2>
            <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white"><X className="h-5 w-5" /></button>
          </div>
          <p className="mb-4 text-sm text-cdy-muted">
            {retainer.clientId} / {retainer.serviceName}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-cdy-muted">
              Current amount: {formatCurrency(retainer.amount, retainer.currency)}/month
            </p>
            <div className="space-y-2">
              <Label>New amount</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Service name</Label>
              <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
            </div>
            <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">
              Effective from next billing cycle ({format(new Date(retainer.nextBillingDate), 'MMM d, yyyy')}).
              Past invoices are unaffected.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Amendment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
