'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { LeaveStatus } from '@cdy/shared';
import { useLeaveRequest } from '@/hooks/useHr';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const { data: request, isLoading } = useLeaveRequest(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) {
    return <p className="text-sm text-cdy-muted">Loading…</p>;
  }

  if (!request) {
    return <p className="text-sm text-cdy-muted">Leave request not found.</p>;
  }

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await api.delete(`/hr/leave/${id}`);
      toast.success('Leave request deleted');
      void queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
      router.push('/hr/leave');
    } catch {
      /* interceptor already toasts */
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cdy-white">Leave Request</h2>
        <div className="flex items-center gap-3">
          <PermissionGate feature="hr.attendance" action="write">
            <Button
              size="sm"
              variant="outline"
              className="text-cdy-red hover:text-cdy-red"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </PermissionGate>
          <Link
            href="/hr/leave"
            className="text-sm text-cdy-muted hover:text-cdy-white"
          >
            ← Back
          </Link>
        </div>
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

      <ConfirmDialog
        open={deleteOpen}
        title="Delete leave request?"
        description={`This will remove the ${request.leaveType.name} request for ${request.employee.firstName} ${request.employee.lastName}.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
