'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CreditCard, Check, Minus } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { PaymentMethodBadge } from '@/components/finance/payments/PaymentMethodBadge';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { EmptyState } from '@/components/finance/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { PaymentFilters } from '@/types/payment';
import { PaymentMethod } from '@cdy/shared';

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.CARD, label: 'Card' },
];

export default function PaymentsPage(): JSX.Element {
  const [filters, setFilters] = useState<PaymentFilters>({ page: 1, limit: 25 });
  const { data, isLoading, isError } = usePayments(filters);

  const hasFilters =
    filters.clientId || filters.dateFrom || filters.dateTo || filters.method;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-cdy-white">Payments</h1>

      {data && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-4 py-3 text-sm text-cdy-muted">
          Total collected this month:{' '}
          <span className="font-medium text-[var(--cdy-success)]">
            {formatCurrency(data.summary.totalCollectedThisMonth)}
          </span>
          <span className="mx-3">|</span>
          Payments this month:{' '}
          <span className="font-medium text-cdy-white">
            {data.summary.paymentsThisMonth}
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
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium text-center">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50"
                  >
                    <td className="px-4 py-3 text-cdy-white">
                      {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/finance/invoices/${payment.invoiceId}`}
                        className="font-mono text-cdy-red hover:underline"
                      >
                        {payment.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-cdy-white">{payment.clientId}</td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--cdy-success)]">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentMethodBadge method={payment.method} />
                    </td>
                    <td className="px-4 py-3 font-mono text-cdy-muted">
                      {payment.reference ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payment.receiptSent ? (
                        <Check className="mx-auto h-4 w-4 text-[var(--cdy-success)]" />
                      ) : (
                        <Minus className="mx-auto h-4 w-4 text-cdy-muted" />
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
    </div>
  );
}
