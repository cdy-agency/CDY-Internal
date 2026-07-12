'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useEmployees, useUpdateEmployeeSalary } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { formatCurrency } from '@/lib/utils';
import type { EmployeeRecord } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';
import type { AxiosError } from 'axios';

const CURRENCIES = ['RWF'];

function hasNoSalary(employee: EmployeeRecord): boolean {
  return !employee.baseSalary || employee.baseSalary <= 0;
}

function employeeName(employee: EmployeeRecord): string {
  return `${employee.firstName} ${employee.lastName}`;
}

function SalaryModal({
  employee,
  candidates,
  onClose,
}: {
  employee: EmployeeRecord | null;
  candidates: EmployeeRecord[];
  onClose: () => void;
}): JSX.Element {
  const [selectedId, setSelectedId] = useState(employee?.id ?? '');
  const [newSalary, setNewSalary] = useState(
    employee?.baseSalary ? String(employee.baseSalary) : '',
  );
  const [currency, setCurrency] = useState(employee?.currency ?? 'RWF');
  const [effectiveFrom, setEffectiveFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');
  const updateSalary = useUpdateEmployeeSalary();

  const target = employee ?? candidates.find((c) => c.id === selectedId) ?? null;
  const isUpdate = Boolean(employee && !hasNoSalary(employee));

  async function save(): Promise<void> {
    if (!target) return;
    try {
      await updateSalary.mutateAsync({
        employeeId: target.id,
        payload: {
          newSalary: parseFloat(newSalary),
          currency,
          effectiveFrom,
          reason: reason || undefined,
        },
      });
      toast.success(isUpdate ? 'Salary updated' : 'Salary set');
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to save salary');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="text-lg font-semibold text-cdy-white">
          {isUpdate ? 'Update Employee Salary' : 'Set Employee Salary'}
        </h2>
        <div className="mt-4 space-y-3">
          {employee ? (
            <div className="rounded-md border border-cdy-navy-border bg-cdy-navy/50 px-3 py-2 text-sm text-cdy-white">
              {employeeName(employee)}{' '}
              <span className="text-cdy-muted">({employee.email})</span>
            </div>
          ) : (
            <label className="block text-sm text-cdy-muted">
              Employee (no salary set yet)
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                <option value="">— Select employee —</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {employeeName(c)} ({c.email})
                  </option>
                ))}
              </select>
              {candidates.length === 0 && (
                <span className="mt-1 block text-xs text-cdy-muted">
                  Every active employee already has a salary set.
                </span>
              )}
            </label>
          )}
          <label className="block text-sm text-cdy-muted">
            New base salary
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newSalary}
              onChange={(e) => setNewSalary(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-cdy-muted">
            Effective from
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Reason (optional)
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual raise, promotion"
              className="mt-1"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={updateSalary.isPending || !target || !newSalary}
            onClick={() => void save()}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeSalariesPage(): JSX.Element {
  const { data: employees, isLoading } = useEmployees({ status: 'ACTIVE' });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEmployee, setModalEmployee] = useState<EmployeeRecord | null>(null);

  if (isLoading) return <InvoiceTableSkeleton />;

  const all = (employees ?? []) as EmployeeRecord[];
  const noSalaryEmployees = all.filter(hasNoSalary);

  function openCreate(): void {
    setModalEmployee(null);
    setModalOpen(true);
  }

  function openUpdate(employee: EmployeeRecord): void {
    setModalEmployee(employee);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/payroll" className="hover:text-cdy-white">Payroll</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Employee Salaries</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cdy-white">Employee Salaries</h1>
        <PermissionGate feature="hr.payroll" action="write">
          <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={openCreate}>
            Add Employee Salary
          </Button>
        </PermissionGate>
      </div>

      {noSalaryEmployees.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <span>
            ⚠ {noSalaryEmployees.length} active employee
            {noSalaryEmployees.length === 1 ? '' : 's'} without a salary set — they will
            be skipped when running payroll.
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium text-right">Base Salary</th>
              <th className="px-4 py-3 font-medium">Currency</th>
              <th className="px-4 py-3 font-medium">Effective From</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {all.map((employee) => {
              const noSalary = hasNoSalary(employee);
              return (
                <tr key={employee.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3 text-cdy-white">{employeeName(employee)}</td>
                  <td className="px-4 py-3 text-cdy-muted">{employee.email}</td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {noSalary ? (
                      <span className="text-amber-400">Not set</span>
                    ) : (
                      formatCurrency(employee.baseSalary ?? 0, employee.currency)
                    )}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">{employee.currency}</td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {employee.salaryEffectiveFrom
                      ? format(new Date(employee.salaryEffectiveFrom), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PermissionGate feature="hr.payroll" action="write">
                      <button
                        type="button"
                        className="text-cdy-red hover:underline"
                        onClick={() => openUpdate(employee)}
                      >
                        {noSalary ? 'Set Salary' : 'Update'}
                      </button>
                    </PermissionGate>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <SalaryModal
          employee={modalEmployee}
          candidates={noSalaryEmployees}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
