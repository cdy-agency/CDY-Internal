'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RetainerRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface StartRetainerModalProps {
  open: boolean;
  onClose: () => void;
  retainer: RetainerRecord;
}

export function StartRetainerModal({
  open,
  onClose,
  retainer,
}: StartRetainerModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setNewEndDate(retainer.endDate ? retainer.endDate.split('T')[0]! : '');
      setNewAmount(String(retainer.amount));
      setReason('');
      setNotes(retainer.notes ?? '');
    }
  }, [open, retainer]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/retainers/${retainer.id}/start`, {
        newEndDate: newEndDate || undefined,
        newAmount: newAmount ? parseFloat(newAmount) : undefined,
        reason: reason || undefined,
        notes: notes || undefined,
      });
      toast.success('Retainer started');
      await queryClient.invalidateQueries({ queryKey: ['retainers'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to start retainer');
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
            <h2 className="text-lg font-semibold text-cdy-white">Start Retainer</h2>
            <p className="text-sm text-cdy-muted">{retainer.serviceName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-cdy-muted hover:text-cdy-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-3 text-sm text-cdy-muted">
              Start #{(retainer.extensionCount ?? 0) + 1} · Current amount:{' '}
              <span className="text-cdy-white">
                {retainer.currency} {retainer.amount.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="er-end-date">New End Date</Label>
              <Input
                id="er-end-date"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
              <p className="text-xs text-cdy-muted">Leave blank to keep current end date</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="er-amount">New Monthly Amount ({retainer.currency})</Label>
              <Input
                id="er-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="er-reason">Reason (optional)</Label>
              <Input
                id="er-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Client renewal, scope expansion"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="er-notes">Contract Notes (optional)</Label>
              <textarea
                id="er-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none"
                placeholder="Internal notes about this contract..."
              />
            </div>
          </div>

          <div className="border-t border-cdy-navy-border p-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Extend Contract'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
    