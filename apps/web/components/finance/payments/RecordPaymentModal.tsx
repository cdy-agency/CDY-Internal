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
import { invoiceRemainingBalance } from '@/lib/invoice-balance';
import type { ApiResponse, InvoiceDetail } from '@cdy/shared';
import { PaymentMethod } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: '🏦 Bank Transfer' },
  { value: PaymentMethod.MTN_MOMO,      label: '📱 MTN MoMo' },
  { value: PaymentMethod.AIRTEL_MONEY,  label: '📱 Airtel Money' },
  { value: PaymentMethod.CARD,          label: '💳 Card' },
  { value: PaymentMethod.CASH,          label: '💵 Cash' },
  { value: PaymentMethod.OTHER,         label: '⋯ Other' },
];

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function RecordPaymentModal({
  open,
  onClose,
  invoice,
}: RecordPaymentModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const alreadyPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const credited = invoice.creditNotes
    .filter((cn) => cn.status !== 'VOID')
    .reduce((sum, cn) => sum + cn.amount, 0);
  const remaining = invoiceRemainingBalance({
    total: invoice.total,
    payments: invoice.payments,
    creditNotes: invoice.creditNotes,
  });

  const [amount, setAmount] = useState(String(remaining));
  const [paidAt, setPaidAt] = useState(todayString());
  const [method, setMethod] = useState<PaymentMethod>(
    PaymentMethod.BANK_TRANSFER,
  );
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(String(remaining));
      setPaidAt(todayString());
      setMethod(PaymentMethod.BANK_TRANSFER);
      setReference('');
      setNotes('');
      setAmountError('');
    }
  }, [open, remaining]);

  const fmt = (n: number): string => formatCurrency(n, invoice.currency);

  function validateAmount(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return 'Amount must be greater than zero';
    }
    if (num > remaining + 0.001) {
      return `Amount cannot exceed remaining balance (${fmt(remaining)})`;
    }
    return '';
  }

  function handleAmountChange(value: string): void {
    setAmount(value);
    setAmountError(validateAmount(value));
  }

  function validateDate(value: string): boolean {
    const selected = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selected <= today;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    const error = validateAmount(amount);
    if (error) {
      setAmountError(error);
      return;
    }

    if (!validateDate(paidAt)) {
      toast.error('Payment date cannot be in the future');
      return;
    }

    setLoading(true);
    try {
      const numAmount = parseFloat(amount);
      await api.post<ApiResponse<unknown>>(`/invoices/${invoice.id}/payments`, {
        amount: numAmount,
        method,
        paidAt,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      toast.success(`Payment of ${fmt(numAmount)} recorded successfully`);
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const message =
        axiosErr.response?.data?.message ?? 'Failed to record payment';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
        role="presentation"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[480px] max-h-[90vh] flex-col rounded-xl border border-cdy-navy-border bg-cdy-navy-light shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-payment-title"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-cdy-navy-border px-6 py-4">
            <h2
              id="record-payment-title"
              className="text-lg font-semibold text-cdy-white"
            >
              Record Payment
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

          <div className="overflow-y-auto px-6 py-5">
            <div className="mb-5 space-y-1 rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-4 text-sm">
              <div className="flex justify-between text-cdy-muted">
                <span>Invoice total:</span>
                <span className="text-cdy-white">{fmt(invoice.total)}</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between text-cdy-muted">
                  <span>Already paid:</span>
                  <span className="text-cdy-white">{fmt(alreadyPaid)}</span>
                </div>
              )}
              {credited > 0 && (
                <div className="flex justify-between text-cdy-muted">
                  <span>Credited:</span>
                  <span className="text-cdy-white">-{fmt(credited)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span className="text-cdy-muted">Remaining:</span>
                <span className="text-cdy-red">{fmt(remaining)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  required
                />
                {amountError && (
                  <p className="text-xs text-[var(--cdy-danger)]">{amountError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAt">Payment Date</Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={paidAt}
                  max={todayString()}
                  onChange={(e) => setPaidAt(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMethod(opt.value)}
                      className={`rounded-lg border p-2.5 text-center text-sm transition-colors ${
                        method === opt.value
                          ? 'border-cdy-red bg-cdy-red/10 text-cdy-white'
                          : 'border-cdy-navy-border text-cdy-muted hover:border-cdy-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference # (optional)</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="TXN-12345"
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
                  placeholder="Additional notes..."
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || Boolean(amountError)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Record Payment'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
