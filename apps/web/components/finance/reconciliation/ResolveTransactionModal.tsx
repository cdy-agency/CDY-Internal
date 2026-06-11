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
import type { ApiResponse, BankTransactionRecord } from '@cdy/shared';
import { ExpenseCategory, TransactionResolution } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface ResolveTransactionModalProps {
  open: boolean;
  onClose: () => void;
  statementId: string;
  transaction: BankTransactionRecord;
}

export function ResolveTransactionModal({
  open,
  onClose,
  statementId,
  transaction,
}: ResolveTransactionModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState<TransactionResolution>(
    TransactionResolution.LINK_PAYMENT,
  );
  const [entityId, setEntityId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(
    ExpenseCategory.OTHER,
  );
  const [expenseDate, setExpenseDate] = useState(
    transaction.transactionDate.split('T')[0],
  );
  const [notes, setNotes] = useState('');

  const isCredit = transaction.creditAmount !== null;
  const amount = isCredit
    ? transaction.creditAmount ?? 0
    : transaction.debitAmount ?? 0;
  const amountLabel = isCredit
    ? `+${formatCurrency(amount)}`
    : `-${formatCurrency(amount)}`;

  useEffect(() => {
    if (open) {
      setResolution(
        isCredit
          ? TransactionResolution.LINK_PAYMENT
          : TransactionResolution.LINK_EXPENSE,
      );
      setEntityId('');
      setVendorName(transaction.description);
      setCategory(ExpenseCategory.OTHER);
      setExpenseDate(transaction.transactionDate.split('T')[0]);
      setNotes('');
    }
  }, [open, transaction, isCredit]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);

    const payload: {
      resolution: TransactionResolution;
      entityId?: string;
      expenseData?: {
        vendorName: string;
        category: ExpenseCategory;
        amount: number;
        date: string;
        notes?: string;
      };
    } = { resolution };

    if (
      resolution === TransactionResolution.LINK_PAYMENT ||
      resolution === TransactionResolution.LINK_EXPENSE
    ) {
      if (!entityId.trim()) {
        toast.error('Entity ID is required');
        setLoading(false);
        return;
      }
      payload.entityId = entityId.trim();
    }

    if (resolution === TransactionResolution.CREATE_EXPENSE) {
      if (!vendorName.trim()) {
        toast.error('Vendor name is required');
        setLoading(false);
        return;
      }
      payload.expenseData = {
        vendorName: vendorName.trim(),
        category,
        amount,
        date: expenseDate,
        notes: notes || undefined,
      };
    }

    try {
      await api.patch<ApiResponse<unknown>>(
        `/reconciliation/${statementId}/transactions/${transaction.id}/resolve`,
        payload,
      );
      toast.success('Transaction resolved');
      await queryClient.invalidateQueries({
        queryKey: ['reconciliation', statementId],
      });
      await queryClient.invalidateQueries({ queryKey: ['reconciliation', 'list'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosErr.response?.data?.message ?? 'Failed to resolve transaction',
      );
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
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cdy-white">
              Unmatched Transaction
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

          <p className="mb-4 text-sm text-cdy-muted">
            {format(new Date(transaction.transactionDate), 'MMM d')} — &quot;
            {transaction.description}&quot; — {amountLabel}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm font-medium text-cdy-white">
              How would you like to resolve this?
            </p>

            <div className="space-y-2">
              {isCredit && (
                <label className="flex items-start gap-2 text-sm text-cdy-muted">
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolution === TransactionResolution.LINK_PAYMENT}
                    onChange={() =>
                      setResolution(TransactionResolution.LINK_PAYMENT)
                    }
                    className="mt-1"
                  />
                  Link to an existing Payment
                </label>
              )}
              {!isCredit && (
                <label className="flex items-start gap-2 text-sm text-cdy-muted">
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolution === TransactionResolution.LINK_EXPENSE}
                    onChange={() =>
                      setResolution(TransactionResolution.LINK_EXPENSE)
                    }
                    className="mt-1"
                  />
                  Link to an existing Expense
                </label>
              )}
              {!isCredit && (
                <label className="flex items-start gap-2 text-sm text-cdy-muted">
                  <input
                    type="radio"
                    name="resolution"
                    checked={
                      resolution === TransactionResolution.CREATE_EXPENSE
                    }
                    onChange={() =>
                      setResolution(TransactionResolution.CREATE_EXPENSE)
                    }
                    className="mt-1"
                  />
                  Create new Expense record
                </label>
              )}
              {!isCredit && (
                <label className="flex items-start gap-2 text-sm text-cdy-muted">
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolution === TransactionResolution.BANK_CHARGE}
                    onChange={() =>
                      setResolution(TransactionResolution.BANK_CHARGE)
                    }
                    className="mt-1"
                  />
                  Bank charge / fee (auto-creates expense)
                </label>
              )}
              <label className="flex items-start gap-2 text-sm text-cdy-muted">
                <input
                  type="radio"
                  name="resolution"
                  checked={resolution === TransactionResolution.IGNORE}
                  onChange={() => setResolution(TransactionResolution.IGNORE)}
                  className="mt-1"
                />
                Ignore this transaction
              </label>
            </div>

            {(resolution === TransactionResolution.LINK_PAYMENT ||
              resolution === TransactionResolution.LINK_EXPENSE) && (
              <div className="space-y-2">
                <Label htmlFor="entityId">
                  {resolution === TransactionResolution.LINK_PAYMENT
                    ? 'Payment ID'
                    : 'Expense ID'}
                </Label>
                <Input
                  id="entityId"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="Paste record ID..."
                  required
                />
              </div>
            )}

            {resolution === TransactionResolution.CREATE_EXPENSE && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vendorName">Vendor</Label>
                  <Input
                    id="vendorName"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expCategory">Category</Label>
                  <select
                    id="expCategory"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ExpenseCategory)
                    }
                    className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expDate">Date</Label>
                  <Input
                    id="expDate"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expNotes">Notes (optional)</Label>
                  <Input
                    id="expNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Resolve'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
