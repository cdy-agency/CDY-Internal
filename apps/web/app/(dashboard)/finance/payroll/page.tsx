'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, CheckSquare, Square, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { usePayrollRuns, usePayrollPreview } from '@/hooks/usePayroll';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { formatCurrency } from '@/lib/utils';
import { currentMonthKey, shiftMonth, formatMonthKey } from '@/lib/reportDates';
import { PayrollStatus } from '@cdy/shared';
import { useCanWrite } from '@/hooks/usePermission';
import { PermissionGate } from '@/components/PermissionGate';
import type { ApiResponse, PayrollRun } from '@cdy/shared';

function statusLabel(status: PayrollStatus): string {
  switch (status) {
    case PayrollStatus.PROCESSED:
      return '✅ Processed';
    case PayrollStatus.LOCKED:
      return '🔒 Locked';
    default:
      return '📝 Draft';
  }
}

export default function PayrollPage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthKey());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<PayrollRun | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: runs, isLoading } = usePayrollRuns();
  const { data: preview } = usePayrollPreview(month);
  const canWritePayroll = useCanWrite('finance.payroll');

  const runsForMonth = (runs ?? []).filter((r) => r.month === month);
  const availableEmployees = (preview?.employees ?? []).filter((e) => !e.alreadyInRun);

  function openModal(): void {
    // Pre-select all available employees
    setSelectedIds(new Set(availableEmployees.map((e) => e.id)));
    setConfirmOpen(true);
  }

  function toggleEmployee(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll(): void {
    if (selectedIds.size === availableEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableEmployees.map((e) => e.id)));
    }
  }

  const selectedEmployees = availableEmployees.filter((e) => selectedIds.has(e.id));
  const estimatedNet = selectedEmployees.reduce((s, e) => s + e.netPay, 0);

  async function handleCreateRun(): Promise<void> {
    if (selectedIds.size === 0) {
      toast.error('Select at least one employee');
      return;
    }
    setCreating(true);
    try {
      const payload = { month, employeeIds: Array.from(selectedIds) };
      const res = await api.post<{ data: PayrollRun }>('/payroll/runs', payload);
      toast.success('Payroll run created');
      await queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setConfirmOpen(false);
      router.push(`/finance/payroll/${res.data.data.id}`);
    } catch {
      /* interceptor handles toast */
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteRun(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/payroll/runs/${deleteTarget.id}`);
      toast.success('Payroll run deleted');
      await queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setDeleteTarget(null);
    } catch {
      /* interceptor handles toast */
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) return <InvoiceTableSkeleton />;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Payroll</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-cdy-white">Payroll</h1>
        <div className="flex items-center gap-2">
          <Link href="/finance/payroll/salaries">
            <Button variant="outline" size="sm">Employee Salaries</Button>
          </Link>
          <PermissionGate feature="finance.payroll" action="write">
            {availableEmployees.length > 0 && (
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                onClick={openModal}
              >
                Run Payroll
              </Button>
            )}
          </PermissionGate>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[140px] text-center font-medium text-cdy-white">
          {formatMonthKey(month)}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Runs for the selected month */}
      {runsForMonth.length > 0 && (
        <div className="space-y-2">
          {runsForMonth.map((run) => (
            <div
              key={run.id}
              className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-cdy-muted">
                    {formatMonthKey(month)} · {run.lineItems.length} employee{run.lineItems.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-lg font-semibold text-cdy-white">
                    {statusLabel(run.status)} · {formatCurrency(run.totalNet)} net
                  </p>
                </div>
                <Link href={`/finance/payroll/${run.id}`}>
                  <Button size="sm">View Details</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All runs table */}
      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 font-medium text-right">Employees</th>
              <th className="px-4 py-3 font-medium text-right">Total Net</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Processed By</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).map((run) => (
              <tr key={run.id} className="border-b border-cdy-navy-border/50">
                <td className="px-4 py-3 text-cdy-white">{formatMonthKey(run.month)}</td>
                <td className="px-4 py-3 text-right text-cdy-white">{run.lineItems.length}</td>
                <td className="px-4 py-3 text-right text-cdy-white">
                  {formatCurrency(run.totalNet)}
                </td>
                <td className="px-4 py-3 text-cdy-muted">{statusLabel(run.status)}</td>
                <td className="px-4 py-3 text-cdy-muted">
                  {run.processedBy ? run.processedBy.slice(0, 8) + '…' : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/finance/payroll/${run.id}`} className="text-cdy-red hover:underline">
                      View
                    </Link>
                    <PermissionGate feature="finance.payroll" action="write">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(run)}
                        aria-label="Delete payroll run"
                        className="text-cdy-muted hover:text-cdy-red"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
            {(runs ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-cdy-muted">
                  No payroll runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal with employee picker */}
      {confirmOpen && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
            <div className="border-b border-cdy-navy-border px-6 py-4">
              <h2 className="text-lg font-semibold text-cdy-white">
                Run Payroll — {formatMonthKey(month)}
              </h2>
              <p className="mt-1 text-sm text-cdy-muted">
                Select which employees to include in this run.
              </p>
            </div>

            {/* Employee list */}
            <div className="max-h-72 overflow-y-auto px-6 py-3">
              {availableEmployees.length === 0 ? (
                <p className="py-4 text-center text-sm text-cdy-muted">
                  All active employees are already in a run for {formatMonthKey(month)}.
                </p>
              ) : (
                <>
                  {/* Select all toggle */}
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="mb-2 flex items-center gap-2 text-sm text-cdy-muted hover:text-cdy-white"
                  >
                    {selectedIds.size === availableEmployees.length ? (
                      <CheckSquare className="h-4 w-4 text-cdy-red" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedIds.size === availableEmployees.length ? 'Deselect all' : 'Select all'}
                  </button>

                  <div className="space-y-1">
                    {availableEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-cdy-navy"
                      >
                        {selectedIds.has(emp.id) ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-cdy-red" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-cdy-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-cdy-white">{emp.name}</p>
                          <p className="truncate text-xs text-cdy-muted">{emp.email}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-cdy-white">{formatCurrency(emp.netPay)} net</p>
                          {emp.commission > 0 && (
                            <p className="text-cdy-muted">+{formatCurrency(emp.commission)} comm</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Already-in-run notice */}
                  {preview.employees.some((e) => e.alreadyInRun) && (
                    <p className="mt-3 text-xs text-cdy-muted">
                      {preview.employees.filter((e) => e.alreadyInRun).length} employee(s) already
                      have a run this month and are not shown.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Summary + actions */}
            <div className="border-t border-cdy-navy-border px-6 py-4">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-cdy-muted">
                  {selectedIds.size} employee{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <span className="font-semibold text-cdy-white">
                  ~{formatCurrency(estimatedNet)} net
                </span>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-cdy-red hover:bg-cdy-red/90"
                  disabled={creating || selectedIds.size === 0}
                  onClick={() => void handleCreateRun()}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create Draft'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete payroll run?"
        description={
          deleteTarget
            ? `This will permanently remove the ${formatMonthKey(deleteTarget.month)} payroll run. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        isLoading={deleting}
        onConfirm={() => void handleDeleteRun()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
