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
import { FINANCE_CATEGORIES } from '@/components/finance/expenses/ExpenseCategoryBadge';
import type { AxiosError } from 'axios';

interface BillDrawerProps {
  open: boolean;
  onClose: () => void;
  bill?: BillRecord | null;
}

const CURRENCIES = ['RWF'];

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function BillDrawer({
  open,
  onClose,
  bill,
}: BillDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(bill);

  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && bill) {
      setVendorName(bill.vendorName);
      setCategory(bill.category);
      setAmount(String(bill.amount));
      setCurrency(bill.currency);
      setDueDate(bill.dueDate.split('T')[0]);
      setNotes(bill.notes ?? '');
    } else if (open && !bill) {
      setVendorName('');
      setCategory('');
      setAmount('');
      setCurrency('RWF');
      setDueDate('');
      setNotes('');
    }
  }, [open, bill]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);

    const payload = {
      vendorName,
      category,
      amount: parseFloat(amount),
      currency,
      dueDate,
      notes: notes || undefined,
    };

    try {
      if (isEdit && bill) {
        await api.patch<ApiResponse<BillRecord>>(`/bills/${bill.id}`, payload);
        toast.success('Bill updated');
      } else {
        await api.post<ApiResponse<BillRecord>>('/bills', payload);
        toast.success('Bill added');
      }

      await queryClient.invalidateQueries({ queryKey: ['bills'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        role="presentation"
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-cdy-navy-light shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">
            {isEdit ? 'Edit Bill' : 'Add Bill'}
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

        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                <option value="">— Select category —</option>
                {FINANCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                min={isEdit ? undefined : todayString()}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-2 focus:ring-cdy-red"
              />
            </div>
          </div>

          <div className="border-t border-cdy-navy-border px-6 py-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                'Update Bill'
              ) : (
                'Add Bill'
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
