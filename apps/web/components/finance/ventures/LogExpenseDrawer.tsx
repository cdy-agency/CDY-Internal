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
import { EXPENSE_CATEGORIES } from '@/components/finance/expenses/ExpenseCategoryBadge';
import { formatCurrency } from '@/lib/utils';
import { ExpenseCategory } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface LogExpenseDrawerProps {
  open: boolean;
  ventureId: string;
  ventureName: string;
  onClose: () => void;
}

export function LogExpenseDrawer({
  open,
  ventureId,
  ventureName,
  onClose,
}: LogExpenseDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.SUPPLIER);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isShared, setIsShared] = useState(false);
  const [ventureSharePct, setVentureSharePct] = useState('100');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setVendorName('');
      setAmount('');
      setCurrency('RWF');
      setCategory(ExpenseCategory.SUPPLIER);
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setIsShared(false);
      setVentureSharePct('100');
      setNotes('');
    }
  }, [open]);

  if (!open) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const parsedShare = Math.min(Math.max(parseFloat(ventureSharePct) || 100, 0), 100);
  const ventureAmount = Number(((parsedAmount * parsedShare) / 100).toFixed(2));

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!vendorName.trim() || parsedAmount <= 0) return;
    setLoading(true);
    try {
      await api.post('/expenses', {
        vendorName: vendorName.trim(),
        category,
        amount: parsedAmount,
        currency,
        date,
        ventureId,
        ventureSharePercent: isShared ? parsedShare : 100,
        notes: notes.trim() || undefined,
      });
      toast.success('Expense logged');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} role="presentation" />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">
            Log Expense — <span style={{ color: '#94a3b8' }}>{ventureName}</span>
          </h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="exp-vendor">Vendor / Description</Label>
              <Input
                id="exp-vendor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="exp-amount">Amount</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <Label htmlFor="exp-currency">Currency</Label>
                <select
                  id="exp-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-2 text-sm text-cdy-white"
                >
                  <option value="RWF">RWF</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="exp-category">Category</Label>
              <select
                id="exp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-cdy-white">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => {
                  setIsShared(e.target.checked);
                  if (!e.target.checked) setVentureSharePct('100');
                }}
                className="rounded border-cdy-navy-border"
              />
              This is a shared cost with CDY main
            </label>
            {isShared && (
              <div className="space-y-2 rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-4">
                <div>
                  <Label>{ventureName} share (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ventureSharePct}
                    onChange={(e) => setVentureSharePct(e.target.value)}
                  />
                </div>
                <div className="rounded-md bg-cdy-navy/50 px-3 py-2 text-sm">
                  Venture amount:{' '}
                  <span className="font-semibold text-cdy-white">
                    {formatCurrency(ventureAmount, currency)}
                  </span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="exp-notes">Notes (optional)</Label>
              <textarea
                id="exp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
          </div>
          <div className="mt-auto flex gap-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
