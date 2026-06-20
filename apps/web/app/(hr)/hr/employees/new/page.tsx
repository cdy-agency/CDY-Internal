'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { EmploymentType } from '@cdy/shared';
import {
  useAvailableUsers,
  useDepartments,
  useEmployees,
  useCreateEmployee,
} from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';

type Tab = 'account' | 'personal' | 'employment' | 'compensation';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'account', label: 'Account Link' },
  { id: 'personal', label: 'Personal Info' },
  { id: 'employment', label: 'Employment' },
  { id: 'compensation', label: 'Compensation' },
];

const EMPLOYMENT_TYPES: Array<{ value: EmploymentType; label: string }> = [
  { value: EmploymentType.FULL_TIME, label: 'Full time' },
  { value: EmploymentType.PART_TIME, label: 'Part time' },
  { value: EmploymentType.CONTRACT, label: 'Contract' },
  { value: EmploymentType.INTERN, label: 'Intern' },
];

export default function NewEmployeePage(): JSX.Element {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('account');
  const createEmployee = useCreateEmployee();
  const { data: availableUsers } = useAvailableUsers();
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();

  const [form, setForm] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    departmentId: '',
    managerId: '',
    employmentType: EmploymentType.FULL_TIME,
    startDate: new Date().toISOString().slice(0, 10),
    baseSalary: '',
    currency: 'RWF',
    nationalId: '',
    bankName: '',
    bankAccount: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });

  function selectUser(userId: string): void {
    const user = availableUsers?.find((u) => u.id === userId);
    if (!user) return;
    setForm((f) => ({
      ...f,
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.userId || !form.jobTitle || !form.baseSalary) {
      toast.error('Please complete all required fields');
      return;
    }
    try {
      const employee = await createEmployee.mutateAsync({
        userId: form.userId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        jobTitle: form.jobTitle,
        departmentId: form.departmentId || undefined,
        managerId: form.managerId || undefined,
        employmentType: form.employmentType,
        startDate: form.startDate,
        baseSalary: Number(form.baseSalary),
        currency: form.currency,
        nationalId: form.nationalId || undefined,
        bankName: form.bankName || undefined,
        bankAccount: form.bankAccount || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Employee created');
      router.push(`/hr/employees/${employee.id}`);
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cdy-white">Add Employee</h2>
        <Link href="/hr/employees" className="text-sm text-cdy-muted hover:text-cdy-white">
          ← Back to directory
        </Link>
      </div>

      <div className="flex gap-1 border-b border-cdy-navy-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-cdy-red text-cdy-red'
                : 'text-cdy-muted hover:text-cdy-white',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
        {tab === 'account' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="userId">Link to user account *</Label>
              <select
                id="userId"
                value={form.userId}
                onChange={(e) => selectUser(e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                <option value="">Select a user…</option>
                {availableUsers?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            {form.userId && (
              <p className="text-sm text-cdy-muted">
                Selected: {form.firstName} {form.lastName} — {form.email}
              </p>
            )}
          </div>
        )}

        {tab === 'personal' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="nationalId">National ID</Label>
              <Input
                id="nationalId"
                value={form.nationalId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nationalId: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="emergencyContactName">Emergency contact</Label>
              <Input
                id="emergencyContactName"
                value={form.emergencyContactName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergencyContactName: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="emergencyContactPhone">Emergency phone</Label>
              <Input
                id="emergencyContactPhone"
                value={form.emergencyContactPhone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergencyContactPhone: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}

        {tab === 'employment' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="jobTitle">Job title *</Label>
              <Input
                id="jobTitle"
                value={form.jobTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jobTitle: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <select
                id="departmentId"
                value={form.departmentId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departmentId: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                <option value="">None</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="managerId">Manager</Label>
              <select
                id="managerId"
                value={form.managerId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, managerId: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                <option value="">None</option>
                {employees?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="employmentType">Employment type</Label>
              <select
                id="employmentType"
                value={form.employmentType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    employmentType: e.target.value as EmploymentType,
                  }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {tab === 'compensation' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="baseSalary">Base salary *</Label>
              <Input
                id="baseSalary"
                type="number"
                min="0"
                step="0.01"
                value={form.baseSalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, baseSalary: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                value={form.bankName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bankName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="bankAccount">Bank account</Label>
              <Input
                id="bankAccount"
                value={form.bankAccount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bankAccount: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/hr/employees">
          <Button variant="outline">Cancel</Button>
        </Link>
        <PermissionGate feature="hr.employees" action="write">
          <Button
            onClick={() => void handleSubmit()}
            disabled={createEmployee.isPending}
          >
            {createEmployee.isPending ? 'Creating…' : 'Create Employee'}
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
