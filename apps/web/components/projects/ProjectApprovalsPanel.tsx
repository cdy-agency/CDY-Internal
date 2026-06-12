'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ApprovalDecision,
  ApprovalStatus,
  type DeliverableApprovalRecord,
} from '@cdy/shared';
import {
  useProjectApprovals,
  useRecordApprovalDecision,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING_APPROVAL]: 'Pending',
  [ApprovalStatus.APPROVED]: 'Approved',
  [ApprovalStatus.CHANGES_REQUESTED]: 'Changes Requested',
};

const STATUS_ICON: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING_APPROVAL]: '⏳',
  [ApprovalStatus.APPROVED]: '✅',
  [ApprovalStatus.CHANGES_REQUESTED]: '❌',
};

interface ProjectApprovalsPanelProps {
  projectId: string;
}

export function ProjectApprovalsPanel({
  projectId,
}: ProjectApprovalsPanelProps): JSX.Element {
  const { data: approvals, isLoading } = useProjectApprovals(projectId);
  const recordDecision = useRecordApprovalDecision();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>(
    'ALL',
  );
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const filtered =
    statusFilter === 'ALL'
      ? approvals
      : approvals?.filter((a) => a.status === statusFilter);

  async function handleApprove(approval: DeliverableApprovalRecord): Promise<void> {
    try {
      await recordDecision.mutateAsync({
        projectId,
        approvalId: approval.id,
        payload: { decision: ApprovalDecision.APPROVE },
      });
      toast.success('Deliverable approved');
    } catch {
      /* interceptor */
    }
  }

  async function handleReject(approvalId: string): Promise<void> {
    if (!rejectNote.trim()) {
      toast.error('Client feedback is required when rejecting');
      return;
    }
    try {
      await recordDecision.mutateAsync({
        projectId,
        approvalId,
        payload: { decision: ApprovalDecision.REJECT, note: rejectNote },
      });
      toast.success('Changes requested — assignee notified');
      setRejectId(null);
      setRejectNote('');
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-cdy-white">
          Deliverable Approvals
        </h2>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ApprovalStatus | 'ALL')
          }
          className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white"
        >
          <option value="ALL">All</option>
          {Object.values(ApprovalStatus).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (filtered?.length ?? 0) === 0 ? (
        <p className="text-sm text-cdy-muted">No approvals yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-cdy-muted">
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Title</th>
                <th className="pb-3 pr-4 font-medium">Task</th>
                <th className="pb-3 pr-4 font-medium">Requested</th>
                <th className="pb-3 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((approval) => (
                <tr
                  key={approval.id}
                  className="border-b border-cdy-navy-border/50 last:border-0"
                >
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                        approval.status === ApprovalStatus.PENDING_APPROVAL &&
                          'bg-amber-950 text-amber-400',
                        approval.status === ApprovalStatus.APPROVED &&
                          'bg-green-950 text-green-400',
                        approval.status === ApprovalStatus.CHANGES_REQUESTED &&
                          'bg-red-950 text-red-400',
                      )}
                    >
                      {STATUS_ICON[approval.status]} {STATUS_LABELS[approval.status]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-cdy-white">{approval.title}</td>
                  <td className="py-3 pr-4 text-cdy-muted">
                    {approval.taskTitle}
                  </td>
                  <td className="py-3 pr-4 text-cdy-muted">
                    {format(parseISO(approval.requestedAt), 'MMM d')}
                    {approval.requestedByName && (
                      <span className="block text-xs">
                        {approval.requestedByName}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    {approval.status === ApprovalStatus.PENDING_APPROVAL ? (
                      <PermissionGate feature="projects.approvals" action="write">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => void handleApprove(approval)}
                            disabled={recordDecision.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectId(approval.id);
                              setRejectNote('');
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </PermissionGate>
                    ) : approval.reviewerNote ? (
                      <span className="text-xs text-cdy-muted">
                        {approval.reviewerNote}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setRejectId(null)}
            role="presentation"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy p-6">
              <h3 className="mb-4 font-semibold text-cdy-white">
                Request Changes
              </h3>
              <Label htmlFor="rejectNote">Client feedback *</Label>
              <textarea
                id="rejectNote"
                rows={4}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
              />
              <div className="mt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setRejectId(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleReject(rejectId)}
                  disabled={recordDecision.isPending}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
