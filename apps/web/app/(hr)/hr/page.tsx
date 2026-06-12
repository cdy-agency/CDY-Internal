'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Users, UserCheck, CalendarOff, UserPlus } from 'lucide-react';
import { LeaveStatus } from '@cdy/shared';
import {
  useHrSummary,
  useLeaveRequests,
  useReviewLeaveRequest,
} from '@/hooks/useHr';
import { MetricCard } from '@/components/finance/MetricCard';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';

export default function HrOverviewPage(): JSX.Element {
  const { data: summary, isLoading } = useHrSummary();
  const { data: pendingRequests } = useLeaveRequests({
    status: LeaveStatus.PENDING,
  });
  const reviewLeave = useReviewLeaveRequest();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const maxDeptCount = Math.max(
    ...(summary?.byDepartment.map((d) => d.count) ?? [1]),
    1,
  );

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
      toast.success(action === 'APPROVE' ? 'Leave approved' : 'Leave rejected');
      setRejectId(null);
      setRejectReason('');
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Employees"
          value={String(summary?.totalEmployees ?? 0)}
          delta={0}
          deltaLabel="vs last month"
          icon={Users}
          iconColor="bg-cdy-red/20 text-cdy-red"
          isLoading={isLoading}
        />
        <MetricCard
          label="Active"
          value={String(summary?.activeEmployees ?? 0)}
          delta={0}
          deltaLabel="currently active"
          icon={UserCheck}
          iconColor="bg-emerald-500/20 text-emerald-400"
          isLoading={isLoading}
        />
        <MetricCard
          label="On Leave Today"
          value={String(summary?.onLeaveToday ?? 0)}
          delta={0}
          deltaLabel="approved leave"
          icon={CalendarOff}
          iconColor="bg-amber-500/20 text-amber-400"
          isLoading={isLoading}
        />
        <MetricCard
          label="New This Month"
          value={String(summary?.newThisMonth ?? 0)}
          delta={0}
          deltaLabel="new hires"
          icon={UserPlus}
          iconColor="bg-blue-500/20 text-blue-400"
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          <h2 className="mb-4 text-lg font-semibold text-cdy-white">
            Employees by Department
          </h2>
          {isLoading ? (
            <p className="text-sm text-cdy-muted">Loading…</p>
          ) : (summary?.byDepartment.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">No department data yet.</p>
          ) : (
            <div className="space-y-3">
              {summary?.byDepartment.map((dept) => (
                <div key={dept.department}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-cdy-white">{dept.department}</span>
                    <span className="text-cdy-muted">{dept.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className="h-full rounded-full bg-cdy-red transition-all"
                      style={{
                        width: `${(dept.count / maxDeptCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          <h2 className="mb-4 text-lg font-semibold text-cdy-white">
            Today&apos;s Attendance
          </h2>
          {isLoading ? (
            <p className="text-sm text-cdy-muted">Loading…</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-emerald-400">
                  {summary?.attendanceToday.checkedIn ?? 0}
                </p>
                <p className="text-xs text-cdy-muted">Checked in</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-amber-400">
                  {summary?.attendanceToday.notYetCheckedIn ?? 0}
                </p>
                <p className="text-xs text-cdy-muted">Not yet in</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-blue-400">
                  {summary?.attendanceToday.onLeave ?? 0}
                </p>
                <p className="text-xs text-cdy-muted">On leave</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h2 className="mb-4 text-lg font-semibold text-cdy-white">
          Upcoming Leave (14 days)
        </h2>
        {(summary?.upcomingLeave.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">No upcoming leave scheduled.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="pb-2 pr-4 font-medium">Employee</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {summary?.upcomingLeave.map((item) => (
                  <tr
                    key={`${item.employeeId}-${item.startDate}`}
                    className="border-b border-cdy-navy-border/50"
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/hr/employees/${item.employeeId}`}
                        className="text-cdy-white hover:text-cdy-red"
                      >
                        {item.employeeName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">{item.leaveType}</td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {format(new Date(item.startDate), 'MMM d')} –{' '}
                      {format(new Date(item.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2 text-cdy-muted">{item.totalDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PermissionGate feature="hr.attendance" action="write">
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cdy-white">
              Pending Leave Requests
              {summary?.pendingLeaveRequests != null && (
                <span className="ml-2 rounded-full bg-cdy-red/20 px-2 py-0.5 text-sm text-cdy-red">
                  {summary.pendingLeaveRequests}
                </span>
              )}
            </h2>
            <Link
              href="/hr/leave"
              className="text-sm text-cdy-red hover:underline"
            >
              View all
            </Link>
          </div>
          {(pendingRequests?.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests?.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-cdy-navy-border bg-cdy-navy p-4"
                >
                  <div>
                    <p className="font-medium text-cdy-white">
                      {req.employee.firstName} {req.employee.lastName}
                    </p>
                    <p className="text-sm text-cdy-muted">
                      {req.leaveType.name} ·{' '}
                      {format(new Date(req.startDate), 'MMM d')} –{' '}
                      {format(new Date(req.endDate), 'MMM d')} ·{' '}
                      {Number(req.totalDays)} days
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {rejectId === req.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          placeholder="Rejection reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="rounded-md border border-cdy-navy-border bg-cdy-navy-light px-2 py-1 text-sm text-cdy-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!rejectReason.trim() || reviewLeave.isPending}
                          onClick={() =>
                            void handleReview(req.id, 'REJECT', rejectReason)
                          }
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRejectId(null);
                            setRejectReason('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          disabled={reviewLeave.isPending}
                          onClick={() => void handleReview(req.id, 'APPROVE')}
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
