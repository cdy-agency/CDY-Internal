'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LeaveStatus } from '@cdy/shared';
import {
  useMyLeaveBalances,
  useMyLeaveRequests,
  useLeaveTypes,
  useSubmitLeaveRequest,
  useCancelLeaveRequest,
  countWorkingDays,
} from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function MyLeavePage(): JSX.Element {
  const { data: balances, isLoading: balancesLoading } = useMyLeaveBalances();
  const { data: requests, isLoading: requestsLoading } = useMyLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const submitLeave = useSubmitLeaveRequest();
  const cancelLeave = useCancelLeaveRequest();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const requestedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    return countWorkingDays(new Date(form.startDate), new Date(form.endDate));
  }, [form.startDate, form.endDate]);

  const selectedBalance = balances?.find(
    (b) => b.leaveTypeId === form.leaveTypeId,
  );
  const hasEnoughBalance =
    !selectedBalance ||
    selectedBalance.leaveType.defaultDaysPerYear === 0 ||
    Number(selectedBalance.remaining) >= requestedDays;

  async function handleSubmit(): Promise<void> {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!hasEnoughBalance) {
      toast.error('Insufficient leave balance');
      return;
    }
    try {
      await submitLeave.mutateAsync({
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      });
      toast.success('Leave request submitted');
      setDrawerOpen(false);
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
    } catch {
      /* interceptor */
    }
  }

  async function handleCancel(id: string): Promise<void> {
    try {
      await cancelLeave.mutateAsync(id);
      toast.success('Request cancelled');
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-cdy-white">My Leave</h2>
        <PermissionGate feature="hr.attendance" action="write">
          <Button onClick={() => setDrawerOpen(true)}>Request Leave</Button>
        </PermissionGate>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balancesLoading ? (
          <p className="text-sm text-cdy-muted">Loading balances…</p>
        ) : (balances?.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">No leave balances configured.</p>
        ) : (
          balances?.map((b) => (
            <div
              key={b.id}
              className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4"
            >
              <p className="text-sm text-cdy-muted">{b.leaveType.name}</p>
              <p className="mt-1 text-3xl font-semibold text-cdy-white">
                {Number(b.remaining)}
              </p>
              <p className="text-xs text-cdy-muted">days remaining</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                <div
                  className="h-full rounded-full bg-cdy-red"
                  style={{
                    width: `${Math.min(100, (Number(b.used) / Math.max(Number(b.entitled), 1)) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-cdy-muted">
                {Number(b.used)} used · {Number(b.pending)} pending
              </p>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h3 className="mb-4 font-semibold text-cdy-white">My Requests</h3>
        {requestsLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : (requests?.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">No leave requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
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
                    <td className="py-2 pr-4 text-cdy-white">
                      {req.leaveType.name}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {format(new Date(req.startDate), 'MMM d')} –{' '}
                      {format(new Date(req.endDate), 'MMM d, yyyy')}
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
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancelLeave.isPending}
                          onClick={() => void handleCancel(req.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-cdy-navy-border bg-cdy-navy shadow-xl">
            <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
              <h3 className="font-semibold text-cdy-white">Request Leave</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-cdy-muted hover:text-cdy-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div>
                <Label htmlFor="leaveTypeId">Leave type *</Label>
                <select
                  id="leaveTypeId"
                  value={form.leaveTypeId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, leaveTypeId: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                >
                  <option value="">Select type…</option>
                  {leaveTypes?.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="startDate">Start date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              {requestedDays > 0 && (
                <div
                  className={cn(
                    'rounded-md p-3 text-sm',
                    hasEnoughBalance
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-cdy-red/10 text-cdy-red',
                  )}
                >
                  {requestedDays} working day{requestedDays !== 1 ? 's' : ''}{' '}
                  requested
                  {selectedBalance && (
                    <>
                      {' '}
                      · {Number(selectedBalance.remaining)} days available
                    </>
                  )}
                  {!hasEnoughBalance && ' — insufficient balance'}
                </div>
              )}
              <div>
                <Label htmlFor="reason">Reason</Label>
                <textarea
                  id="reason"
                  rows={3}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                />
              </div>
            </div>
            <div className="border-t border-cdy-navy-border p-6">
              <Button
                className="w-full"
                disabled={
                  submitLeave.isPending ||
                  !hasEnoughBalance ||
                  requestedDays === 0
                }
                onClick={() => void handleSubmit()}
              >
                {submitLeave.isPending ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
