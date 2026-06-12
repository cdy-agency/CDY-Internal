'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Download, Plus } from 'lucide-react';
import { EmployeeStatus } from '@cdy/shared';
import { useEmployees, useDepartments, type EmployeeFilters } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';

type ViewMode = 'cards' | 'table';

const STATUS_OPTIONS: Array<{ value: EmployeeStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: EmployeeStatus.ACTIVE, label: 'Active' },
  { value: EmployeeStatus.ON_LEAVE, label: 'On leave' },
  { value: EmployeeStatus.SUSPENDED, label: 'Suspended' },
  { value: EmployeeStatus.RESIGNED, label: 'Resigned' },
];

function statusBadge(status: EmployeeStatus): string {
  const map: Record<EmployeeStatus, string> = {
    [EmployeeStatus.ACTIVE]: 'bg-emerald-500/20 text-emerald-400',
    [EmployeeStatus.ON_LEAVE]: 'bg-amber-500/20 text-amber-400',
    [EmployeeStatus.SUSPENDED]: 'bg-orange-500/20 text-orange-400',
    [EmployeeStatus.RESIGNED]: 'bg-cdy-muted/20 text-cdy-muted',
    [EmployeeStatus.TERMINATED]: 'bg-cdy-red/20 text-cdy-red',
  };
  return map[status] ?? 'bg-cdy-muted/20 text-cdy-muted';
}

export default function EmployeesPage(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [applied, setApplied] = useState<EmployeeFilters>({});

  const { data: employees, isLoading } = useEmployees(applied);
  const { data: departments } = useDepartments();

  function applyFilters(): void {
    setApplied({ ...filters });
  }

  function resetFilters(): void {
    setFilters({});
    setApplied({});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-cdy-white">Employee Directory</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-cdy-navy-border">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'cards'
                  ? 'bg-cdy-red/15 text-cdy-red'
                  : 'text-cdy-muted hover:text-cdy-white',
              )}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'table'
                  ? 'bg-cdy-red/15 text-cdy-red'
                  : 'text-cdy-muted hover:text-cdy-white',
              )}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" disabled title="Export coming soon">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <PermissionGate feature="hr.employees" action="write">
            <Link href="/hr/employees/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </Link>
          </PermissionGate>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4">
        <Input
          placeholder="Search name, email, code…"
          value={filters.search ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value || undefined }))
          }
          className="max-w-xs"
        />
        <select
          value={filters.departmentId ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              departmentId: e.target.value || undefined,
            }))
          }
          className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
        >
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: e.target.value || undefined,
            }))
          }
          className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button onClick={applyFilters}>Apply</Button>
        <Button variant="outline" onClick={resetFilters}>
          Reset
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-cdy-muted">Loading employees…</p>
      ) : (employees?.length ?? 0) === 0 ? (
        <p className="text-sm text-cdy-muted">No employees found.</p>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees?.map((emp) => (
            <Link
              key={emp.id}
              href={`/hr/employees/${emp.id}`}
              className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 transition-colors hover:border-cdy-red/50"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cdy-red/20 text-lg font-semibold text-cdy-red">
                {emp.firstName[0]}
                {emp.lastName[0]}
              </div>
              <p className="font-medium text-cdy-white">
                {emp.firstName} {emp.lastName}
              </p>
              <p className="text-sm text-cdy-muted">{emp.jobTitle}</p>
              <p className="mt-1 text-xs text-cdy-muted">
                {'departmentName' in emp
                  ? (emp.departmentName ?? 'No department')
                  : '—'}
              </p>
              <span
                className={cn(
                  'mt-2 inline-block rounded-full px-2 py-0.5 text-xs',
                  statusBadge(emp.status),
                )}
              >
                {emp.status.replace('_', ' ')}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50">
          <table className="w-full text-sm">
            <thead className="bg-cdy-navy-light">
              <tr className="text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Job Title</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy-light/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-cdy-muted">
                    {emp.employeeCode}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/hr/employees/${emp.id}`}
                      className="text-cdy-white hover:text-cdy-red"
                    >
                      {emp.firstName} {emp.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">{emp.jobTitle}</td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {'departmentName' in emp
                      ? (emp.departmentName ?? '—')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">{emp.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        statusBadge(emp.status),
                      )}
                    >
                      {emp.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
