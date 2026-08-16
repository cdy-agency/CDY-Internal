'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CreditCard, Loader2, Pencil, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { usePayments } from '@/hooks/usePayments';
import { PaymentMethodBadge } from '@/components/finance/payments/PaymentMethodBadge';
import { DirectIncomeDrawer } from '@/components/finance/directIncome/DirectIncomeDrawer';
import type { DirectIncomeEntry } from '@/hooks/useVentures';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { EmptyState } from '@/components/finance/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { PaymentFilters } from '@/types/payment';
import type { ApiResponse } from '@cdy/shared';
import { PaymentMethod } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.CARD, label: 'Card' },
];

function TypeBadge({ type }: { type: 'INVOICE_PAYMENT' | 'DIRECT_INCOME' }): JSX.Element {
  if (type === 'DIRECT_INCOME') {
    return (
      <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
        Direct
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
      Invoice
    </span>
  );
}

export default function PaymentsPage(): JSX.Element {
  const [filters, setFilters] = useState<PaymentFilters>({ page: 1, limit: 25 });
  const [directIncomeOpen, setDirectIncomeOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DirectIncomeEntry | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const { data, isLoading, isError } = usePayments(filters);

  const hasFilters = filters.clientId || filters.dateFrom || filters.dateTo || filters.method;

  async function handleEditDirectIncome(id: string): Promise<void> {
    setEditLoadingId(id);
    try {
      const res = await api.get<ApiResponse<DirectIncomeEntry>>(`/finance/income/direct/${id}`);
      setEditEntry(res.data.data);
      setDirectIncomeOpen(true);
    } catch {
      toast.error('Failed to load income record');
    } finally {
      setEditLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-cdy-white">Payments</h1>
        <PermissionGate feature="finance.payments" action="write">
          <Button onClick={() => { setEditEntry(null); setDirectIncomeOpen(true); }}>
            <Plus className="h-4 w-4" />
            Record Income
          </Button>
        </PermissionGate>
      </div>

      {data && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-4 py-3 text-sm text-cdy-muted">
          <span>
            Total collected:{' '}
            <span className="font-medium text-[var(--cdy-success)]">
              {formatCurrency(data.summary.totalCollectedThisMonth)}
            </span>
          </span>
          {data.summary.invoicePaymentsThisMonth !== undefined && (
            <span>
              Invoice payments:{' '}
              <span className="font-medium text-blue-400">
                {formatCurrency(data.summary.invoicePaymentsThisMonth)}
              </span>
            </span>
          )}
          {data.summary.directIncomeThisMonth !== undefined && (
            <span>
              Direct income:{' '}
              <span className="font-medium text-green-400">
                {formatCurrency(data.summary.directIncomeThisMonth)}
              </span>
            </span>
          )}
          <span>
            Count: <span className="font-medium text-cdy-white">{data.summary.paymentsThisMonth}</span>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search client..."
          className="w-48"
          value={filters.clientId ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              clientId: e.target.value || undefined,
              page: 1,
            }))
          }
        />
        <Input
          type="date"
          className="w-40"
          value={filters.dateFrom ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dateFrom: e.target.value || undefined,
              page: 1,
            }))
          }
        />
        <Input
          type="date"
          className="w-40"
          value={filters.dateTo ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dateTo: e.target.value || undefined,
              page: 1,
            }))
          }
        />
        <select
          value={filters.method ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              method: (e.target.value as PaymentMethod) || undefined,
              page: 1,
            }))
          }
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          <option value="">All methods</option>
          {METHOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          Failed to load payments. Please try again.
        </div>
      )}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          icon={CreditCard}
          title="No payments found"
          description={
            hasFilters
              ? 'Try adjusting your filters'
              : 'Payments will appear here once recorded against invoices'
          }
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description / Invoice</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50"
                  >
                    <td className="px-4 py-3">
                      <TypeBadge type={payment.type} />
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {format(new Date(payment.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      {payment.type === 'INVOICE_PAYMENT' && payment.invoiceId ? (
                        <Link
                          href={`/finance/invoices/${payment.invoiceId}`}
                          className="font-mono text-cdy-red hover:underline"
                        >
                          {payment.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="text-cdy-muted">{payment.description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {payment.clientName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--cdy-success)]">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentMethodBadge method={payment.paymentMethod} />
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {payment.accountName ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-cdy-muted">
                      {payment.reference ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {payment.type === 'DIRECT_INCOME' && (
                        <PermissionGate feature="finance.payments" action="write">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={editLoadingId === payment.id}
                            onClick={() => handleEditDirectIncome(payment.id)}
                          >
                            {editLoadingId === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </Button>
                        </PermissionGate>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-cdy-muted">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} payments)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <DirectIncomeDrawer
        open={directIncomeOpen}
        entry={editEntry}
        onClose={() => { setDirectIncomeOpen(false); setEditEntry(null); }}
      />
    </div>
  );
}
