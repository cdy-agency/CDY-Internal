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
import { INCOME_CATEGORIES } from '@/lib/ventureUtils';
import type { ApiResponse, VentureIncomeRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface LogIncomeDrawerProps {
  open: boolean;
  ventureId: string;
  onClose: () => void;
}

export function LogIncomeDrawer({
  open,
  ventureId,
  onClose,
}: LogIncomeDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setDescription('');
      setAmount('');
      setCurrency('USD');
      setCategory(INCOME_CATEGORIES[0]);
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setReference('');
      setNotes('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!description.trim() || !parsed || parsed <= 0) return;
    setLoading(true);
    try {
      await api.post<ApiResponse<VentureIncomeRecord>>(
        `/ventures/${ventureId}/income`,
        {
          description: description.trim(),
          amount: parsed,
          currency,
          category,
          date,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      );
      toast.success('Income logged');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to log income');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} role="presentation" />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Log Income</h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="income-desc">Description</Label>
              <Input
                id="income-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="income-amount">Amount</Label>
                <Input
                  id="income-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <Label htmlFor="income-currency">Currency</Label>
                <select
                  id="income-currency"
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
              <Label htmlFor="income-category">Category</Label>
              <select
                id="income-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="income-date">Date</Label>
              <Input
                id="income-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="income-ref">Reference (optional)</Label>
              <Input
                id="income-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="income-notes">Notes (optional)</Label>
              <textarea
                id="income-notes"
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Income'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
