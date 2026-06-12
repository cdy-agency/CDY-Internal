'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, Plus } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { EmptyState } from '@/components/finance/EmptyState';
import { InvoiceDrawer } from '@/components/finance/invoiceDrawer/InvoiceDrawer';
import { InvoiceRowActions } from '@/components/finance/InvoiceRowActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { InvoiceFilters } from '@/types/invoice';
import type { InvoiceRecord } from '@cdy/shared';
import { InvoiceStatus } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: InvoiceStatus.DRAFT, label: 'Draft' },
  { value: InvoiceStatus.SENT, label: 'Sent' },
  { value: InvoiceStatus.PARTIALLY_PAID, label: 'Partial' },
  { value: InvoiceStatus.PAID, label: 'Paid' },
  { value: InvoiceStatus.OVERDUE, label: 'Overdue' },
  { value: InvoiceStatus.WRITTEN_OFF, label: 'Written Off' },
];

export default function InvoicesPage(): JSX.Element {
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, limit: 25 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<InvoiceRecord | null>(null);

  const { data, isLoading, isError } = useInvoices(filters);

  function toggleStatus(status: InvoiceStatus): void {
    setFilters((prev) => {
      const current = prev.status ?? [];
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { ...prev, status: next.length ? next : undefined, page: 1 };
    });
  }

  function openCreate(): void {
    setEditInvoice(null);
    setDrawerOpen(true);
  }

  function openEdit(invoice: InvoiceRecord): void {
    setEditInvoice(invoice);
    setDrawerOpen(true);
  }

  const hasFilters =
    filters.status?.length ||
    filters.clientId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-cdy-white">Invoices</h1>
        <PermissionGate feature="finance.invoices" action="write">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = filters.status?.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
                    : 'border-cdy-navy-border text-cdy-muted hover:border-cdy-navy-border hover:text-cdy-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
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
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          Failed to load invoices. Please try again.
        </div>
      )}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={
            hasFilters
              ? 'Try adjusting your filters'
              : 'Create your first invoice to get started'
          }
          actionLabel={hasFilters ? undefined : 'Create your first invoice'}
          onAction={hasFilters ? undefined : openCreate}
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Issue Date</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((invoice) => {
                  const isOverdue = invoice.status === InvoiceStatus.OVERDUE;
                  const dueDate = new Date(invoice.dueDate);
                  const dueDateRed =
                    isOverdue ||
                    (invoice.status !== InvoiceStatus.PAID &&
                      dueDate < new Date());

                  return (
                    <tr
                      key={invoice.id}
                      className={`border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50 ${
                        isOverdue ? 'border-l-2 border-l-cdy-red' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/finance/invoices/${invoice.id}`}
                          className="font-mono text-cdy-red hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-cdy-white">{invoice.clientId}</td>
                      <td className="px-4 py-3 text-right font-medium text-cdy-white">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          dueDateRed ? 'text-[var(--cdy-danger)]' : 'text-cdy-muted'
                        }`}
                      >
                        {format(dueDate, 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <InvoiceRowActions invoice={invoice} onEdit={openEdit} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-cdy-muted">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} invoices)
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

      <InvoiceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditInvoice(null);
        }}
        invoice={editInvoice}
      />
    </div>
  );
}
