'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ProposalStatus } from '@cdy/shared';
import {
  useProposals,
  useUpdateProposalStatus,
  useSalesAgents,
} from '@/hooks/useCrm';
import { usePermissions } from '@/context/PermissionContext';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';

const STATUS_OPTIONS: ProposalStatus[] = [
  ProposalStatus.DRAFT,
  ProposalStatus.SENT,
  ProposalStatus.ACCEPTED,
  ProposalStatus.REJECTED,
  ProposalStatus.EXPIRED,
];

function statusBadgeClass(status: ProposalStatus): string {
  switch (status) {
    case ProposalStatus.DRAFT:
      return 'bg-slate-500/20 text-slate-300';
    case ProposalStatus.SENT:
      return 'bg-blue-500/20 text-blue-300';
    case ProposalStatus.ACCEPTED:
      return 'bg-emerald-500/20 text-emerald-300';
    case ProposalStatus.REJECTED:
      return 'bg-cdy-red/20 text-cdy-red';
    case ProposalStatus.EXPIRED:
      return 'bg-amber-500/20 text-amber-300';
    default:
      return 'bg-cdy-navy text-cdy-muted';
  }
}

export default function ProposalsPage(): JSX.Element {
  const { roleKey } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | undefined>();
  const [assignedTo, setAssignedTo] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<{
    leadId: string;
    proposalId: string;
    title: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: proposals, isLoading } = useProposals({
    status: statusFilter,
    assignedTo,
    search: search || undefined,
  });
  const { data: agents } = useSalesAgents();
  const updateStatus = useUpdateProposalStatus();

  async function changeStatus(
    leadId: string,
    proposalId: string,
    status: ProposalStatus,
    rejectionReason?: string,
  ): Promise<void> {
    try {
      await updateStatus.mutateAsync({
        leadId,
        proposalId,
        status,
        rejectionReason,
      });
      toast.success(`Proposal marked as ${status.toLowerCase()}`);
      setRejectModal(null);
      setRejectReason('');
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-cdy-white">Proposals</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter(undefined)}
            className={`rounded-full border px-3 py-1 text-xs ${
              !statusFilter
                ? 'border-cdy-red bg-cdy-red/20 text-cdy-red'
                : 'border-cdy-navy-border text-cdy-muted'
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                setStatusFilter(statusFilter === status ? undefined : status)
              }
              className={`rounded-full border px-3 py-1 text-xs ${
                statusFilter === status
                  ? 'border-cdy-red bg-cdy-red/20 text-cdy-red'
                  : 'border-cdy-navy-border text-cdy-muted'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        {roleKey !== 'SALES_AGENT' && (
          <select
            value={assignedTo ?? ''}
            onChange={(e) => setAssignedTo(e.target.value || undefined)}
            className="h-9 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
          >
            <option value="">All agents</option>
            {agents?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.firstName} {agent.lastName}
              </option>
            ))}
          </select>
        )}
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading && <p className="text-cdy-muted">Loading proposals...</p>}

      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals?.map((proposal) => {
              const isExpired =
                proposal.status === ProposalStatus.SENT &&
                proposal.expiresAt &&
                new Date(proposal.expiresAt) < new Date();
              return (
                <tr key={proposal.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3 text-cdy-white">{proposal.title}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/leads/${proposal.leadId}`}
                      className="text-cdy-red hover:underline"
                    >
                      {proposal.lead?.companyName ?? proposal.leadId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-cdy-white">
                    {formatCurrency(Number(proposal.estimatedValue), proposal.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(proposal.status)}`}
                    >
                      {proposal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {proposal.sentAt
                      ? format(new Date(proposal.sentAt), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      isExpired ? 'text-cdy-red' : 'text-cdy-muted'
                    }`}
                  >
                    {proposal.expiresAt
                      ? format(new Date(proposal.expiresAt), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PermissionGate feature="crm.proposals" action="write">
                      <div className="flex flex-wrap gap-1">
                        {proposal.status === ProposalStatus.DRAFT && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void changeStatus(
                                proposal.leadId,
                                proposal.id,
                                ProposalStatus.SENT,
                              )
                            }
                          >
                            Mark Sent
                          </Button>
                        )}
                        {proposal.status === ProposalStatus.SENT && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void changeStatus(
                                  proposal.leadId,
                                  proposal.id,
                                  ProposalStatus.ACCEPTED,
                                )
                              }
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setRejectModal({
                                  leadId: proposal.leadId,
                                  proposalId: proposal.id,
                                  title: proposal.title,
                                })
                              }
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </PermissionGate>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">Reject proposal</h2>
            <p className="mt-1 text-sm text-cdy-muted">{rejectModal.title}</p>
            <Input
              className="mt-4"
              placeholder="Rejection reason (required)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={!rejectReason.trim() || updateStatus.isPending}
                onClick={() =>
                  void changeStatus(
                    rejectModal.leadId,
                    rejectModal.proposalId,
                    ProposalStatus.REJECTED,
                    rejectReason,
                  )
                }
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
