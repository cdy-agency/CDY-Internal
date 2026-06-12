'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { usePayrollRun } from '@/hooks/usePayroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { formatCurrency } from '@/lib/utils';
import { formatMonthKey } from '@/lib/reportDates';
import { PayrollStatus } from '@cdy/shared';
import { useCanWrite } from '@/hooks/usePermission';
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [adjustItem, setAdjustItem] = useState<PayrollLineItem | null>(null);
  const [processing, setProcessing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [confirmProcess, setConfirmProcess] = useState(false);
  const taxRate = 20;

  useEffect(() => {
    void api
      .get<ApiResponse<UserProfile>>('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null));
  }, []);

  const canWritePayroll = useCanWrite('finance.payroll');
  const isCreator = user?.id === run?.createdBy;
  const canProcess =
    canWritePayroll &&
    run?.status === PayrollStatus.DRAFT &&
    !isCreator;

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
          {run.status === PayrollStatus.DRAFT && canWritePayroll && (
            <Button
              className="bg-cdy-red hover:bg-cdy-red/90"
              disabled={!canProcess}
              title={
                isCreator
                  ? 'This run was created by you. Another manager must process it.'
                  : undefined
              }
              onClick={() => setConfirmProcess(true)}
            >
              Process Payroll
            </Button>
          )}
          {run.status === PayrollStatus.PROCESSED && (
            <Button
              variant="outline"
              disabled={locking}
              onClick={() => void lockRun()}
            >
              {locking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lock'}
            </Button>
          )}
        </div>
      </div>

      {isCreator && run.status === PayrollStatus.DRAFT && (
        <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-cdy-muted">
          <Info className="h-5 w-5 shrink-0 text-blue-400" />
          <div>
            <p className="font-medium text-cdy-white">Separation of duties</p>
            <p className="mt-1">
              You created this payroll run. A different Finance Manager or the CEO
              must process it.
            </p>
          </div>
        </div>
      )}

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
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {run.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-cdy-navy-border/50">
                <td className="px-4 py-3 text-cdy-white">{item.employeeName}</td>
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
                  {run.status === PayrollStatus.DRAFT &&
                    canWritePayroll &&
                    (user?.id === item.employeeId ? (
                      <span className="text-xs text-cdy-muted">
                        Cannot adjust own record
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-cdy-red hover:underline"
                        onClick={() => setAdjustItem(item)}
                      >
                        Adjust
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
