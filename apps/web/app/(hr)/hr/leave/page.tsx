'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import toast from 'react-hot-toast';
import { LeaveStatus } from '@cdy/shared';
import { useLeaveRequests, useReviewLeaveRequest } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';

function statusColor(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    [LeaveStatus.PENDING]: 'bg-amber-500/20 text-amber-400',
    [LeaveStatus.APPROVED]: 'bg-emerald-500/20 text-emerald-400',
    [LeaveStatus.REJECTED]: 'bg-cdy-red/20 text-cdy-red',
    [LeaveStatus.CANCELLED]: 'bg-cdy-muted/20 text-cdy-muted',
  };
  return map[status];
}

export default function LeaveManagementPage(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const { data: requests, isLoading } = useLeaveRequests(
    statusFilter ? { status: statusFilter } : {},
  );
  const reviewLeave = useReviewLeaveRequest();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const approvedThisMonth =
    requests?.filter(
      (r) =>
        r.status === LeaveStatus.APPROVED &&
        new Date(r.startDate) <= monthEnd &&
        new Date(r.endDate) >= monthStart,
    ) ?? [];

  function isOnLeave(day: Date, req: (typeof approvedThisMonth)[0]): boolean {
    const d = day.getTime();
    return (
      d >= new Date(req.startDate).setHours(0, 0, 0, 0) &&
      d <= new Date(req.endDate).setHours(23, 59, 59, 999)
    );
  }

  async function handleReview(
    id: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
  ): Promise<void> {
    try {
      await reviewLeave.mutateAsync({
        id,
        payload: {
          action,
          ...(action === 'REJECT' && reason ? { rejectionReason: reason } : {}),
        },
      });
      toast.success(action === 'APPROVE' ? 'Approved' : 'Rejected');
      setRejectId(null);
      setRejectReason('');
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-cdy-white">Leave Management</h2>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as LeaveStatus | '')
          }
          className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
        >
          <option value="">All statuses</option>
          <option value={LeaveStatus.PENDING}>Pending</option>
          <option value={LeaveStatus.APPROVED}>Approved</option>
          <option value={LeaveStatus.REJECTED}>Rejected</option>
          <option value={LeaveStatus.CANCELLED}>Cancelled</option>
        </select>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h3 className="mb-4 font-semibold text-cdy-white">
          Team Calendar — {format(now, 'MMMM yyyy')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-cdy-navy-light px-2 py-1 text-left text-cdy-muted">
                  Employee
                </th>
                {calendarDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="px-0.5 py-1 text-center text-cdy-muted"
                  >
                    {format(day, 'd')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {approvedThisMonth.length === 0 ? (
                <tr>
                  <td
                    colSpan={calendarDays.length + 1}
                    className="py-4 text-center text-cdy-muted"
                  >
                    No approved leave this month.
                  </td>
                </tr>
              ) : (
                Array.from(
                  new Map(
                    approvedThisMonth.map((r) => [
                      r.employeeId,
                      r.employee,
                    ]),
                  ).values(),
                ).map((emp) => (
                  <tr key={emp.id}>
                    <td className="sticky left-0 bg-cdy-navy-light px-2 py-1 text-cdy-white">
                      {emp.firstName[0]}. {emp.lastName}
                    </td>
                    {calendarDays.map((day) => {
                      const onLeave = approvedThisMonth.some(
                        (r) =>
                          r.employeeId === emp.id && isOnLeave(day, r),
                      );
                      return (
                        <td key={day.toISOString()} className="px-0.5 py-1">
                          <div
                            className={cn(
                              'mx-auto h-4 w-4 rounded-sm',
                              onLeave ? 'bg-blue-500/70' : 'bg-cdy-navy',
                            )}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h3 className="mb-4 font-semibold text-cdy-white">All Requests</h3>
        {isLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : (requests?.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">No leave requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="pb-2 pr-4 font-medium">Employee</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Dates</th>
                  <th className="pb-2 pr-4 font-medium">Days</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests?.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-cdy-navy-border/50"
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/hr/leave/${req.id}`}
                        className="text-cdy-white hover:text-cdy-red"
                      >
                        {req.employee.firstName} {req.employee.lastName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {req.leaveType.name}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {format(new Date(req.startDate), 'MMM d')} –{' '}
                      {format(new Date(req.endDate), 'MMM d')}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {Number(req.totalDays)}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          statusColor(req.status),
                        )}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {req.status === LeaveStatus.PENDING && (
                        <div className="flex gap-1">
                          {rejectId === req.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Reason"
                                value={rejectReason}
                                onChange={(e) =>
                                  setRejectReason(e.target.value)
                                }
                                className="w-24 rounded border border-cdy-navy-border bg-cdy-navy px-1 py-0.5 text-xs text-cdy-white"
                              />
                              <PermissionGate feature="hr.attendance" action="write">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    !rejectReason.trim() || reviewLeave.isPending
                                  }
                                  onClick={() =>
                                    void handleReview(
                                      req.id,
                                      'REJECT',
                                      rejectReason,
                                    )
                                  }
                                >
                                  OK
                                </Button>
                              </PermissionGate>
                            </div>
                          ) : (
                            <PermissionGate feature="hr.attendance" action="write">
                              <Button
                                size="sm"
                                disabled={reviewLeave.isPending}
                                onClick={() =>
                                  void handleReview(req.id, 'APPROVE')
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reviewLeave.isPending}
                                onClick={() => setRejectId(req.id)}
                              >
                                Reject
                              </Button>
                            </PermissionGate>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
