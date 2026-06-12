'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { LeaveStatus } from '@cdy/shared';
import { useLeaveRequest } from '@/hooks/useHr';
import { cn } from '@/lib/utils';

function statusColor(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    [LeaveStatus.PENDING]: 'bg-amber-500/20 text-amber-400',
    [LeaveStatus.APPROVED]: 'bg-emerald-500/20 text-emerald-400',
    [LeaveStatus.REJECTED]: 'bg-cdy-red/20 text-cdy-red',
    [LeaveStatus.CANCELLED]: 'bg-cdy-muted/20 text-cdy-muted',
  };
  return map[status];
}

export default function LeaveDetailPage(): JSX.Element {
  const params = useParams();
  const id = params.id as string;
  const { data: request, isLoading } = useLeaveRequest(id);

  if (isLoading) {
    return <p className="text-sm text-cdy-muted">Loading…</p>;
  }

  if (!request) {
    return <p className="text-sm text-cdy-muted">Leave request not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cdy-white">Leave Request</h2>
        <Link
          href="/hr/leave"
          className="text-sm text-cdy-muted hover:text-cdy-white"
        >
          ← Back
        </Link>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium',
              statusColor(request.status),
            )}
          >
            {request.status}
          </span>
          <span className="text-sm text-cdy-muted">
            Submitted {format(new Date(request.createdAt), 'MMM d, yyyy')}
          </span>
        </div>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-cdy-muted">Employee</dt>
            <dd className="mt-1 text-cdy-white">
              <Link
                href={`/hr/employees/${request.employee.id}`}
                className="hover:text-cdy-red"
              >
                {request.employee.firstName} {request.employee.lastName}
              </Link>
              <span className="ml-2 text-cdy-muted">
                ({request.employee.employeeCode})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-cdy-muted">Leave type</dt>
            <dd className="mt-1 text-cdy-white">{request.leaveType.name}</dd>
          </div>
          <div>
            <dt className="text-cdy-muted">Dates</dt>
            <dd className="mt-1 text-cdy-white">
              {format(new Date(request.startDate), 'EEEE, MMM d, yyyy')} –{' '}
              {format(new Date(request.endDate), 'EEEE, MMM d, yyyy')}
            </dd>
          </div>
          <div>
            <dt className="text-cdy-muted">Total days</dt>
            <dd className="mt-1 text-cdy-white">{Number(request.totalDays)}</dd>
          </div>
          {request.reason && (
            <div>
              <dt className="text-cdy-muted">Reason</dt>
              <dd className="mt-1 text-cdy-white">{request.reason}</dd>
            </div>
          )}
          {request.reviewedAt && (
            <div>
              <dt className="text-cdy-muted">Reviewed</dt>
              <dd className="mt-1 text-cdy-white">
                {format(new Date(request.reviewedAt), 'MMM d, yyyy HH:mm')}
              </dd>
            </div>
          )}
          {request.rejectionReason && (
            <div>
              <dt className="text-cdy-muted">Rejection reason</dt>
              <dd className="mt-1 text-cdy-red">{request.rejectionReason}</dd>
            </div>
          )}
          {request.cancelledAt && (
            <div>
              <dt className="text-cdy-muted">Cancelled</dt>
              <dd className="mt-1 text-cdy-white">
                {format(new Date(request.cancelledAt), 'MMM d, yyyy HH:mm')}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
