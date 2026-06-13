'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Receipt, Plus, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useExpenses } from '@/hooks/useExpenses';
import { useVentures } from '@/hooks/useVentures';
import { ExpenseDrawer } from '@/components/finance/expenses/ExpenseDrawer';
import { ExpenseCategoryBadge, EXPENSE_CATEGORIES } from '@/components/finance/expenses/ExpenseCategoryBadge';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { EmptyState } from '@/components/finance/EmptyState';
import { Button } from '@/components/ui/button';
import { formatCurrency, getUploadUrl } from '@/lib/utils';
import type { ExpenseFilters } from '@/types/expense';
import type { ExpenseRecord } from '@cdy/shared';
import { ExpenseCategory } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';

export default function ExpensesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExpenseFilters>({ page: 1, limit: 25 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseRecord | null>(null);

  const { data, isLoading, isError } = useExpenses(filters);
  const { data: ventures } = useVentures();

  function openCreate(): void {
    setEditExpense(null);
    setDrawerOpen(true);
  }

  function openEdit(expense: ExpenseRecord): void {
    setEditExpense(expense);
    setDrawerOpen(true);
  }

  async function handleDelete(expense: ExpenseRecord): Promise<void> {
    try {
      await api.delete(`/expenses/${expense.id}`);
      toast.success('Expense deleted');
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    } catch {
      /* handled by interceptor */
    }
  }

  function toggleCategory(category: ExpenseCategory | undefined): void {
    setFilters((prev) => ({
      ...prev,
      category,
      page: 1,
    }));
  }

  const categoryCounts = data?.summary.categoryCounts ?? [];

  function getCategoryCount(category: ExpenseCategory | undefined): number {
    if (!category) return data?.total ?? 0;
    return (
      categoryCounts.find((c) => c.category === category)?.count ?? 0
    );
  }

  const topCategoryLabel = data?.summary.topCategory
    ? EXPENSE_CATEGORIES.find((c) => c.value === data.summary.topCategory)
        ?.label ?? data.summary.topCategory
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-cdy-white">Expenses</h1>
        <PermissionGate feature="finance.expenses" action="write">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Log Expense
          </Button>
        </PermissionGate>
      </div>

      {data && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-4 py-3 text-sm text-cdy-muted">
          This month:{' '}
          <span className="font-medium text-cdy-white">
            {formatCurrency(data.summary.thisMonthTotal)}
          </span>
          <span className="mx-3">|</span>
          Top category:{' '}
          <span className="font-medium text-cdy-white">
            {topCategoryLabel}
            {data.summary.topCategoryAmount > 0 &&
              ` (${formatCurrency(data.summary.topCategoryAmount)})`}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-cdy-muted">
          Venture:
          <select
            value={filters.ventureId ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                ventureId: e.target.value || undefined,
                page: 1,
              }))
            }
            className="h-9 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
          >
            <option value="">All</option>
            <option value="cdy-main">CDY Main</option>
            {ventures?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggleCategory(undefined)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !filters.category
              ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
              : 'border-cdy-navy-border text-cdy-muted hover:text-cdy-white'
          }`}
        >
          All ({getCategoryCount(undefined)})
        </button>
        {EXPENSE_CATEGORIES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleCategory(opt.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filters.category === opt.value
                ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
                : 'border-cdy-navy-border text-cdy-muted hover:text-cdy-white'
            }`}
          >
            {opt.label} ({getCategoryCount(opt.value)})
          </button>
        ))}
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          Failed to load expenses. Please try again.
        </div>
      )}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <PermissionGate feature="finance.expenses" action="write">
          <EmptyState
            icon={Receipt}
            title="No expenses found"
            description="Log your first expense to get started"
            actionLabel="Log Expense"
            onAction={openCreate}
          />
        </PermissionGate>
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium text-center">Receipt</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50"
                  >
                    <td className="px-4 py-3 text-cdy-white">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {expense.vendorName}
                    </td>
                    <td className="px-4 py-3">
                      <ExpenseCategoryBadge category={expense.category} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-cdy-white">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {expense.projectId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expense.receiptUrl ? (
                        <a
                          href={getUploadUrl(expense.receiptUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-cdy-red hover:text-cdy-red/80"
                        >
                          <Paperclip className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-cdy-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PermissionGate feature="finance.expenses" action="write">
                        <div className="flex justify-end gap-1">
                          {expense.canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--cdy-danger)]"
                            onClick={() => handleDelete(expense)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-cdy-muted">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} expenses)
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

      <ExpenseDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditExpense(null);
        }}
        expense={editExpense}
      />
    </div>
  );
}
