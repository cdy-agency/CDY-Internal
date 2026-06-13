'use client';

import { useEffect, useMemo, useState } from 'react';
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
import type { ApiResponse, VentureExpenseRecord } from '@cdy/shared';
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
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.SUPPLIER);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isShared, setIsShared] = useState(false);
  const [ventureShare, setVentureShare] = useState('100');
  const [cdyShare, setCdyShare] = useState('0');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseId, setExpenseId] = useState('');

  useEffect(() => {
    if (open) {
      setDescription('');
      setTotalAmount('');
      setCurrency('USD');
      setCategory(ExpenseCategory.SUPPLIER);
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setIsShared(false);
      setVentureShare('100');
      setCdyShare('0');
      setReceiptUrl('');
      setNotes('');
      setExpenseId('');
    }
  }, [open]);

  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedVentureShare = parseFloat(ventureShare) || 0;
  const parsedCdyShare = parseFloat(cdyShare) || 0;
  const totalAllocated = isShared
    ? parsedVentureShare + parsedCdyShare
    : parsedVentureShare;
  const ventureAmount = Number(
    ((parsedTotal * (isShared ? parsedVentureShare : 100)) / 100).toFixed(2),
  );
  const allocationValid = !isShared || totalAllocated === 100;
  const shareValid = !isShared || parsedVentureShare + parsedCdyShare <= 100;

  const cdyAmount = useMemo(
    () => Number(((parsedTotal * parsedCdyShare) / 100).toFixed(2)),
    [parsedTotal, parsedCdyShare],
  );

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!description.trim() || parsedTotal <= 0) return;
    if (isShared && (!allocationValid || !shareValid)) {
      toast.error('Share percentages must total 100% and not exceed 100%');
      return;
    }
    setLoading(true);
    try {
      await api.post<ApiResponse<VentureExpenseRecord>>(
        `/ventures/${ventureId}/expenses`,
        {
          description: description.trim(),
          totalAmount: parsedTotal,
          ventureShare: isShared ? parsedVentureShare : 100,
          currency,
          category,
          date,
          isShared,
          cdyShare: isShared ? parsedCdyShare : undefined,
          receiptUrl: receiptUrl.trim() || undefined,
          notes: notes.trim() || undefined,
          expenseId: expenseId.trim() || undefined,
        },
      );
      toast.success('Expense logged');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
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
          <h2 className="text-lg font-semibold text-cdy-white">Log Expense</h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="expense-desc">Description</Label>
              <Input
                id="expense-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="expense-total">Total cost</Label>
                <Input
                  id="expense-total"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <Label htmlFor="expense-currency">Currency</Label>
                <select
                  id="expense-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-2 text-sm text-cdy-white"
                >
                  <option value="USD">USD</option>
                  <option value="RWF">RWF</option>
                  <option value="GHS">GHS</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="expense-category">Category</Label>
              <select
                id="expense-category"
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
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
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
                  if (!e.target.checked) {
                    setVentureShare('100');
                    setCdyShare('0');
                  }
                }}
                className="rounded border-cdy-navy-border"
              />
              This is a shared cost
            </label>
            {isShared && (
              <div className="space-y-3 rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-4">
                <div>
                  <Label>{ventureName} share (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ventureShare}
                    onChange={(e) => setVentureShare(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-cdy-muted">
                    → {formatCurrency(ventureAmount, currency)}
                  </p>
                </div>
                <div>
                  <Label>CDY main share (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={cdyShare}
                    onChange={(e) => setCdyShare(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-cdy-muted">
                    → {formatCurrency(cdyAmount, currency)}
                  </p>
                </div>
                <div className="border-t border-cdy-navy-border pt-2 text-sm">
                  Total allocated: {totalAllocated}%
                  {allocationValid && shareValid ? (
                    <span className="ml-2 text-green-400">✅</span>
                  ) : (
                    <span className="ml-2 text-red-400">⚠️ Must equal 100%</span>
                  )}
                </div>
              </div>
            )}
            <div className="rounded-md bg-cdy-navy/50 px-3 py-2 text-sm">
              Venture&apos;s amount:{' '}
              <span className="font-semibold text-cdy-white">
                {formatCurrency(ventureAmount, currency)}
              </span>
            </div>
            <div>
              <Label htmlFor="expense-receipt">Receipt URL (optional)</Label>
              <Input
                id="expense-receipt"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="expense-expense-id">Link to Finance expense (optional)</Label>
              <Input
                id="expense-expense-id"
                value={expenseId}
                onChange={(e) => setExpenseId(e.target.value)}
                placeholder="Expense ID"
              />
            </div>
            <div>
              <Label htmlFor="expense-notes">Notes (optional)</Label>
              <textarea
                id="expense-notes"
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
            <Button
              type="submit"
              disabled={loading || (isShared && (!allocationValid || !shareValid))}
              className="flex-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
