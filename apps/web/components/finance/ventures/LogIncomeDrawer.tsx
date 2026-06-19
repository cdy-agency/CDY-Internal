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
import { ClientSearch } from '@/components/crm/ClientSearch';
import type { ClientSearchResult } from '@cdy/shared';
import type { AxiosError } from 'axios';

const CURRENCIES = ['USD', 'RWF', 'GHS', 'KES', 'NGN'];

interface LogIncomeDrawerProps {
  open: boolean;
  ventureId: string;
  ventureName: string;
  onClose: () => void;
}

export function LogIncomeDrawer({
  open,
  ventureId,
  ventureName,
  onClose,
}: LogIncomeDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedClient(null);
      setDescription('');
      setAmount('');
      setCurrency('USD');
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [open]);

  if (!open) return null;

  const parsedAmount = parseFloat(amount) || 0;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!selectedClient || !description.trim() || parsedAmount <= 0 || !dueDate) return;
    setLoading(true);
    try {
      await api.post('/invoices', {
        clientId: selectedClient.id,
        currency,
        dueDate,
        ventureId,
        notes: notes.trim() || undefined,
        lineItems: [{ description: description.trim(), quantity: 1, unitPrice: parsedAmount }],
      });
      toast.success('Invoice created and tagged to venture');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to create invoice');
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
            Log Income — <span style={{ color: '#94a3b8' }}>{ventureName}</span>
          </h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <div className="mt-1">
                <ClientSearch
                  value={selectedClient}
                  onChange={setSelectedClient}
                  placeholder="Search client..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="inc-desc">Description (line item)</Label>
              <Input
                id="inc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="inc-amount">Amount</Label>
                <Input
                  id="inc-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="w-28">
                <Label htmlFor="inc-currency">Currency</Label>
                <select
                  id="inc-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-2 text-sm text-cdy-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="inc-due">Due date</Label>
              <Input
                id="inc-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="inc-notes">Notes (optional)</Label>
              <textarea
                id="inc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <p className="rounded-md border border-cdy-navy-border bg-cdy-navy/50 px-3 py-2 text-xs text-cdy-muted">
              Creates a Draft invoice tagged to <span className="text-cdy-white">{ventureName}</span>. Mark it as Paid once payment is received.
            </p>
          </div>
          <div className="mt-auto flex gap-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedClient} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
