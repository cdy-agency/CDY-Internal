'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { AttendanceStatus, ReviewStatus } from '@cdy/shared';
import {
  useEmployee,
  useEmployeeLeaveBalances,
  useAttendanceReport,
  useEmployeeSalaryHistory,
  useUpdateEmployeeSalary,
  useEmployeePerformanceReviews,
  useEmployeeOnboarding,
  useMarkOnboardingItemComplete,
  currentMonthParam,
} from '@/hooks/useHr';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from '@/lib/utils';

type Tab =
  | 'overview'
  | 'leave'
  | 'attendance'
  | 'salary'
  | 'performance'
  | 'onboarding';

const TABS: Array<{
  id: Tab;
  label: string;
  gated?: 'payroll' | 'performance';
}> = [
  { id: 'overview', label: 'Overview' },
  { id: 'leave', label: 'Leave Balances' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'performance', label: 'Performance', gated: 'performance' },
  { id: 'salary', label: 'Salary', gated: 'payroll' },
  { id: 'onboarding', label: 'Onboarding' },
];

function attendanceHeatColor(status: AttendanceStatus | null): string {
  if (!status) return 'bg-cdy-navy border border-cdy-navy-border';
  const map: Record<AttendanceStatus, string> = {
    [AttendanceStatus.PRESENT]: 'bg-emerald-500/60',
    [AttendanceStatus.ABSENT]: 'bg-cdy-red/60',
    [AttendanceStatus.HALF_DAY]: 'bg-amber-500/60',
    [AttendanceStatus.ON_LEAVE]: 'bg-blue-500/60',
    [AttendanceStatus.PUBLIC_HOLIDAY]: 'bg-purple-500/40',
    [AttendanceStatus.WEEKEND]: 'bg-cdy-navy-light',
  };
  return map[status] ?? 'bg-cdy-navy-light';
}

export default function EmployeeProfilePage(): JSX.Element {
  const params = useParams();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>('overview');
  const [attendanceMonth, setAttendanceMonth] = useState(currentMonthParam());
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [newSalary, setNewSalary] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('RWF');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [salaryReason, setSalaryReason] = useState('Annual review');

  const { data: employee, isLoading } = useEmployee(id);
  const { data: balances } = useEmployeeLeaveBalances(id);
  const { data: attendanceReport } = useAttendanceReport(id, attendanceMonth);
  const { data: salaryData } = useEmployeeSalaryHistory(id);
  const { data: performanceReviews } = useEmployeePerformanceReviews(id);
  const { data: onboarding } = useEmployeeOnboarding(id);
  const updateSalary = useUpdateEmployeeSalary();
  const markOnboardingComplete = useMarkOnboardingItemComplete();

  if (isLoading) {
    return <p className="text-sm text-cdy-muted">Loading profile…</p>;
  }

  if (!employee) {
    return <p className="text-sm text-cdy-muted">Employee not found.</p>;
  }

  const recordByDate = new Map(
    attendanceReport?.records.map((r) => [
      format(new Date(r.date), 'yyyy-MM-dd'),
      r.status,
    ]) ?? [],
  );

  const monthDate = new Date(`${attendanceMonth}-01`);
  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  });
  const startPad = getDay(startOfMonth(monthDate));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cdy-red/20 text-2xl font-semibold text-cdy-red">
            {employee.firstName[0]}
            {employee.lastName[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-cdy-white">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-cdy-muted">{employee.jobTitle}</p>
            <p className="text-sm text-cdy-muted">
              {employee.employeeCode} · {employee.departmentName ?? 'No department'}
            </p>
          </div>
        </div>
        <Link
          href="/hr/employees"
          className="text-sm text-cdy-muted hover:text-cdy-white"
        >
          ← Back to directory
        </Link>
      </div>

      <div className="flex gap-1 border-b border-cdy-navy-border">
        {TABS.map((t) => {
          if (t.gated === 'payroll') {
            return (
              <PermissionGate
                key={t.id}
                feature="hr.payroll"
                action="read"
                fallback={null}
              >
                <TabButton tab={t.id} label={t.label} active={tab === t.id} onSelect={setTab} />
              </PermissionGate>
            );
          }
          if (t.gated === 'performance') {
            return (
              <PermissionGate
                key={t.id}
                feature="hr.performance"
                action="read"
                fallback={null}
              >
                <TabButton tab={t.id} label={t.label} active={tab === t.id} onSelect={setTab} />
              </PermissionGate>
            );
          }
          return (
            <TabButton key={t.id} tab={t.id} label={t.label} active={tab === t.id} onSelect={setTab} />
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
            <h3 className="mb-4 font-semibold text-cdy-white">Contact</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Email</dt>
                <dd className="text-cdy-white">{employee.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Phone</dt>
                <dd className="text-cdy-white">{employee.phone ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Emergency</dt>
                <dd className="text-cdy-white">
                  {employee.emergencyContactName ?? '—'}
                  {employee.emergencyContactPhone
                    ? ` (${employee.emergencyContactPhone})`
                    : ''}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
            <h3 className="mb-4 font-semibold text-cdy-white">Employment</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Status</dt>
                <dd className="text-cdy-white">{employee.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Type</dt>
                <dd className="text-cdy-white">
                  {employee.employmentType.replace('_', ' ')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Start date</dt>
                <dd className="text-cdy-white">
                  {format(new Date(employee.startDate), 'MMM d, yyyy')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Manager</dt>
                <dd className="text-cdy-white">
                  {employee.managerName ?? '—'}
                </dd>
              </div>
            </dl>
          </div>
          {(employee.directReports?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5 lg:col-span-2">
              <h3 className="mb-4 font-semibold text-cdy-white">
                Direct Reports
              </h3>
              <ul className="space-y-2">
                {employee.directReports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/hr/employees/${r.id}`}
                      className="text-sm text-cdy-white hover:text-cdy-red"
                    >
                      {r.firstName} {r.lastName} — {r.jobTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'leave' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(balances?.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">No leave balances found.</p>
          ) : (
            balances?.map((b) => (
              <div
                key={b.id}
                className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4"
              >
                <p className="font-medium text-cdy-white">{b.leaveType.name}</p>
                <p className="mt-2 text-2xl font-semibold text-cdy-red">
                  {Number(b.remaining)} days
                </p>
                <p className="mt-1 text-xs text-cdy-muted">
                  {Number(b.used)} used · {Number(b.pending)} pending ·{' '}
                  {Number(b.entitled)} entitled
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label htmlFor="attendanceMonth" className="text-sm text-cdy-muted">
              Month
            </label>
            <input
              id="attendanceMonth"
              type="month"
              value={attendanceMonth}
              onChange={(e) => setAttendanceMonth(e.target.value)}
              className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white"
            />
          </div>
          {attendanceReport && (
            <div className="flex flex-wrap gap-4 text-sm text-cdy-muted">
              <span>{attendanceReport.summary.present} present</span>
              <span>{attendanceReport.summary.absent} absent</span>
              <span>{attendanceReport.summary.onLeave} on leave</span>
              <span>{attendanceReport.summary.totalHours.toFixed(1)} hrs</span>
            </div>
          )}
          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4">
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-cdy-muted">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const status = recordByDate.get(key) ?? null;
                return (
                  <div
                    key={key}
                    title={`${format(day, 'MMM d')}: ${status ?? 'No record'}`}
                    className={cn(
                      'aspect-square rounded-sm',
                      attendanceHeatColor(status),
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'salary' && (
        <PermissionGate feature="hr.payroll" action="read">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-cdy-white">Salary History</h3>
              <PermissionGate feature="hr.payroll" action="write">
                <Button size="sm" onClick={() => setSalaryModalOpen(true)}>
                  Update Salary
                </Button>
              </PermissionGate>
            </div>
            {salaryData && (
              <p className="text-sm text-cdy-muted">
                Current:{' '}
                <span className="font-medium text-cdy-white">
                  {formatCurrency(salaryData.current.baseSalary, salaryData.current.currency)}
                </span>{' '}
                — effective{' '}
                {format(new Date(salaryData.current.effectiveFrom), 'MMM d, yyyy')}
              </p>
            )}
            <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50">
              <table className="w-full text-sm">
                <thead className="bg-cdy-navy-light text-left text-cdy-muted">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2">To</th>
                    <th className="px-4 py-2">Change</th>
                    <th className="px-4 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(salaryData?.history.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-cdy-muted">
                        No salary changes recorded yet.
                      </td>
                    </tr>
                  ) : (
                    salaryData?.history.map((h) => {
                      const change = h.newSalary - h.previousSalary;
                      return (
                        <tr key={h.id} className="border-t border-cdy-navy-border/30">
                          <td className="px-4 py-2 text-cdy-white">
                            {format(new Date(h.effectiveFrom), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-2 text-cdy-muted">
                            {formatCurrency(h.previousSalary, h.currency)}
                          </td>
                          <td className="px-4 py-2 text-cdy-white">
                            {formatCurrency(h.newSalary, h.currency)}
                          </td>
                          <td className="px-4 py-2 text-emerald-400">
                            {change >= 0 ? '+' : ''}
                            {formatCurrency(change, h.currency)}
                          </td>
                          <td className="px-4 py-2 text-cdy-muted">{h.reason ?? '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {salaryModalOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setSalaryModalOpen(false)} role="presentation" />
              <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
                <h3 className="mb-4 font-semibold text-cdy-white">Update Salary</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-cdy-muted">New salary</label>
                    <div className="mt-1 flex gap-2">
                      <Input type="number" value={newSalary} onChange={(e) => setNewSalary(e.target.value)} />
                      <select
                        value={salaryCurrency}
                        onChange={(e) => setSalaryCurrency(e.target.value)}
                        className="rounded-md border border-cdy-navy-border bg-cdy-navy px-2 text-sm text-cdy-white"
                      >
                        <option value="RWF">RWF</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-cdy-muted">Effective from</label>
                    <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-cdy-muted">Reason</label>
                    <select
                      value={salaryReason}
                      onChange={(e) => setSalaryReason(e.target.value)}
                      className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                    >
                      <option>Annual review</option>
                      <option>Promotion</option>
                      <option>Market adjustment</option>
                      <option>Custom</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSalaryModalOpen(false)}>Cancel</Button>
                  <Button
                    disabled={!newSalary || !effectiveFrom || updateSalary.isPending}
                    onClick={() => {
                      void updateSalary.mutateAsync({
                        employeeId: id,
                        payload: {
                          newSalary: Number(newSalary),
                          currency: salaryCurrency,
                          effectiveFrom,
                          reason: salaryReason,
                        },
                      }).then(() => setSalaryModalOpen(false));
                    }}
                  >
                    Save Salary Change
                  </Button>
                </div>
              </div>
            </>
          )}
        </PermissionGate>
      )}

      {tab === 'performance' && (
        <PermissionGate feature="hr.performance" action="read">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-cdy-white">
                Performance History — {employee.firstName} {employee.lastName}
              </h3>
              <PermissionGate feature="hr.performance" action="write">
                <Link href="/hr/performance">
                  <Button size="sm">Start New Review</Button>
                </Link>
              </PermissionGate>
            </div>
            {(performanceReviews?.length ?? 0) === 0 ? (
              <p className="text-sm text-cdy-muted">No performance reviews yet.</p>
            ) : (
              <>
                {(() => {
                  const completed = performanceReviews?.filter(
                    (r) => r.status === ReviewStatus.COMPLETED && r.overallRating,
                  ) ?? [];
                  const avg =
                    completed.length > 0
                      ? (
                          completed.reduce((s, r) => s + (r.overallRating ?? 0), 0) /
                          completed.length
                        ).toFixed(1)
                      : null;
                  return avg ? (
                    <p className="text-sm text-cdy-muted">
                      Average rating:{' '}
                      <span className="font-medium text-cdy-white">{avg} / 5.0</span>
                    </p>
                  ) : null;
                })()}
                <ul className="space-y-2">
                  {performanceReviews?.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light px-4 py-3"
                    >
                      <div>
                        <span className="font-medium text-cdy-white">{r.period}</span>
                        <span className="ml-2 text-sm text-cdy-muted">{r.status.replace('_', ' ')}</span>
                        {r.overallRating && (
                          <span className="ml-2 text-sm text-cdy-white">
                            Rating: {r.overallRating}/5
                          </span>
                        )}
                      </div>
                      <Link href={`/hr/performance/${r.id}`} className="text-sm text-cdy-red hover:underline">
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </PermissionGate>
      )}

      {tab === 'onboarding' && (
        !onboarding ? (
          <p className="text-sm text-cdy-muted">No onboarding checklist found for this employee.</p>
        ) : (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-cdy-white">
              Onboarding Checklist — {employee.firstName} {employee.lastName}
            </h3>
            <p className="mt-1 text-sm text-cdy-muted">
              Started: {format(new Date(onboarding.createdAt), 'MMM d, yyyy')} · Status:{' '}
              {onboarding.status.replace('_', ' ')}
              {onboarding.completedAt &&
                ` (${format(new Date(onboarding.completedAt), 'MMM d, yyyy')})`}
            </p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-sm text-cdy-muted">
                <span>
                  Progress: {onboarding.progress.completed}/{onboarding.progress.total} items
                </span>
                <span>
                  {Math.round(
                    (onboarding.progress.completed / onboarding.progress.total) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                <div
                  className="h-full bg-cdy-red transition-all"
                  style={{
                    width: `${(onboarding.progress.completed / onboarding.progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          {(['Documentation', 'IT Setup', 'Team Introduction', 'Training'] as const).map(
            (category) => {
              const items = onboarding.items.filter((i) => i.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category}>
                  <h4 className="mb-2 text-sm font-medium text-cdy-white">{category}</h4>
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const overdue =
                        !item.isCompleted &&
                        item.dueDate &&
                        new Date(item.dueDate) < new Date();
                      return (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-cdy-navy-border/30 bg-cdy-navy-light px-3 py-2 text-sm"
                        >
                          <div>
                            <span className={item.isCompleted ? 'text-cdy-muted line-through' : 'text-cdy-white'}>
                              {item.isCompleted ? '☑' : '☐'} {item.title}
                            </span>
                            {item.completedAt && (
                              <span className="ml-2 text-xs text-cdy-muted">
                                {format(new Date(item.completedAt), 'MMM d')}
                              </span>
                            )}
                            {overdue && (
                              <span className="ml-2 text-xs text-amber-400">Overdue</span>
                            )}
                          </div>
                          {!item.isCompleted && (
                            <PermissionGate feature="hr.employees" action="write">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={markOnboardingComplete.isPending}
                                onClick={() => {
                                  void markOnboardingComplete.mutateAsync({
                                    employeeId: id,
                                    itemId: item.id,
                                  });
                                }}
                              >
                                Mark complete
                              </Button>
                            </PermissionGate>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            },
          )}
        </div>
        )
      )}
    </div>
  );
}

function TabButton({
  tab,
  label,
  active,
  onSelect,
}: {
  tab: Tab;
  label: string;
  active: boolean;
  onSelect: (t: Tab) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      className={cn(
        'px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-b-2 border-cdy-red text-cdy-red'
          : 'text-cdy-muted hover:text-cdy-white',
      )}
    >
      {label}
    </button>
  );
}
