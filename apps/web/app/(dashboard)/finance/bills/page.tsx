'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useBills } from '@/hooks/useBills';
import { BillDrawer } from '@/components/finance/bills/BillDrawer';
import { BillPayModal } from '@/components/finance/bills/BillPayModal';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { EmptyState } from '@/components/finance/EmptyState';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { BillFilters } from '@/types/bill';
import type { BillRecord } from '@cdy/shared';
import { BillStatus } from '@cdy/shared';

function BillStatusBadge({ status }: { status: BillStatus }): JSX.Element {
  const config: Record<BillStatus, { label: string; className: string }> = {
    [BillStatus.UNPAID]: {
      label: 'Unpaid',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    [BillStatus.PARTIALLY_PAID]: {
      label: 'Partial',
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    [BillStatus.PAID]: {
      label: 'Paid',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function formatDaysLabel(bill: BillRecord): string {
  if (bill.status === BillStatus.PAID && bill.paidAt) {
    return `Paid ${format(new Date(bill.paidAt), 'MMM d')}`;
  }
  if (bill.isOverdue) {
    const days = Math.abs(bill.daysUntilDue);
    return `${days} day${days === 1 ? '' : 's'} overdue`;
  }
  if (bill.daysUntilDue === 0) return 'Due today';
  return `Due in ${bill.daysUntilDue} day${bill.daysUntilDue === 1 ? '' : 's'}`;
}

export default function BillsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BillFilters>({ page: 1, limit: 25 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editBill, setEditBill] = useState<BillRecord | null>(null);
  const [payBill, setPayBill] = useState<BillRecord | null>(null);

  const { data, isLoading, isError } = useBills(filters);

  async function handleDelete(bill: BillRecord): Promise<void> {
    try {
      await api.delete(`/bills/${bill.id}`);
      toast.success('Bill deleted');
      await queryClient.invalidateQueries({ queryKey: ['bills'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    } catch {
      /* handled by interceptor */
    }
  }

  function showDueSoonOnly(): void {
    setFilters({ page: 1, limit: 25, status: BillStatus.UNPAID });
  }

  function showOverdueOnly(): void {
    setFilters({ page: 1, limit: 25, overdue: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-cdy-white">Bills</h1>
        <Button onClick={() => { setEditBill(null); setDrawerOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {data && data.alerts.dueSoonCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <span>
            ⚠ {data.alerts.dueSoonCount} bill
            {data.alerts.dueSoonCount === 1 ? '' : 's'} due within 3 days totalling{' '}
            {formatCurrency(data.alerts.dueSoonTotal)}
          </span>
          <Button variant="outline" size="sm" onClick={showDueSoonOnly}>
            View
          </Button>
        </div>
      )}

      {data && data.alerts.overdueCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          <span>
            🔴 {data.alerts.overdueCount} bill
            {data.alerts.overdueCount === 1 ? '' : 's'} overdue totalling{' '}
            {formatCurrency(data.alerts.overdueTotal)}
          </span>
          <Button variant="outline" size="sm" onClick={showOverdueOnly}>
            View
          </Button>
        </div>
      )}

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          Failed to load bills. Please try again.
        </div>
      )}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No bills found"
          description="Add your first bill to track upcoming payments"
          actionLabel="Add Bill"
          onAction={() => { setEditBill(null); setDrawerOpen(true); }}
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((bill) => {
                  const dueDateClass = bill.isOverdue
                    ? 'text-[var(--cdy-danger)]'
                    : bill.isDueSoon
                      ? 'text-amber-400'
                      : 'text-cdy-muted';

                  return (
                    <tr
                      key={bill.id}
                      className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50"
                    >
                      <td className="px-4 py-3 text-cdy-white">{bill.vendorName}</td>
                      <td className="px-4 py-3 text-cdy-muted">{bill.category}</td>
                      <td className="px-4 py-3 text-right font-medium text-cdy-white">
                        {formatCurrency(bill.amount, bill.currency)}
                      </td>
                      <td className={`px-4 py-3 ${dueDateClass}`}>
                        {format(new Date(bill.dueDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <BillStatusBadge
                          status={
                            bill.isOverdue && bill.status === BillStatus.UNPAID
                              ? BillStatus.UNPAID
                              : bill.status
                          }
                        />
                        {bill.isOverdue && bill.status === BillStatus.UNPAID && (
                          <span className="ml-1 text-xs text-[var(--cdy-danger)]">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {formatDaysLabel(bill)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {bill.status === BillStatus.UNPAID && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPayBill(bill)}
                            >
                              Mark as Paid
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--cdy-danger)]"
                            onClick={() => handleDelete(bill)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-cdy-muted">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} bills)
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

      <BillDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditBill(null);
        }}
        bill={editBill}
      />

      {payBill && (
        <BillPayModal
          open={Boolean(payBill)}
          onClose={() => setPayBill(null)}
          bill={payBill}
        />
      )}
    </div>
  );
}
