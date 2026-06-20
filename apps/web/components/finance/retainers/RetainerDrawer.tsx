'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useTaxRates } from '@/hooks/useTax';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { ApiResponse, RetainerRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface RetainerDrawerProps {
  open: boolean;
  onClose: () => void;
}

const BILLING_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const CURRENCIES = ['RWF'];

export function RetainerDrawer({ open, onClose }: RetainerDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const { data: taxRates } = useTaxRates();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [billingDay, setBillingDay] = useState('1');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [taxRateId, setTaxRateId] = useState('');

  const activeRates = taxRates?.filter((r) => r.isActive) ?? [];
  const selectedRate = activeRates.find((r) => r.id === taxRateId);
  const parsedAmount = parseFloat(amount) || 0;
  const taxPercent = selectedRate?.ratePercent ?? 0;
  const taxAmount = parsedAmount * (taxPercent / 100);
  const total = parsedAmount + taxAmount;

  const previewDate = useMemo(() => {
    const day = parseInt(billingDay, 10);
    const start = new Date(startDate);
    let candidate = new Date(start.getFullYear(), start.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (candidate <= today) {
      candidate = new Date(start.getFullYear(), start.getMonth() + 1, day);
    }
    return candidate;
  }, [billingDay, startDate]);

  useEffect(() => {
    if (open) {
      setClientId('');
      setServiceName('');
      setDescription('');
      setAmount('');
      setCurrency('RWF');
      setBillingDay('1');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate('');
      setTaxRateId('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<RetainerRecord>>('/retainers', {
        clientId,
        serviceName,
        description: description || undefined,
        amount: parsedAmount,
        currency,
        billingDayOfMonth: parseInt(billingDay, 10),
        startDate,
        endDate: endDate || undefined,
        taxRateId: taxRateId || undefined,
      });
      toast.success('Retainer created');
      await queryClient.invalidateQueries({ queryKey: ['retainers'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to create retainer');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border p-6">
          <h2 className="text-lg font-semibold text-cdy-white">Add Retainer</h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input value={clientId} onChange={(e) => setClientId(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Service name</Label>
            <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount / month</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Billing day</Label>
              <select value={billingDay} onChange={(e) => setBillingDay(e.target.value)} className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white">
                {BILLING_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>End date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tax rate</Label>
            <select value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)} className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white">
              <option value="">None</option>
              {activeRates.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.ratePercent}%)</option>
              ))}
            </select>
          </div>
          {parsedAmount > 0 && (
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-4 text-sm">
              <p className="text-cdy-muted">Preview</p>
              <p className="text-cdy-white">First invoice: {format(previewDate, 'MMM d, yyyy')}</p>
              <p className="text-cdy-white">Amount: {formatCurrency(parsedAmount, currency)}</p>
              {taxPercent > 0 && (
                <p className="text-cdy-white">Tax ({taxPercent}%): {formatCurrency(taxAmount, currency)}</p>
              )}
              <p className="font-medium text-cdy-white">Total: {formatCurrency(total, currency)}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Retainer'}
          </Button>
        </form>
      </div>
    </>
  );
}
