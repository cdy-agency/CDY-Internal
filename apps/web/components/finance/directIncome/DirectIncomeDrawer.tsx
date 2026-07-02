'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentMethod } from '@cdy/shared';
import { FINANCE_CATEGORIES } from '@/components/finance/expenses/ExpenseCategoryBadge';
import type { AxiosError } from 'axios';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money' },
  { value: PaymentMethod.MTN_MOMO, label: 'MTN MoMo' },
  { value: PaymentMethod.AIRTEL_MONEY, label: 'Airtel Money' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.CARD, label: 'Card' },
  { value: PaymentMethod.OTHER, label: 'Other' },
];

interface DirectIncomeDrawerProps {
  open: boolean;
  onClose: () => void;
  ventureId?: string;
  ventureName?: string;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function DirectIncomeDrawer({ open, onClose, ventureId, ventureName }: DirectIncomeDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');

  function reset() {
    setDescription('');
    setAmount('');
    setCurrency('RWF');
    setPaymentMethod(PaymentMethod.CASH);
    setReference('');
    setCategory('');
    setDate(todayStr());
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/finance/income/direct', {
        description,
        amount: parseFloat(amount),
        currency,
        paymentMethod,
        reference: reference || undefined,
        category: category || undefined,
        date,
        notes: notes || undefined,
        ventureId: ventureId || undefined,
      });
      toast.success('Income recorded');
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      if (ventureId) {
        await queryClient.invalidateQueries({ queryKey: ['ventures', ventureId] });
        await queryClient.invalidateQueries({ queryKey: ['ventures', 'direct-income', ventureId] });
      }
      reset();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to record income');
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
          <h2 className="text-lg font-semibold text-cdy-white">
            Record Direct Income{ventureName ? ` — ${ventureName}` : ''}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-cdy-muted hover:text-cdy-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-2">
              <Label htmlFor="di-description">Description *</Label>
              <Input
                id="di-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Cash sale, Consultation fee"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="di-amount">Amount *</Label>
                <Input
                  id="di-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="di-currency">Currency</Label>
                <Input
                  id="di-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="di-method">Payment Method *</Label>
              <select
                id="di-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="di-date">Date</Label>
              <Input
                id="di-date"
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="di-category">Category (optional)</Label>
              <select
                id="di-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                <option value="">— Select category —</option>
                {FINANCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="di-reference">Reference (optional)</Label>
              <Input
                id="di-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TXN-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="di-notes">Notes (optional)</Label>
              <textarea
                id="di-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="border-t border-cdy-navy-border p-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Income'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
