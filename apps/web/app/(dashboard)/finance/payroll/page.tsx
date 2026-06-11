'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { usePayrollRuns, usePayrollPreview } from '@/hooks/usePayroll';
import { Button } from '@/components/ui/button';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { formatCurrency } from '@/lib/utils';
import {
  currentMonthKey,
  shiftMonth,
  formatMonthKey,
} from '@/lib/reportDates';
import { PayrollStatus, Role } from '@cdy/shared';
import type { ApiResponse, PayrollRun, UserProfile } from '@cdy/shared';

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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [month, setMonth] = useState(currentMonthKey());

  useEffect(() => {
    void api
      .get<ApiResponse<UserProfile>>('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null));
  }, []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: runs, isLoading } = usePayrollRuns();
  const { data: preview } = usePayrollPreview(month);
  const currentRun = runs?.find((r) => r.month === month);

  const isFinanceManager = user?.role === Role.FINANCE_MANAGER;

  async function handleCreateRun(): Promise<void> {
    setCreating(true);
    try {
      const res = await api.post<{ data: PayrollRun }>('/payroll/runs', {
        month,
      });
      toast.success('Payroll run created');
      await queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setConfirmOpen(false);
      router.push(`/finance/payroll/${res.data.data.id}`);
    } catch {
      /* interceptor */
    } finally {
      setCreating(false);
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
          {isFinanceManager && !currentRun && (
            <Button
              className="bg-cdy-red hover:bg-cdy-red/90"
              onClick={() => setConfirmOpen(true)}
            >
              Run Payroll
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[140px] text-center font-medium text-cdy-white">
          {formatMonthKey(month)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {currentRun && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-cdy-muted">Current run — {formatMonthKey(month)}</p>
              <p className="text-lg font-semibold text-cdy-white">
                {statusLabel(currentRun.status)} · {formatCurrency(currentRun.totalNet)} net
              </p>
            </div>
            <Link href={`/finance/payroll/${currentRun.id}`}>
              <Button size="sm">View Details</Button>
            </Link>
          </div>
        </div>
      )}

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
                <td className="px-4 py-3 text-right text-cdy-white">
                  {run.lineItems.length}
                </td>
                <td className="px-4 py-3 text-right text-cdy-white">
                  {formatCurrency(run.totalNet)}
                </td>
                <td className="px-4 py-3 text-cdy-muted">{statusLabel(run.status)}</td>
                <td className="px-4 py-3 text-cdy-muted">
                  {run.processedBy ? run.processedBy.slice(0, 8) + '…' : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/finance/payroll/${run.id}`}
                    className="text-cdy-red hover:underline"
                  >
                    View
                  </Link>
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

      {confirmOpen && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">
              Run Payroll for {formatMonthKey(month)}?
            </h2>
            <p className="mt-3 text-sm text-cdy-muted">
              This will create a DRAFT payroll run pulling:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-cdy-muted">
              <li>Base salaries for {preview.employeeCount} active employees</li>
              <li>
                Approved commissions: {formatCurrency(preview.approvedCommissionTotal)} (
                {preview.agentCount} agents)
              </li>
              <li>
                Estimated total net: ~{formatCurrency(preview.estimatedTotalNet)}
              </li>
            </ul>
            <p className="mt-3 text-sm text-cdy-muted">
              You will be able to review and adjust before processing.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={creating}
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
      )}
    </div>
  );
}
