'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityType,
  PipelineStage,
  ProposalStatus,
  type ApiResponse,
  type LeadActivityRecord,
  type ProposalRecord,
} from '@cdy/shared';
import { Pencil } from 'lucide-react';
import { useLead, useMoveLeadStage, useUpdateProposalStatus } from '@/hooks/useCrm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import { CloseDealModal } from '@/components/crm/pipeline/CloseDealModal';
import { EditLeadDrawer } from '@/components/crm/leads/EditLeadDrawer';
import { formatCurrency } from '@/lib/utils';
import { getScoreBand, scoreBandLabel } from '@/lib/leadScoring';

const STAGES: PipelineStage[] = [
  PipelineStage.NEW,
  PipelineStage.CONTACTED,
  PipelineStage.PROPOSAL_SENT,
  PipelineStage.NEGOTIATION,
  PipelineStage.CLOSED_WON,
];

const STAGE_MOVE_OPTIONS: Array<{ stage: PipelineStage; label: string }> = [
  { stage: PipelineStage.CONTACTED, label: 'Contacted' },
  { stage: PipelineStage.PROPOSAL_SENT, label: 'Proposal Sent' },
  { stage: PipelineStage.NEGOTIATION, label: 'Negotiation' },
];

const SERVICE_OPTIONS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'software_dev', label: 'Software Dev' },
  { value: 'branding', label: 'Branding' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'sales_services', label: 'Sales Services' },
  { value: 'tech', label: 'Tech' },
  { value: 'other', label: 'Other' },
];

export default function LeadDetailPage(): JSX.Element {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { data: lead, isLoading } = useLead(id);
  const moveStage = useMoveLeadStage();
  const updateProposalStatus = useUpdateProposalStatus();
  const [activityOpen, setActivityOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalService, setProposalService] = useState('software_dev');
  const [proposalValue, setProposalValue] = useState('');
  const [proposalCurrency, setProposalCurrency] = useState('RWF');
  const [proposalExpires, setProposalExpires] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [savingProposal, setSavingProposal] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.CALL);
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [duration, setDuration] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);
  const [rejectProposalId, setRejectProposalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function logActivity(): Promise<void> {
    setSavingActivity(true);
    try {
      await api.post<ApiResponse<LeadActivityRecord>>(
        `/crm/leads/${id}/activities`,
        {
          type: activityType,
          summary,
          outcome: outcome || undefined,
          nextAction: nextAction || undefined,
          nextActionDate: nextActionDate || undefined,
          duration: duration ? Number(duration) : undefined,
        },
      );
      toast.success('Activity logged');
      setActivityOpen(false);
      setSummary('');
      setOutcome('');
      setNextAction('');
      setNextActionDate('');
      setDuration('');
      await queryClient.invalidateQueries({ queryKey: ['crm', 'leads', id] });
    } catch {
      /* interceptor */
    } finally {
      setSavingActivity(false);
    }
  }

  async function sendProposal(proposalId: string): Promise<void> {
    await api.post<ApiResponse<ProposalRecord>>(
      `/crm/leads/${id}/proposals/${proposalId}/send`,
    );
    toast.success('Proposal marked as sent');
    await queryClient.invalidateQueries({ queryKey: ['crm', 'leads', id] });
  }

  async function createProposal(): Promise<void> {
    if (!proposalTitle.trim() || !proposalValue) return;
    setSavingProposal(true);
    try {
      await api.post<ApiResponse<ProposalRecord>>(`/crm/leads/${id}/proposals`, {
        title: proposalTitle,
        serviceType: proposalService,
        estimatedValue: Number(proposalValue),
        currency: proposalCurrency,
        expiresAt: proposalExpires || undefined,
        notes: proposalNotes || undefined,
      });
      toast.success('Proposal added');
      setProposalOpen(false);
      setProposalTitle('');
      setProposalValue('');
      setProposalNotes('');
      setProposalExpires('');
      await queryClient.invalidateQueries({ queryKey: ['crm', 'leads', id] });
    } catch {
      /* interceptor */
    } finally {
      setSavingProposal(false);
    }
  }

  async function moveToStage(stage: PipelineStage): Promise<void> {
    await moveStage.mutateAsync({ leadId: id, stage });
    toast.success(`Lead moved to ${stage.replace('_', ' ').toLowerCase()}`);
    await queryClient.invalidateQueries({ queryKey: ['crm', 'leads', id] });
  }

  async function updateProposal(
    proposalId: string,
    status: ProposalStatus,
    rejectionReason?: string,
  ): Promise<void> {
    await updateProposalStatus.mutateAsync({
      leadId: id,
      proposalId,
      status,
      rejectionReason,
    });
    toast.success(`Proposal ${status.toLowerCase()}`);
    setRejectProposalId(null);
    setRejectReason('');
    await queryClient.invalidateQueries({ queryKey: ['crm', 'leads', id] });
  }

  if (isLoading || !lead) {
    return <p className="text-cdy-muted">Loading lead...</p>;
  }

  const band = getScoreBand(lead.qualityScore ?? 0);
  const stageIndex = STAGES.indexOf(lead.stage);
  const isClosed =
    lead.stage === PipelineStage.CLOSED_WON ||
    lead.stage === PipelineStage.CLOSED_LOST;

  type TimelineEntry = {
    id: string;
    date: Date;
    kind: 'activity' | 'stage' | 'proposal';
    title: string;
    detail?: string;
  };

  const timeline: TimelineEntry[] = [];

  for (const activity of lead.activities ?? []) {
    timeline.push({
      id: `act-${activity.id}`,
      date: new Date(activity.performedAt),
      kind: 'activity',
      title: `${activity.type} — ${activity.summary}`,
      detail: [
        activity.outcome ? `Outcome: ${activity.outcome}` : '',
        activity.nextAction
          ? `Next: ${activity.nextAction}${
              activity.nextActionDate
                ? ` by ${format(new Date(activity.nextActionDate), 'MMM d')}`
                : ''
            }`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  for (const history of lead.stageHistory ?? []) {
    if (history.fromStage) {
      timeline.push({
        id: `stage-${history.id}`,
        date: new Date(history.movedAt),
        kind: 'stage',
        title: `STAGE CHANGE — ${history.fromStage.replace('_', ' ')} → ${history.toStage.replace('_', ' ')}`,
        detail: history.movedByName ? `By: ${history.movedByName}` : undefined,
      });
    }
  }

  for (const proposal of lead.proposals ?? []) {
    if (proposal.sentAt) {
      timeline.push({
        id: `prop-sent-${proposal.id}`,
        date: new Date(proposal.sentAt),
        kind: 'proposal',
        title: `PROPOSAL — ${proposal.title} sent to client`,
        detail: `Value: ${formatCurrency(Number(proposal.estimatedValue), proposal.currency)}`,
      });
    }
    if (proposal.acceptedAt) {
      timeline.push({
        id: `prop-acc-${proposal.id}`,
        date: new Date(proposal.acceptedAt),
        kind: 'proposal',
        title: `PROPOSAL — ${proposal.title} marked ACCEPTED`,
      });
    }
    if (proposal.rejectedAt) {
      timeline.push({
        id: `prop-rej-${proposal.id}`,
        date: new Date(proposal.rejectedAt),
        kind: 'proposal',
        title: `PROPOSAL — ${proposal.title} rejected`,
        detail: proposal.rejectionReason ?? undefined,
      });
    }
  }

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm/leads" className="hover:text-cdy-white">Leads</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">{lead.companyName ?? lead.contactName}</span>
      </nav>

      {lead.overdueFollowUp && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="font-medium text-amber-400">⚠ Follow-up overdue</p>
          <p className="mt-1 text-sm text-cdy-muted">
            Action: &quot;{lead.overdueFollowUp.nextAction}&quot; was due{' '}
            {format(new Date(lead.overdueFollowUp.nextActionDate), 'MMM d, yyyy')} —{' '}
            {lead.overdueFollowUp.daysOverdue} day
            {lead.overdueFollowUp.daysOverdue !== 1 ? 's' : ''} ago
          </p>
          <Button
            size="sm"
            className="mt-2"
            variant="outline"
            onClick={() => setActivityOpen(true)}
          >
            Log Update
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-cdy-white">{lead.companyName ?? lead.contactName}</h1>
              {lead.stage !== PipelineStage.CLOSED_WON && lead.stage !== PipelineStage.CLOSED_LOST && (
                <PermissionGate feature="crm.leads" action="write">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1 text-xs text-cdy-muted hover:text-cdy-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </PermissionGate>
              )}
            </div>
            <p className="text-cdy-muted">{lead.contactName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-cdy-red/20 px-3 py-1 text-xs text-cdy-red">
                {lead.stage.replace('_', ' ')}
              </span>
              <span className="rounded-full bg-cdy-navy px-3 py-1 text-xs text-cdy-white">
                Score {lead.qualityScore ?? 0} — {scoreBandLabel(band)}
              </span>
            </div>
            {lead.clientId && (
              <Link
                href={`/crm/clients/${lead.clientId}`}
                className="mt-3 inline-block text-sm text-cdy-red hover:underline"
              >
                View client →
              </Link>
            )}
            <div className="mt-4 grid gap-2 text-sm text-cdy-muted sm:grid-cols-2">
              <p>Email: {lead.email}</p>
              <p>Phone: {lead.phone ?? '—'}</p>
              <p>Service: {lead.serviceInterest.replace('_', ' ')}</p>
              <p>Source: {lead.source.replace('_', ' ')}</p>
              <p>
                Value:{' '}
                {lead.estimatedValue != null
                  ? formatCurrency(Number(lead.estimatedValue), lead.currency)
                  : '—'}
              </p>
              <p>Created: {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}</p>
              {(lead.convertedAt || isClosed) && (
                <p>
                  Closed:{' '}
                  {format(
                    new Date(lead.convertedAt ?? lead.updatedAt),
                    'MMM d, yyyy h:mm a',
                  )}
                  {lead.stage === PipelineStage.CLOSED_WON
                    ? ' (Won)'
                    : lead.stage === PipelineStage.CLOSED_LOST
                      ? ' (Lost)'
                      : ''}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="mb-4 font-medium text-cdy-white">Stage progression</h2>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((stage, idx) => (
                <span
                  key={stage}
                  className={`rounded px-2 py-1 text-xs ${
                    idx < stageIndex
                      ? 'bg-green-950 text-green-400'
                      : stage === lead.stage
                        ? 'bg-cdy-red text-white'
                        : 'bg-cdy-navy text-cdy-muted'
                  }`}
                >
                  {stage.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-cdy-white">Activity timeline</h2>
              <PermissionGate feature="crm.leads" action="write">
                <Button size="sm" onClick={() => setActivityOpen(true)}>
                  + Log Activity
                </Button>
              </PermissionGate>
            </div>
            <div className="space-y-4">
              {timeline.map((entry) => (
                <div key={entry.id} className="border-l-2 border-cdy-navy-border pl-4">
                  <p className="text-xs text-cdy-muted">
                    {format(entry.date, 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="font-medium text-cdy-white">{entry.title}</p>
                  {entry.detail && (
                    <p className="whitespace-pre-line text-sm text-cdy-muted">
                      {entry.detail}
                    </p>
                  )}
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm text-cdy-muted">No timeline events yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-cdy-white">Proposals</h2>
              <PermissionGate feature="crm.proposals" action="write">
                <Button size="sm" variant="outline" onClick={() => setProposalOpen(true)}>
                  + Add Proposal
                </Button>
              </PermissionGate>
            </div>
            <ul className="space-y-3 text-sm">
              {lead.proposals?.map((p) => (
                <li key={p.id} className="rounded border border-cdy-navy-border/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-cdy-white">{p.title}</span>
                      <span className="ml-2 text-cdy-muted">
                        {p.serviceType.replace('_', ' ')} ·{' '}
                        {formatCurrency(Number(p.estimatedValue), p.currency)}
                      </span>
                      <span className="ml-2 text-xs text-cdy-muted">{p.status}</span>
                    </div>
                  </div>
                  <PermissionGate feature="crm.proposals" action="write">
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.status === ProposalStatus.DRAFT && (
                        <Button size="sm" variant="outline" onClick={() => void sendProposal(p.id)}>
                          Mark Sent
                        </Button>
                      )}
                      {p.status === ProposalStatus.SENT && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void updateProposal(p.id, ProposalStatus.ACCEPTED)
                            }
                          >
                            Mark Accepted
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectProposalId(p.id)}
                          >
                            Mark Rejected
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void updateProposal(p.id, ProposalStatus.EXPIRED)
                            }
                          >
                            Mark Expired
                          </Button>
                        </>
                      )}
                    </div>
                  </PermissionGate>
                </li>
              ))}
              {(!lead.proposals || lead.proposals.length === 0) && (
                <p className="text-sm text-cdy-muted">No proposals yet.</p>
              )}
            </ul>
          </div>

          {!isClosed && (
            <PermissionGate feature="crm.leads" action="write">
              <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
                <h2 className="mb-3 font-medium text-cdy-white">Move to</h2>
                <div className="flex flex-wrap gap-2">
                  {STAGE_MOVE_OPTIONS.map(({ stage, label }) => {
                    const targetIndex = STAGES.indexOf(stage);
                    const disabled =
                      stageIndex >= targetIndex || moveStage.isPending;
                    return (
                      <Button
                        key={stage}
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => void moveToStage(stage)}
                      >
                        → {label}
                      </Button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="bg-cdy-red hover:bg-cdy-red/90"
                    onClick={() => setCloseOpen(true)}
                  >
                    Close Won
                  </Button>
                  <Button variant="outline" onClick={() => setCloseOpen(true)}>
                    Close Lost
                  </Button>
                </div>
              </div>
            </PermissionGate>
          )}
        </div>
      </div>

      {activityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">Log Activity</h2>
            <div className="mt-4 space-y-3">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
                className="h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {Object.values(ActivityType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Input placeholder="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
              <Input placeholder="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
              <Input placeholder="Next action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
              <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
              <Input type="number" placeholder="Duration (minutes)" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActivityOpen(false)}>Cancel</Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={!summary || savingActivity}
                onClick={() => void logActivity()}
              >
                Save Activity
              </Button>
            </div>
          </div>
        </div>
      )}

      {proposalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">Add Proposal</h2>
            <div className="mt-4 space-y-3">
              <Input
                placeholder="Title"
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
              />
              <select
                value={proposalService}
                onChange={(e) => setProposalService(e.target.value)}
                className="h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {SERVICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Estimated value"
                  value={proposalValue}
                  onChange={(e) => setProposalValue(e.target.value)}
                />
                <select
                  value={proposalCurrency}
                  onChange={(e) => setProposalCurrency(e.target.value)}
                  className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
                >
                  <option value="RWF">RWF</option>
                </select>
              </div>
              <Input
                type="date"
                value={proposalExpires}
                onChange={(e) => setProposalExpires(e.target.value)}
              />
              <textarea
                placeholder="Notes (optional)"
                value={proposalNotes}
                onChange={(e) => setProposalNotes(e.target.value)}
                className="min-h-[80px] w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setProposalOpen(false)}>Cancel</Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={!proposalTitle || !proposalValue || savingProposal}
                onClick={() => void createProposal()}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectProposalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">Reject proposal</h2>
            <Input
              className="mt-4"
              placeholder="Rejection reason (required)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectProposalId(null)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={!rejectReason.trim()}
                onClick={() =>
                  void updateProposal(
                    rejectProposalId,
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

      <CloseDealModal
        open={closeOpen}
        leadId={id}
        onClose={() => setCloseOpen(false)}
        onSuccess={() => toast.success('Deal closed! Draft invoice created in Finance.')}
      />

      <EditLeadDrawer
        open={editOpen}
        lead={editOpen ? lead : null}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
