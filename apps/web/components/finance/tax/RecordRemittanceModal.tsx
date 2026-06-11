'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiResponse, TaxPaymentRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface RecordRemittanceModalProps {
  open: boolean;
  onClose: () => void;
}

const CURRENCIES = ['RWF', 'USD', 'GHS', 'KES', 'NGN'];

export function RecordRemittanceModal({
  open,
  onClose,
}: RecordRemittanceModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [authorityName, setAuthorityName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reference, setReference] = useState('');
  const [periodFrom, setPeriodFrom] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  );
  const [periodTo, setPeriodTo] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  );
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setAuthorityName('');
      setAmount('');
      setCurrency('RWF');
      setPaidAt(format(new Date(), 'yyyy-MM-dd'));
      setReference('');
      setPeriodFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setPeriodTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<TaxPaymentRecord>>('/tax/remittances', {
        authorityName,
        amount: parseFloat(amount),
        currency,
        paidAt,
        reference: reference || undefined,
        periodFrom,
        periodTo,
        notes: notes || undefined,
      });
      toast.success('Remittance recorded');
      await queryClient.invalidateQueries({ queryKey: ['tax'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to record remittance');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cdy-white">Record Remittance</h2>
            <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="authority">Authority name</Label>
              <Input id="authority" value={authorityName} onChange={(e) => setAuthorityName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="remAmount">Amount</Label>
                <Input id="remAmount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remCurrency">Currency</Label>
                <select id="remCurrency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remPaidAt">Payment date</Label>
              <Input id="remPaidAt" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remRef">Reference (optional)</Label>
              <Input id="remRef" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="periodFrom">Period from</Label>
                <Input id="periodFrom" type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodTo">Period to</Label>
                <Input id="periodTo" type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remNotes">Notes (optional)</Label>
              <textarea id="remNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-cdy-red hover:bg-cdy-red/90" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Remittance'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
