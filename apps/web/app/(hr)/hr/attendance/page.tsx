'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { AttendanceStatus } from '@cdy/shared';
import type { AttendanceRecord } from '@cdy/shared';
import { useAttendance } from '@/hooks/useHr';
import api from '@/lib/api';
import { PermissionGate } from '@/components/PermissionGate';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

function statusBadge(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    [AttendanceStatus.PRESENT]: 'bg-emerald-500/20 text-emerald-400',
    [AttendanceStatus.ABSENT]: 'bg-cdy-red/20 text-cdy-red',
    [AttendanceStatus.HALF_DAY]: 'bg-amber-500/20 text-amber-400',
    [AttendanceStatus.ON_LEAVE]: 'bg-blue-500/20 text-blue-400',
    [AttendanceStatus.PUBLIC_HOLIDAY]: 'bg-purple-500/20 text-purple-400',
    [AttendanceStatus.WEEKEND]: 'bg-cdy-muted/20 text-cdy-muted',
  };
  return map[status] ?? 'bg-cdy-muted/20 text-cdy-muted';
}

export default function AttendanceOverviewPage(): JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: records, isLoading } = useAttendance({ date: today });
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteRecord(): Promise<void> {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/hr/attendance/${deleteTarget.id}`);
      toast.success('Attendance record deleted');
      void queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      setDeleteTarget(null);
    } catch {
      /* interceptor already toasts */
    } finally {
      setIsDeleting(false);
    }
  }

  const present = records?.filter(
    (r) => r.status === AttendanceStatus.PRESENT,
  ).length ?? 0;
  const absent = records?.filter(
    (r) => r.status === AttendanceStatus.ABSENT,
  ).length ?? 0;
  const onLeave = records?.filter(
    (r) => r.status === AttendanceStatus.ON_LEAVE,
  ).length ?? 0;
  const halfDay = records?.filter(
    (r) => r.status === AttendanceStatus.HALF_DAY,
  ).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-cdy-white">
          Today&apos;s Attendance
        </h2>
        <p className="text-sm text-cdy-muted">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
          <p className="text-3xl font-semibold text-emerald-400">{present}</p>
          <p className="text-sm text-cdy-muted">Present</p>
        </div>
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
          <p className="text-3xl font-semibold text-cdy-red">{absent}</p>
          <p className="text-sm text-cdy-muted">Absent</p>
        </div>
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
          <p className="text-3xl font-semibold text-blue-400">{onLeave}</p>
          <p className="text-sm text-cdy-muted">On leave</p>
        </div>
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
          <p className="text-3xl font-semibold text-amber-400">{halfDay}</p>
          <p className="text-sm text-cdy-muted">Half day</p>
        </div>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h3 className="mb-4 font-semibold text-cdy-white">All Records</h3>
        {isLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : (records?.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">
            No attendance records for today yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="pb-2 pr-4 font-medium">Employee</th>
                  <th className="pb-2 pr-4 font-medium">Department</th>
                  <th className="pb-2 pr-4 font-medium">Check in</th>
                  <th className="pb-2 pr-4 font-medium">Check out</th>
                  <th className="pb-2 pr-4 font-medium">Hours</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {records?.map((rec) => (
                  <tr
                    key={rec.id}
                    className="border-b border-cdy-navy-border/50"
                  >
                    <td className="py-2 pr-4">
                      {rec.employee ? (
                        <Link
                          href={`/hr/employees/${rec.employee.id}`}
                          className="text-cdy-white hover:text-cdy-red"
                        >
                          {rec.employee.firstName} {rec.employee.lastName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {rec.employee?.department?.name ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {rec.checkInAt
                        ? format(new Date(rec.checkInAt), 'HH:mm')
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {rec.checkOutAt
                        ? format(new Date(rec.checkOutAt), 'HH:mm')
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {rec.workingHours != null
                        ? Number(rec.workingHours).toFixed(1)
                        : '—'}
                    </td>
                    <td className="py-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          statusBadge(rec.status),
                        )}
                      >
                        {rec.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2">
                      <PermissionGate feature="hr.attendance" action="write">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          className="text-cdy-muted hover:text-cdy-red"
                          aria-label="Delete attendance record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete attendance record?"
        description={
          deleteTarget?.employee
            ? `This will remove the record for ${deleteTarget.employee.firstName} ${deleteTarget.employee.lastName}.`
            : 'This will remove this attendance record.'
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={() => void handleDeleteRecord()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
