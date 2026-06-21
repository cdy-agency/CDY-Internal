'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, ExternalLink, Plus, X } from 'lucide-react';
import {
  useCampaign,
  useAssignInfluencer,
  useCompleteCampaign,
  useLogPayment,
  useVerifyDeliverable,
  useSubmitDeliverable,
  useMissedDeliverable,
  useInfluencers,
} from '@/hooks/useInfluencer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import type {
  CampaignInfluencerDetail,
  DeliverableRecord,
  InfluencerCampaignDetail,
  InfluencerWithCount,
} from '@cdy/shared';

// ─── Config ───────────────────────────────────────────────────

const DELIVERABLE_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  PENDING: { icon: '⭕', color: 'text-cdy-muted', label: 'PENDING' },
  SUBMITTED: { icon: '⏳', color: 'text-blue-400', label: 'SUBMITTED' },
  VERIFIED: { icon: '✅', color: 'text-green-400', label: 'VERIFIED' },
  MISSED: { icon: '❌', color: 'text-red-400', label: 'MISSED' },
};

// ─── Inline deliverable actions ────────────────────────────────

function DeliverableRow({
  d,
  campaignId,
}: {
  d: DeliverableRecord;
  campaignId: string;
}): JSX.Element {
  const verify = useVerifyDeliverable(campaignId);
  const submit = useSubmitDeliverable(campaignId);
  const missed = useMissedDeliverable(campaignId);
  const [mode, setMode] = useState<'idle' | 'confirmVerify' | 'submitPopover'>('idle');
  const [postUrl, setPostUrl] = useState('');
  const [error, setError] = useState('');

  const cfg = DELIVERABLE_CONFIG[d.status] ?? DELIVERABLE_CONFIG.PENDING;

  async function handleVerify(): Promise<void> {
    setError('');
    try {
      await verify.mutateAsync(d.id);
      setMode('idle');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify');
    }
  }

  async function handleSubmit(): Promise<void> {
    setError('');
    try {
      await submit.mutateAsync({ deliverableId: d.id, postUrl: postUrl || undefined });
      setPostUrl('');
      setMode('idle');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
  }

  async function handleMissed(): Promise<void> {
    try {
      await missed.mutateAsync(d.id);
    } catch { /* swallow */ }
  }

  return (
    <div className="rounded-md border border-cdy-navy-border bg-cdy-navy p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className={`text-sm font-medium ${cfg.color}`}>
            {cfg.icon} {d.description}
          </span>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-cdy-muted">
            <span className="capitalize">{d.platform}</span>
            <span>·</span>
            <span className="capitalize">{d.contentType}</span>
            {d.dueDate && (
              <>
                <span>·</span>
                <span>Due {format(new Date(d.dueDate), 'MMM d')}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {d.postUrl && (
            <a
              href={d.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cdy-red hover:underline"
            >
              View post <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {d.verifiedAt && (
            <span className="text-xs text-cdy-muted">
              {format(new Date(d.verifiedAt), 'MMM d')}
            </span>
          )}
          {d.status === 'SUBMITTED' && mode === 'idle' && (
            <PermissionGate feature="influencer.campaigns" action="write">
              <Button
                size="sm"
                className="h-6 bg-green-700 px-2 text-xs hover:bg-green-600"
                onClick={() => setMode('confirmVerify')}
              >
                Verify
              </Button>
            </PermissionGate>
          )}
          {d.status === 'PENDING' && mode === 'idle' && (
            <PermissionGate feature="influencer.campaigns" action="write">
              <Button
                size="sm"
                variant="outline"
                className="h-6 border-cdy-navy-border px-2 text-xs text-cdy-muted"
                onClick={() => setMode('submitPopover')}
              >
                Submit
              </Button>
            </PermissionGate>
          )}
          {(d.status === 'PENDING' || d.status === 'SUBMITTED') && mode === 'idle' && (
            <PermissionGate feature="influencer.campaigns" action="write">
              <button
                type="button"
                className="text-xs text-cdy-muted hover:text-red-400"
                onClick={() => void handleMissed()}
                disabled={missed.isPending}
              >
                Mark missed
              </button>
            </PermissionGate>
          )}
        </div>
      </div>

      {mode === 'confirmVerify' && (
        <div className="mt-2 rounded-md border border-green-800/40 bg-green-900/20 p-2 text-xs">
          <p className="text-cdy-white">Verify &ldquo;{d.description}&rdquo;?</p>
          {error && <p className="mt-1 text-red-400">{error}</p>}
          <div className="mt-1.5 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 border-cdy-navy-border text-xs text-cdy-muted"
              onClick={() => { setMode('idle'); setError(''); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 bg-green-700 px-2 text-xs hover:bg-green-600"
              onClick={() => void handleVerify()}
              disabled={verify.isPending}
            >
              Verify
            </Button>
          </div>
        </div>
      )}

      {mode === 'submitPopover' && (
        <div className="mt-2 rounded-md border border-cdy-navy-border bg-cdy-navy p-2 text-xs">
          <p className="mb-1 text-cdy-white">Mark as submitted:</p>
          <Input
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="Post URL (optional)"
            className="h-7 border-cdy-navy-border bg-cdy-navy-light text-xs text-cdy-white"
          />
          {error && <p className="mt-1 text-red-400">{error}</p>}
          <div className="mt-1.5 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 border-cdy-navy-border text-xs text-cdy-muted"
              onClick={() => { setMode('idle'); setPostUrl(''); setError(''); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 bg-cdy-red px-2 text-xs hover:bg-cdy-red/90"
              onClick={() => void handleSubmit()}
              disabled={submit.isPending}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Log Payment drawer ────────────────────────────────────────

function LogPaymentDrawer({
  open,
  onClose,
  assignment,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  assignment: CampaignInfluencerDetail | null;
  campaignId: string;
}): JSX.Element | null {
  const logPayment = useLogPayment(campaignId);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && assignment) {
      setAmount(assignment.agreedFee ?? '');
      setNotes('');
      setError('');
    }
  }, [open, assignment]);

  function reset() {
    setAmount('');
    setNotes('');
    setError('');
  }

  if (!open || !assignment) return null;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!assignment) return;
    setError('');
    if (!amount) { setError('Amount is required'); return; }
    try {
      await logPayment.mutateAsync({
        assignmentId: assignment.id,
        amount,
        notes: notes || undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log payment');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { reset(); onClose(); }}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">
            Log Payment — {assignment.influencer.handle}
          </h2>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="text-cdy-muted hover:text-cdy-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col p-6"
        >
          <div className="space-y-4">
            {assignment.agreedFee && (
              <div>
                <Label className="text-cdy-muted">Agreed fee</Label>
                <p className="mt-1 text-sm text-cdy-white">
                  {assignment.currency} {assignment.agreedFee}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="pay-amount">Amount paid</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-cdy-muted">{assignment.currency}</span>
                <Input
                  id="pay-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="400"
                  className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pay-notes">Notes (optional)</Label>
              <Input
                id="pay-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via MTN MoMo"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <div className="mt-auto flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 border-cdy-navy-border text-cdy-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-cdy-red hover:bg-cdy-red/90"
              disabled={logPayment.isPending}
            >
              {logPayment.isPending ? 'Logging…' : 'Log Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Influencer drawer ─────────────────────────────────

interface DeliverableItem {
  description: string;
  platform: string;
  contentType: string;
  dueDate: string;
}

function AssignDrawer({
  open,
  onClose,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}): JSX.Element | null {
  const assign = useAssignInfluencer(campaignId);
  const { data: influencers } = useInfluencers();
  const [selectedId, setSelectedId] = useState('');
  const [agreedFee, setAgreedFee] = useState('');
  const [notes, setNotes] = useState('');
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([
    { description: '', platform: 'instagram', contentType: 'post', dueDate: '' },
  ]);
  const [error, setError] = useState('');

  function reset() {
    setSelectedId('');
    setAgreedFee('');
    setNotes('');
    setDeliverables([{ description: '', platform: 'instagram', contentType: 'post', dueDate: '' }]);
    setError('');
  }

  function addDeliverable() {
    setDeliverables((prev) => [
      ...prev,
      { description: '', platform: 'instagram', contentType: 'post', dueDate: '' },
    ]);
  }

  function removeDeliverable(idx: number) {
    setDeliverables((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDeliverable(idx: number, field: keyof DeliverableItem, value: string) {
    setDeliverables((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!selectedId) { setError('Select an influencer'); return; }
    const validDeliverables = deliverables.filter((d) => d.description.trim());
    try {
      await assign.mutateAsync({
        influencerId: selectedId,
        agreedFee: agreedFee || undefined,
        notes: notes || undefined,
        deliverables:
          validDeliverables.length > 0
            ? validDeliverables.map((d) => ({
                description: d.description,
                platform: d.platform,
                contentType: d.contentType,
                dueDate: d.dueDate || undefined,
              }))
            : undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign');
    }
  }

  if (!open) return null;

  const selectedInfluencer = influencers?.find((i) => i.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { reset(); onClose(); }}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Assign Influencer</h2>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="text-cdy-muted hover:text-cdy-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col overflow-y-auto p-6"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="assign-influencer">Influencer</Label>
              <select
                id="assign-influencer"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
              >
                <option value="">Search influencer database…</option>
                {influencers?.map((inf: InfluencerWithCount) => (
                  <option key={inf.id} value={inf.id}>
                    {inf.handle} · {inf.platform} ·{' '}
                    {inf.followersCount ? `${(inf.followersCount / 1000).toFixed(0)}K` : '?'} ·{' '}
                    {inf._count.assignments} campaigns
                  </option>
                ))}
              </select>
              {selectedInfluencer && (
                <p className="mt-1 text-xs text-cdy-muted">
                  {selectedInfluencer.name} · {selectedInfluencer.category ?? 'No category'}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="assign-fee">Agreed fee (optional)</Label>
                <Input
                  id="assign-fee"
                  type="number"
                  value={agreedFee}
                  onChange={(e) => setAgreedFee(e.target.value)}
                  placeholder="400"
                  className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="assign-notes">Notes (optional)</Label>
              <Input
                id="assign-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div>
              <Label>Deliverables</Label>
              <div className="mt-2 space-y-2">
                {deliverables.map((d, idx) => (
                  <div key={idx} className="rounded-md border border-cdy-navy-border p-3">
                    <div className="flex gap-2">
                      <Input
                        value={d.description}
                        onChange={(e) => updateDeliverable(idx, 'description', e.target.value)}
                        placeholder="e.g. 1 Instagram Reel"
                        className="flex-1 border-cdy-navy-border bg-cdy-navy text-xs text-cdy-white"
                      />
                      {deliverables.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDeliverable(idx)}
                          className="text-cdy-muted hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={d.platform}
                        onChange={(e) => updateDeliverable(idx, 'platform', e.target.value)}
                        className="flex-1 rounded-md border border-cdy-navy-border bg-cdy-navy px-2 py-1 text-xs text-cdy-white"
                      >
                        {['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <select
                        value={d.contentType}
                        onChange={(e) => updateDeliverable(idx, 'contentType', e.target.value)}
                        className="flex-1 rounded-md border border-cdy-navy-border bg-cdy-navy px-2 py-1 text-xs text-cdy-white"
                      >
                        {['post', 'reel', 'story', 'video'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <Input
                        type="date"
                        value={d.dueDate}
                        onChange={(e) => updateDeliverable(idx, 'dueDate', e.target.value)}
                        className="w-28 border-cdy-navy-border bg-cdy-navy text-xs text-cdy-white"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDeliverable}
                  className="flex items-center gap-1 text-xs text-cdy-red hover:text-cdy-red/80"
                >
                  <Plus className="h-3.5 w-3.5" /> Add deliverable
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="mt-auto flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 border-cdy-navy-border text-cdy-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-cdy-red hover:bg-cdy-red/90"
              disabled={assign.isPending}
            >
              {assign.isPending ? 'Assigning…' : 'Assign Influencer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mark Complete modal ───────────────────────────────────────

function CompleteModal({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign: InfluencerCampaignDetail;
}): JSX.Element | null {
  const complete = useCompleteCampaign(campaign.id);
  const [error, setError] = useState('');

  const allDeliverables = campaign.influencers.flatMap((i) => i.deliverables);
  const unverified = allDeliverables.filter(
    (d) => d.status === 'PENDING' || d.status === 'SUBMITTED',
  );
  const unpaid = campaign.influencers.filter((i) => !i.isPaid && i.agreedFee);

  async function handleComplete(): Promise<void> {
    setError('');
    try {
      await complete.mutateAsync();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-cdy-white">
          Complete campaign?
        </h2>
        <p className="mt-1 text-sm text-cdy-muted">{campaign.name}</p>

        <div className="mt-4 space-y-2">
          {unverified.length > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-amber-900/20 p-2.5 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {unverified.length} deliverable
              {unverified.length > 1 ? 's' : ''} not yet verified
            </div>
          )}
          {unpaid.length > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-amber-900/20 p-2.5 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {unpaid.length} influencer
              {unpaid.length > 1 ? 's' : ''} not yet paid
            </div>
          )}
          {unverified.length === 0 && unpaid.length === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-green-900/20 p-2.5 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All deliverables verified and influencers paid.
            </div>
          )}
        </div>

        {(unverified.length > 0 || unpaid.length > 0) && (
          <p className="mt-3 text-xs text-cdy-muted">
            These warnings will be noted but won&apos;t block completion. Finance Manager will be notified.
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-cdy-navy-border text-cdy-muted"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleComplete()}
            disabled={complete.isPending}
            className="flex-1 bg-green-700 hover:bg-green-600"
          >
            {complete.isPending ? 'Completing…' : 'Complete Campaign'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Influencer card ───────────────────────────────────────────

function InfluencerCard({
  assignment,
  campaignId,
}: {
  assignment: CampaignInfluencerDetail;
  campaignId: string;
}): JSX.Element {
  const [payOpen, setPayOpen] = useState(false);
  const inf = assignment.influencer;

  return (
    <>
      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-cdy-white">
              {inf.handle}{' '}
              <span className="text-sm font-normal text-cdy-muted">
                · {inf.platform}
                {inf.followersCount ? ` · ${(inf.followersCount / 1000).toFixed(0)}K followers` : ''}
              </span>
            </p>
            {(inf.category || inf.location) && (
              <p className="mt-0.5 text-xs text-cdy-muted">
                {[inf.category, inf.location].filter(Boolean).join(' · ')}
              </p>
            )}
            {assignment.agreedFee && (
              <p className="mt-0.5 text-xs text-cdy-muted">
                Agreed fee: {assignment.currency} {assignment.agreedFee}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {assignment.isPaid ? (
              <>
                <span className="text-green-400">
                  ✅ Paid{' '}
                  {assignment.paidAmount
                    ? `${assignment.currency} ${assignment.paidAmount}`
                    : ''}
                  {assignment.paidAt ? ` · ${format(new Date(assignment.paidAt), 'MMM d')}` : ''}
                </span>
                {assignment.expenseId && (
                  <a
                    href={`/finance/expenses/${assignment.expenseId}`}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="h-3 w-3" /> Expense
                  </a>
                )}
              </>
            ) : (
              <span className="text-amber-400">⏳ Unpaid</span>
            )}
            {!assignment.isPaid && (
              <PermissionGate feature="influencer.campaigns" action="write">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-cdy-navy-border text-xs text-cdy-muted"
                  onClick={() => setPayOpen(true)}
                >
                  Log Payment
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>

        {assignment.deliverables.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-cdy-muted">Deliverables:</p>
            {assignment.deliverables.map((d) => (
              <DeliverableRow key={d.id} d={d} campaignId={campaignId} />
            ))}
          </div>
        )}
        {assignment.deliverables.length === 0 && (
          <p className="mt-2 text-xs text-cdy-muted">No deliverables defined</p>
        )}
      </div>

      <LogPaymentDrawer
        open={payOpen}
        onClose={() => setPayOpen(false)}
        assignment={assignment}
        campaignId={campaignId}
      />
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function CampaignDetailPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: campaign, isLoading, isError, error } = useCampaign(id);

  const [assignOpen, setAssignOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-cdy-muted">Loading campaign…</div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="rounded-lg border border-red-800/30 bg-red-900/10 p-4 text-sm text-red-400">
        {String(error ?? 'Campaign not found')}
      </div>
    );
  }

  const allDeliverables = campaign.influencers.flatMap((i) => i.deliverables);
  const verifiedCount = allDeliverables.filter((d) => d.status === 'VERIFIED').length;
  const totalCount = allDeliverables.length;
  const verifiedPct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  const paidCount = campaign.influencers.filter((i) => i.isPaid).length;
  const totalInf = campaign.influencers.length;
  const paidPct = totalInf > 0 ? Math.round((paidCount / totalInf) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cdy-white">
            {campaign.name}
          </h1>
          <p className="mt-0.5 text-sm text-cdy-muted">
            {campaign.client.companyName} ·{' '}
            <span className="capitalize">
              {campaign.platforms.join(' · ')}
            </span>
            {campaign.budget
              ? ` · ${campaign.currency} ${Number(campaign.budget).toLocaleString()}`
              : ''}
            {' · '}
            {campaign.status === 'ACTIVE' ? '🟢 Active' : campaign.status === 'COMPLETED' ? '✅ Complete' : campaign.status}
          </p>
          <p className="text-xs text-cdy-muted">
            {format(new Date(campaign.startDate), 'MMM d, yyyy')}
            {campaign.endDate
              ? ` – ${format(new Date(campaign.endDate), 'MMM d, yyyy')}`
              : ''}
          </p>
        </div>

        {campaign.status === 'ACTIVE' && (
          <PermissionGate feature="influencer.campaigns" action="write">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-cdy-navy-border text-cdy-muted"
                onClick={() => setAssignOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Assign Influencer
              </Button>
              <Button
                size="sm"
                className="bg-green-700 hover:bg-green-600"
                onClick={() => setCompleteOpen(true)}
              >
                Mark Complete
              </Button>
            </div>
          </PermissionGate>
        )}
      </div>

      {/* Brief */}
      {campaign.brief && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 text-sm text-cdy-muted">
          <p className="font-medium text-cdy-white">Brief</p>
          <p
            className={`mt-1 ${briefExpanded ? '' : 'line-clamp-2'}`}
          >
            {campaign.brief}
          </p>
          {campaign.brief.length > 150 && (
            <button
              type="button"
              className="mt-1 text-xs text-cdy-red hover:underline"
              onClick={() => setBriefExpanded((v) => !v)}
            >
              {briefExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Progress overview */}
      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-cdy-muted">
              Deliverables: {verifiedCount}/{totalCount} verified
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cdy-navy">
              <div
                className={`h-full rounded-full transition-all ${verifiedPct === 100 ? 'bg-green-400' : 'bg-cdy-red'}`}
                style={{ width: `${verifiedPct}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-cdy-muted">
              Payments: {paidCount}/{totalInf} paid
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cdy-navy">
              <div
                className={`h-full rounded-full transition-all ${paidPct === 100 ? 'bg-green-400' : 'bg-amber-400'}`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Influencer cards */}
      <div className="space-y-3">
        {campaign.influencers.length === 0 && (
          <div className="rounded-lg border border-cdy-navy-border p-8 text-center text-sm text-cdy-muted">
            No influencers assigned yet.{' '}
            {campaign.status === 'ACTIVE' && (
              <button
                type="button"
                className="text-cdy-red hover:underline"
                onClick={() => setAssignOpen(true)}
              >
                Assign one
              </button>
            )}
          </div>
        )}
        {campaign.influencers.map((a) => (
          <InfluencerCard key={a.id} assignment={a} campaignId={id} />
        ))}
      </div>

      {/* Drawers / modals */}
      <AssignDrawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        campaignId={id}
      />
      <CompleteModal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        campaign={campaign}
      />
    </div>
  );
}
