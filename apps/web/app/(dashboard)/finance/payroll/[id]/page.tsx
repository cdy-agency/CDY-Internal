'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { usePayrollRun, useMarkPayrollItemPaid } from '@/hooks/usePayroll';
import { useFinanceSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { formatCurrency } from '@/lib/utils';
import { formatMonthKey } from '@/lib/reportDates';
import { PayrollStatus, PayrollLineItemPaymentStatus } from '@cdy/shared';
import { useCanWrite } from '@/hooks/usePermission';
import { PermissionGate } from '@/components/PermissionGate';
import type { ApiResponse, PayrollLineItem, UserProfile } from '@cdy/shared';

function AdjustModal({
  item,
  runId,
  taxRate,
  onClose,
  onSaved,
}: {
  item: PayrollLineItem;
  runId: string;
  taxRate: number;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [baseSalary, setBaseSalary] = useState(String(item.baseSalary));
  const [commission, setCommission] = useState(String(item.commission));
  const [bonus, setBonus] = useState(String(item.bonus));
  const [otherDeductions, setOtherDeductions] = useState(
    String(item.otherDeductions),
  );
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);

  const base = parseFloat(baseSalary) || 0;
  const comm = parseFloat(commission) || 0;
  const bon = parseFloat(bonus) || 0;
  const other = parseFloat(otherDeductions) || 0;
  const gross = base + comm + bon;
  const tax = gross * (taxRate / 100);
  const net = gross - tax - other;

  async function save(): Promise<void> {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/payroll/runs/${runId}/items/${item.id}`, {
        baseSalary: base,
        commission: comm,
        bonus: bon,
        otherDeductions: other,
        reason,
        notes: notes || undefined,
      });
      toast.success('Adjustment saved');
      onSaved();
      onClose();
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="text-lg font-semibold text-cdy-white">
          Adjust Payroll — {item.employeeName}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-cdy-muted">
            Base Salary
            <Input
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Commission
            <Input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Bonus
            <Input
              type="number"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Other deductions
            <Input
              type="number"
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Reason (required)
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Notes
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>
        <div className="mt-4 rounded-md bg-cdy-navy p-3 text-sm">
          <p className="text-cdy-muted">
            Gross Pay: <span className="text-cdy-white">{formatCurrency(gross)}</span>
          </p>
          <p className="text-cdy-muted">
            Tax ({taxRate}%):{' '}
            <span className="text-cdy-red">−{formatCurrency(tax)}</span>
          </p>
          <p className="font-medium text-cdy-white">
            Net Pay: {formatCurrency(net)}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Adjustment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollDetailPage(): JSX.Element {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: run, isLoading } = usePayrollRun(id);
  const { data: settings } = useFinanceSettings();
  const markPaidMutation = useMarkPayrollItemPaid(id);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [adjustItem, setAdjustItem] = useState<PayrollLineItem | null>(null);
  const [processing, setProcessing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [confirmProcess, setConfirmProcess] = useState(false);
  const parsedTaxRate = Number(settings?.payroll_tax_rate);
  const taxRate =
    settings?.payroll_tax_rate != null &&
    settings.payroll_tax_rate !== '' &&
    Number.isFinite(parsedTaxRate)
      ? parsedTaxRate
      : 20;

  useEffect(() => {
    void api
      .get<ApiResponse<UserProfile>>('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null));
  }, []);

  const canWritePayroll = useCanWrite('finance.payroll');
  const canProcess =
    canWritePayroll &&
    run?.status === PayrollStatus.DRAFT;

  async function processRun(): Promise<void> {
    setProcessing(true);
    try {
      await api.post(`/payroll/runs/${id}/process`);
      toast.success('Payroll processed — payslips sent');
      await queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setConfirmProcess(false);
    } catch {
      /* interceptor */
    } finally {
      setProcessing(false);
    }
  }

  async function lockRun(): Promise<void> {
    setLocking(true);
    try {
      await api.post(`/payroll/runs/${id}/lock`);
      toast.success('Payroll run locked');
      await queryClient.invalidateQueries({ queryKey: ['payroll'] });
    } catch {
      /* interceptor */
    } finally {
      setLocking(false);
    }
  }

  if (isLoading || !run) return <InvoiceTableSkeleton />;

  const allPayslipsSent =
    run.status !== PayrollStatus.DRAFT &&
    run.lineItems.every((i) => i.payslipSent);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/payroll" className="hover:text-cdy-white">Payroll</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">{formatMonthKey(run.month)}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-cdy-white">
            {formatMonthKey(run.month)}
          </h1>
          <p className="mt-1 text-sm text-cdy-muted">
            Status: {run.status}
            {run.processedAt && ` · Processed ${new Date(run.processedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <PermissionGate feature="finance.payroll" action="write">
            {run.status === PayrollStatus.DRAFT && canWritePayroll && (
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={!canProcess}
                onClick={() => setConfirmProcess(true)}
              >
                Process Payroll
              </Button>
            )}
          </PermissionGate>
          <PermissionGate feature="finance.payroll" action="write">
            {run.status === PayrollStatus.PROCESSED && (
              <Button
                variant="outline"
                disabled={locking}
                onClick={() => void lockRun()}
              >
                {locking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lock'}
              </Button>
            )}
          </PermissionGate>
        </div>
      </div>

      {allPayslipsSent && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm">
          <p className="font-medium text-green-400">
            ✅ Payslips sent to all {run.lineItems.length} employees
          </p>
          <p className="mt-2 text-cdy-muted">
            {run.lineItems.map((i) => (
              <span key={i.id} className="mr-4">
                {i.employeeName} — {i.payslipSent ? 'sent' : 'pending'}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Gross', value: run.totalGross },
          { label: 'Total Deductions', value: run.totalDeductions },
          { label: 'Total Net', value: run.totalNet },
          { label: 'Employees', value: run.lineItems.length },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
          >
            <p className="text-xs text-cdy-muted">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-cdy-white">
              {typeof card.value === 'number' && card.label !== 'Employees'
                ? formatCurrency(card.value)
                : card.value}
            </p>
          </div>
        ))}
      </div>

      {run.status !== PayrollStatus.DRAFT && (
        <div className="flex items-center gap-3 text-sm text-cdy-muted">
          <span>
            Payment progress:{' '}
            <span className="font-medium text-cdy-white">
              {run.lineItems.filter((i) => i.paymentStatus === PayrollLineItemPaymentStatus.PAID).length}
              {' / '}
              {run.lineItems.length} paid
            </span>
          </span>
          {run.lineItems.every((i) => i.paymentStatus === PayrollLineItemPaymentStatus.PAID) && (
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
              All paid
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium text-right">Base</th>
              <th className="px-4 py-3 font-medium text-right">Commission</th>
              <th className="px-4 py-3 font-medium text-right">Bonus</th>
              <th className="px-4 py-3 font-medium text-right">Gross</th>
              <th className="px-4 py-3 font-medium text-right">Tax</th>
              <th className="px-4 py-3 font-medium text-right">Net</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {run.lineItems.map((item) => {
              const isPaid = item.paymentStatus === PayrollLineItemPaymentStatus.PAID;
              return (
                <tr key={item.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3 text-cdy-white">
                    <div>{item.employeeName}</div>
                    <div className="text-xs text-cdy-muted">{item.employeeEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {formatCurrency(item.baseSalary)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {formatCurrency(item.commission)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {formatCurrency(item.bonus)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {formatCurrency(item.grossPay)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-red">
                    −{formatCurrency(item.taxDeduction)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-cdy-white">
                    {formatCurrency(item.netPay)}
                  </td>
                  <td className="px-4 py-3">
                    {run.status === PayrollStatus.DRAFT ? (
                      <span className="text-xs text-cdy-muted">—</span>
                    ) : isPaid ? (
                      <div>
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                          Paid
                        </span>
                        {item.paidAt && (
                          <div className="mt-0.5 text-xs text-cdy-muted">
                            {new Date(item.paidAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {run.status === PayrollStatus.DRAFT &&
                        canWritePayroll &&
                        (user?.id === item.employeeId ? (
                          <span className="text-xs text-cdy-muted">Cannot adjust own</span>
                        ) : (
                          <PermissionGate feature="finance.payroll" action="write">
                            <button
                              type="button"
                              className="text-cdy-red hover:underline text-xs"
                              onClick={() => setAdjustItem(item)}
                            >
                              Adjust
                            </button>
                          </PermissionGate>
                        ))}
                      {run.status !== PayrollStatus.DRAFT && !isPaid && canWritePayroll && (
                        <PermissionGate feature="finance.payroll" action="write">
                          <button
                            type="button"
                            disabled={markPaidMutation.isPending}
                            className="text-xs text-green-400 hover:underline disabled:opacity-50"
                            onClick={() => void markPaidMutation.mutateAsync(item.id)}
                          >
                            {markPaidMutation.isPending ? 'Saving…' : 'Mark Paid'}
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {run.expenses && run.expenses.length > 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-cdy-muted">
            Finance Expense Records
          </p>
          <div className="divide-y divide-cdy-navy-border/50">
            {run.expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-cdy-muted">{expense.vendorName}</span>
                <span className="font-mono font-medium text-cdy-white">
                  {formatCurrency(expense.amount, expense.currency)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-cdy-muted">
            These expenses appear in the P&L report under Staff Costs.{' '}
            <a href="/finance/expenses" className="text-cdy-red hover:underline">
              View in expense list →
            </a>
          </p>
        </div>
      )}

      {adjustItem && (
        <AdjustModal
          item={adjustItem}
          runId={id}
          taxRate={taxRate}
          onClose={() => setAdjustItem(null)}
          onSaved={() =>
            void queryClient.invalidateQueries({ queryKey: ['payroll', 'run', id] })
          }
        />
      )}

      {confirmProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">Process Payroll?</h2>
            <p className="mt-3 text-sm text-cdy-muted">
              This will send payslips to {run.lineItems.length} employees and mark
              approved commissions as PAID. Total net:{' '}
              {formatCurrency(run.totalNet)}.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmProcess(false)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={processing}
                onClick={() => void processRun()}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirm Process'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
