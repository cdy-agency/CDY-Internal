'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LeaveStatus } from '@cdy/shared';
import {
  useHrSummary,
  useLeaveRequests,
  useReviewLeaveRequest,
} from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import {
  MetricHero,
  SectionCard,
  GaugeChart,
  QualityBadge,
  DataTable,
} from '@/components/dashboard';

export default function HrOverviewPage(): JSX.Element {
  const { data: summary, isLoading } = useHrSummary();
  const { data: pendingRequests } = useLeaveRequests({ status: LeaveStatus.PENDING });
  const reviewLeave = useReviewLeaveRequest();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const totalActive = summary?.activeEmployees ?? 0;
  const onLeave = summary?.onLeaveToday ?? 0;
  const checkedIn = summary?.attendanceToday.checkedIn ?? 0;
  const expected = Math.max(totalActive - onLeave, 1);
  const attendanceRate = Math.round((checkedIn / expected) * 100);
  const attendanceQuality =
    attendanceRate >= 90 ? { label: 'EXCELLENT', variant: 'green' as const } :
    attendanceRate >= 70 ? { label: 'GOOD', variant: 'blue' as const } :
    attendanceRate >= 50 ? { label: 'NEEDS ATTENTION', variant: 'amber' as const } :
    { label: 'POOR', variant: 'red' as const };

  const maxDeptCount = Math.max(
    ...(summary?.byDepartment.map((d) => d.count) ?? [1]),
    1,
  );

  const DEPT_COLORS = [
    '#C41E3A', '#60A5FA', '#4ADE80', '#FBBF24',
    '#F97316', '#C084FC', '#F87171', '#94A3B8',
  ];

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
    <div className="space-y-6 p-6">
      {/* Row 1 — Hero metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SectionCard>
          <MetricHero
            value={String(summary?.totalEmployees ?? 0)}
            label="Total employees"
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={String(summary?.activeEmployees ?? 0)}
            label="Active headcount"
            trendLabel={`${summary?.onLeaveToday ?? 0} on leave today`}
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={String(summary?.newThisMonth ?? 0)}
            label="New hires MTD"
            badge={
              (summary?.newThisMonth ?? 0) > 0 ? 'NEW' : undefined
            }
            badgeVariant="blue"
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={String(summary?.pendingLeaveRequests ?? 0)}
            label="Pending leave requests"
            badge={
              (summary?.pendingLeaveRequests ?? 0) > 0
                ? 'ACTION REQUIRED'
                : 'ALL CLEAR'
            }
            badgeVariant={
              (summary?.pendingLeaveRequests ?? 0) > 0 ? 'amber' : 'green'
            }
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
      </div>

      {/* Row 2 — Attendance gauge + Department breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Today's attendance">
          <div className="flex items-center gap-6">
            <GaugeChart value={attendanceRate} label="present today" />
            <div className="space-y-3">
              <QualityBadge
                label={attendanceQuality.label}
                variant={attendanceQuality.variant}
              />
              <div className="space-y-1 text-sm text-cdy-muted">
                <p>
                  <span className="font-mono text-emerald-400">
                    {summary?.attendanceToday.checkedIn ?? 0}
                  </span>{' '}
                  checked in
                </p>
                <p>
                  <span className="font-mono text-amber-400">
                    {summary?.attendanceToday.notYetCheckedIn ?? 0}
                  </span>{' '}
                  not yet in
                </p>
                <p>
                  <span className="font-mono text-blue-400">
                    {summary?.attendanceToday.onLeave ?? 0}
                  </span>{' '}
                  on approved leave
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Headcount by department">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-32 animate-pulse rounded bg-cdy-navy" />
                  <div className="h-1.5 animate-pulse rounded-full bg-cdy-navy" />
                </div>
              ))}
            </div>
          ) : (summary?.byDepartment.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">No department data yet.</p>
          ) : (
            <div className="space-y-3">
              {summary?.byDepartment.map((dept, i) => (
                <div key={dept.department}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-cdy-muted">{dept.department}</span>
                    <span className="font-mono text-cdy-white">{dept.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(dept.count / maxDeptCount) * 100}%`,
                        backgroundColor:
                          DEPT_COLORS[i % DEPT_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 3 — Upcoming leave */}
      <SectionCard
        title="Upcoming leave — next 14 days"
        action={
          <Link href="/hr/leave" className="text-xs text-cdy-red hover:underline">
            View all →
          </Link>
        }
      >
        <DataTable
          columns={['Employee', 'Type', 'Start', 'End', 'Days']}
          rows={(summary?.upcomingLeave ?? []).map((item) => [
            item.employeeName,
            item.leaveType,
            format(new Date(item.startDate), 'MMM d'),
            format(new Date(item.endDate), 'MMM d, yyyy'),
            String(item.totalDays),
          ])}
        />
      </SectionCard>

      {/* Row 4 — Pending leave requests (write-gated) */}
      <PermissionGate feature="hr.attendance" action="write">
        <SectionCard
          title={`Pending leave requests${(summary?.pendingLeaveRequests ?? 0) > 0 ? ` (${summary!.pendingLeaveRequests})` : ''}`}
          action={
            <Link href="/hr/leave" className="text-xs text-cdy-red hover:underline">
              View all →
            </Link>
          }
        >
          {(pendingRequests?.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests?.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cdy-navy-border bg-cdy-navy p-4"
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
        </SectionCard>
      </PermissionGate>
    </div>
  );
}
