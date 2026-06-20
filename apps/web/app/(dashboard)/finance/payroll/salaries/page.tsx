'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useEmployeeSalaries } from '@/hooks/usePayroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { formatCurrency } from '@/lib/utils';
import type { EmployeeSalary } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';

function SalaryModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: EmployeeSalary;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [employeeId, setEmployeeId] = useState(existing?.employeeId ?? '');
  const [employeeName, setEmployeeName] = useState(existing?.employeeName ?? '');
  const [employeeEmail, setEmployeeEmail] = useState(existing?.employeeEmail ?? '');
  const [baseSalary, setBaseSalary] = useState(
    existing ? String(existing.baseSalary) : '',
  );
  const [currency, setCurrency] = useState(existing?.currency ?? 'RWF');
  const [effectiveFrom, setEffectiveFrom] = useState(
    existing
      ? format(new Date(existing.effectiveFrom), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
  );
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      if (existing) {
        await api.patch(`/payroll/salaries/${existing.id}`, {
          employeeName,
          employeeEmail,
          baseSalary: parseFloat(baseSalary),
          currency,
          effectiveFrom,
        });
        toast.success('Salary updated');
      } else {
        await api.post('/payroll/salaries', {
          employeeId,
          employeeName,
          employeeEmail,
          baseSalary: parseFloat(baseSalary),
          currency,
          effectiveFrom,
        });
        toast.success('Salary created');
      }
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
      <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="text-lg font-semibold text-cdy-white">
          {existing ? 'Edit Salary' : 'Add Employee Salary'}
        </h2>
        <div className="mt-4 space-y-3">
          {!existing && (
            <label className="block text-sm text-cdy-muted">
              Employee ID
              <Input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="mt-1"
              />
            </label>
          )}
          <label className="block text-sm text-cdy-muted">
            Employee name
            <Input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Employee email
            <Input
              type="email"
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Base salary
            <Input
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Currency
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1"
            />
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
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={saving}
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
  const queryClient = useQueryClient();
  const { data: salaries, isLoading } = useEmployeeSalaries();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSalary, setEditSalary] = useState<EmployeeSalary | undefined>();

  if (isLoading) return <InvoiceTableSkeleton />;

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
        <PermissionGate feature="finance.payroll" action="write">
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            onClick={() => {
              setEditSalary(undefined);
              setModalOpen(true);
            }}
          >
            Add Employee Salary
          </Button>
        </PermissionGate>
      </div>

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
            {(salaries ?? []).map((s) => (
              <tr key={s.id} className="border-b border-cdy-navy-border/50">
                <td className="px-4 py-3 text-cdy-white">{s.employeeName}</td>
                <td className="px-4 py-3 text-cdy-muted">{s.employeeEmail}</td>
                <td className="px-4 py-3 text-right text-cdy-white">
                  {formatCurrency(s.baseSalary)}
                </td>
                <td className="px-4 py-3 text-cdy-muted">{s.currency}</td>
                <td className="px-4 py-3 text-cdy-muted">
                  {format(new Date(s.effectiveFrom), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <PermissionGate feature="finance.payroll" action="write">
                    <button
                      type="button"
                      className="text-cdy-red hover:underline"
                      onClick={() => {
                        setEditSalary(s);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <SalaryModal
          existing={editSalary}
          onClose={() => setModalOpen(false)}
          onSaved={() =>
            void queryClient.invalidateQueries({ queryKey: ['payroll', 'salaries'] })
          }
        />
      )}
    </div>
  );
}
