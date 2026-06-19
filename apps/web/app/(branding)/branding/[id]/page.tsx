'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, ExternalLink, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  useBrandingProject,
  useAddScopeItem,
  useDeliverProject,
  useSubmitDesign,
  useReviewSubmission,
} from '@/hooks/useBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import type {
  BrandingProjectDetail,
  BrandingScopeItemDetail,
  DesignSubmissionRecord,
} from '@cdy/shared';

// ─── Config ───────────────────────────────────────────────────

const SCOPE_STATUS_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; bg: string }
> = {
  IN_PROGRESS: { label: 'IN PROGRESS', icon: '🔄', color: 'text-cdy-muted', bg: 'bg-cdy-navy' },
  SUBMITTED: { label: 'SUBMITTED', icon: '⏳', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  APPROVED: { label: 'APPROVED', icon: '✅', color: 'text-green-400', bg: 'bg-green-900/30' },
  REJECTED: { label: 'REJECTED', icon: '🔴', color: 'text-red-400', bg: 'bg-red-900/20' },
  DELIVERED: { label: 'DELIVERED', icon: '📦', color: 'text-cdy-white', bg: 'bg-cdy-navy-light' },
};

const SUBMISSION_STATUS_ICON: Record<string, string> = {
  PENDING: '⏳',
  APPROVED: '✅',
  REJECTED: '❌',
};

// ─── Submit Design drawer ─────────────────────────────────────

function SubmitDesignDrawer({
  open,
  onClose,
  projectId,
  scopeItem,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  scopeItem: BrandingScopeItemDetail | null;
}): JSX.Element | null {
  const submitDesign = useSubmitDesign(projectId);
  const [fileUrl, setFileUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function reset() {
    setFileUrl('');
    setDescription('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!scopeItem) return;
    setError('');
    try {
      await submitDesign.mutateAsync({
        scopeItemId: scopeItem.id,
        fileUrl: fileUrl.trim() || undefined,
        description: description.trim() || undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
  }

  if (!open || !scopeItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { reset(); onClose(); }}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Submit Design</h2>
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
          <div className="space-y-5">
            <div>
              <Label className="text-cdy-muted">Scope item</Label>
              <p className="mt-1 text-sm font-medium text-cdy-white">
                {scopeItem.title}
              </p>
              {scopeItem.submissions.length > 0 && (
                <p className="mt-0.5 text-xs text-cdy-muted">
                  This will be v{scopeItem.submissions[0].version + 1}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="br-file">File / link</Label>
              <Input
                id="br-file"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="Paste Figma, Drive, or any URL"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>
            <div>
              <Label htmlFor="br-sub-desc">Description (optional)</Label>
              <textarea
                id="br-sub-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is in this submission?"
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
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
              disabled={submitDesign.isPending}
            >
              {submitDesign.isPending ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Scope Item drawer ────────────────────────────────────

function AddScopeItemDrawer({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}): JSX.Element | null {
  const addItem = useAddScopeItem(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function reset() {
    setTitle('');
    setDescription('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    try {
      await addItem.mutateAsync({ title: title.trim(), description: description.trim() || undefined });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add scope item');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { reset(); onClose(); }}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Add Scope Item</h2>
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
              <Label htmlFor="sc-title">Title</Label>
              <Input
                id="sc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Social Media Kit"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>
            <div>
              <Label htmlFor="sc-desc">Description (optional)</Label>
              <textarea
                id="sc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
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
              disabled={addItem.isPending}
            >
              {addItem.isPending ? 'Adding…' : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deliver modal ────────────────────────────────────────────

function DeliverModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: BrandingProjectDetail;
}): JSX.Element | null {
  const deliver = useDeliverProject(project.id);
  const [error, setError] = useState('');

  const approved = project.scopeItems.filter(
    (i) => i.status === 'APPROVED' || i.status === 'DELIVERED',
  );
  const unapproved = project.scopeItems.filter(
    (i) => i.status !== 'APPROVED' && i.status !== 'DELIVERED',
  );

  async function handleDeliver(): Promise<void> {
    setError('');
    try {
      await deliver.mutateAsync();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deliver');
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
          Mark project as delivered?
        </h2>
        <p className="mt-1 text-sm text-cdy-muted">{project.name}</p>

        <div className="mt-4 space-y-1.5">
          {project.scopeItems.map((item) => {
            const isOk =
              item.status === 'APPROVED' || item.status === 'DELIVERED';
            return (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {isOk ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                )}
                <span
                  className={isOk ? 'text-cdy-white' : 'text-cdy-muted'}
                >
                  {item.title}
                </span>
                <span className="ml-auto text-xs text-cdy-muted">
                  {isOk ? 'Approved' : SCOPE_STATUS_CONFIG[item.status]?.label ?? item.status}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-cdy-muted">
          <span className="text-cdy-white">{approved.length}</span> of{' '}
          {project.scopeItems.length} items approved.
          {unapproved.length > 0 && (
            <span className="ml-1 text-amber-400">
              {unapproved.length} item
              {unapproved.length > 1 ? 's' : ''} not yet approved will be noted.
            </span>
          )}
        </p>

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
            onClick={() => void handleDeliver()}
            disabled={deliver.isPending}
            className="flex-1 bg-green-700 hover:bg-green-600"
          >
            {deliver.isPending ? 'Delivering…' : 'Mark as Delivered'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline review (approve / reject popover) ─────────────────

function InlineReview({
  submission,
  projectId,
}: {
  submission: DesignSubmissionRecord;
  projectId: string;
}): JSX.Element {
  const review = useReviewSubmission(projectId);
  const [mode, setMode] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  async function handleApprove(): Promise<void> {
    setError('');
    try {
      await review.mutateAsync({ submissionId: submission.id, decision: 'APPROVE' });
      setMode('idle');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  }

  async function handleReject(): Promise<void> {
    setError('');
    if (!feedback.trim()) { setError('Feedback is required'); return; }
    try {
      await review.mutateAsync({
        submissionId: submission.id,
        decision: 'REJECT',
        clientFeedback: feedback.trim(),
      });
      setMode('idle');
      setFeedback('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  }

  if (mode === 'approving') {
    return (
      <div className="mt-2 rounded-md border border-green-800/50 bg-green-900/20 p-3 text-sm">
        <p className="text-cdy-white">
          Approve &ldquo;{submission.scopeItemId}&rdquo; v{submission.version}?
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-cdy-navy-border text-cdy-muted"
            onClick={() => setMode('idle')}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-green-700 hover:bg-green-600"
            onClick={() => void handleApprove()}
            disabled={review.isPending}
          >
            Approve
          </Button>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (mode === 'rejecting') {
    return (
      <div className="mt-2 rounded-md border border-red-800/50 bg-red-900/20 p-3 text-sm">
        <p className="text-cdy-white">Reject v{submission.version}?</p>
        <Label className="mt-2 block text-xs text-cdy-muted">
          Client feedback (required)
        </Label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          placeholder="Tell the team what needs to change"
          className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-xs text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-cdy-navy-border text-cdy-muted"
            onClick={() => { setMode('idle'); setFeedback(''); setError(''); }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-cdy-red hover:bg-cdy-red/90"
            onClick={() => void handleReject()}
            disabled={review.isPending || !feedback.trim()}
          >
            Reject with feedback
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <PermissionGate feature="branding.delivery" action="write">
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-green-800 text-xs text-green-400"
          onClick={() => setMode('approving')}
        >
          ✅ Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-red-800 text-xs text-red-400"
          onClick={() => setMode('rejecting')}
        >
          ❌ Reject
        </Button>
      </PermissionGate>
    </div>
  );
}

// ─── Scope item card ──────────────────────────────────────────

function ScopeItemCard({
  item,
  index,
  projectId,
  onSubmit,
}: {
  item: BrandingScopeItemDetail;
  index: number;
  projectId: string;
  onSubmit: (item: BrandingScopeItemDetail) => void;
}): JSX.Element {
  const cfg = SCOPE_STATUS_CONFIG[item.status] ?? SCOPE_STATUS_CONFIG.IN_PROGRESS;

  return (
    <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-cdy-muted">{index + 1}</span>
          <span className="font-medium text-cdy-white">{item.title}</span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color} ${cfg.bg}`}
        >
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {item.supplier && (
        <p className="mt-1 text-xs text-cdy-muted">
          Supplier: {item.supplier.name}
        </p>
      )}
      {!item.supplier && (
        <p className="mt-1 text-xs text-cdy-muted">No supplier</p>
      )}

      {item.submissions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-cdy-muted">Submissions:</p>
          {item.submissions.map((sub) => (
            <SubmissionRow
              key={sub.id}
              submission={sub}
              projectId={projectId}
            />
          ))}
        </div>
      )}

      {item.submissions.length === 0 && (
        <p className="mt-3 text-xs text-cdy-muted">No submissions yet</p>
      )}

      {item.status !== 'APPROVED' && item.status !== 'DELIVERED' && (
        <PermissionGate feature="branding.delivery" action="write">
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className="border-cdy-navy-border text-xs text-cdy-muted"
              onClick={() => onSubmit(item)}
            >
              <Plus className="h-3.5 w-3.5" /> Submit design
            </Button>
          </div>
        </PermissionGate>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  projectId,
}: {
  submission: DesignSubmissionRecord;
  projectId: string;
}): JSX.Element {
  const icon = SUBMISSION_STATUS_ICON[submission.status] ?? '⏳';

  return (
    <div className="rounded-md border border-cdy-navy-border bg-cdy-navy p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-cdy-white">
          {icon} v{submission.version} —{' '}
          {format(new Date(submission.submittedAt), 'MMM d')}
        </span>
        {submission.fileUrl && (
          <a
            href={submission.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cdy-red hover:underline"
          >
            View file <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {submission.status === 'REJECTED' && submission.clientFeedback && (
        <p className="mt-1 italic text-cdy-muted">
          &ldquo;{submission.clientFeedback}&rdquo;
        </p>
      )}

      {submission.status === 'PENDING' && (
        <InlineReview submission={submission} projectId={projectId} />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function BrandingProjectPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: project, isLoading, isError, error } = useBrandingProject(id);

  const [addScopeOpen, setAddScopeOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [submitItem, setSubmitItem] = useState<BrandingScopeItemDetail | null>(
    null,
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-cdy-muted">Loading project…</div>
    );
  }

  if (isError || !project) {
    return (
      <div className="rounded-lg border border-red-800/30 bg-red-900/10 p-4 text-sm text-red-400">
        {String(error ?? 'Project not found')}
      </div>
    );
  }

  const approvedCount = project.scopeItems.filter(
    (i) => i.status === 'APPROVED' || i.status === 'DELIVERED',
  ).length;
  const awaitingCount = project.scopeItems.filter(
    (i) => i.status === 'SUBMITTED',
  ).length;
  const inProgressCount = project.scopeItems.filter(
    (i) => i.status === 'IN_PROGRESS',
  ).length;
  const rejectedCount = project.scopeItems.filter(
    (i) => i.status === 'REJECTED',
  ).length;
  const totalCount = project.scopeItems.length;
  const percent = totalCount > 0
    ? Math.round((approvedCount / totalCount) * 100)
    : 0;

  const suppliersOnProject = project.scopeItems
    .filter((i) => i.supplier)
    .map((i) => ({
      supplier: i.supplier!,
      itemTitle: i.title,
    }));

  const uniqueSuppliers = Array.from(
    new Map(suppliersOnProject.map((s) => [s.supplier.id, s])).values(),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cdy-white">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-cdy-muted">
            Client: {project.client.companyName} ·{' '}
            {project.status === 'DELIVERED' ? '✅ Delivered' : '🔄 In Progress'}
          </p>
          <p className="text-xs text-cdy-muted">
            Created: {format(new Date(project.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <PermissionGate feature="branding.projects" action="write">
          <div className="flex gap-2">
            {project.status !== 'DELIVERED' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cdy-navy-border text-cdy-muted"
                  onClick={() => setAddScopeOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add scope item
                </Button>
                <Button
                  size="sm"
                  className="bg-green-700 hover:bg-green-600"
                  onClick={() => setDeliverOpen(true)}
                >
                  Mark as Delivered
                </Button>
              </>
            )}
          </div>
        </PermissionGate>
      </div>

      {/* Progress overview */}
      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <p className="mb-2 text-sm font-medium text-cdy-white">
          Scope progress: {approvedCount} / {totalCount} items approved
        </p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-cdy-navy">
          <div
            className={`h-full rounded-full transition-all ${
              percent === 100 ? 'bg-green-400' : 'bg-cdy-red'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-cdy-muted">
          <span className="text-green-400">✅ Approved: {approvedCount}</span>
          <span className="text-blue-400">⏳ Awaiting review: {awaitingCount}</span>
          <span>🔄 In progress: {inProgressCount}</span>
          <span className="text-red-400">🔴 Rejected: {rejectedCount}</span>
        </div>
      </div>

      {/* Scope item cards */}
      <div className="space-y-3">
        {project.scopeItems.length === 0 && (
          <div className="rounded-lg border border-cdy-navy-border p-6 text-center text-sm text-cdy-muted">
            No scope items yet.{' '}
            <button
              type="button"
              className="text-cdy-red hover:underline"
              onClick={() => setAddScopeOpen(true)}
            >
              Add one
            </button>
          </div>
        )}
        {project.scopeItems.map((item, idx) => (
          <ScopeItemCard
            key={item.id}
            item={item}
            index={idx}
            projectId={id}
            onSubmit={setSubmitItem}
          />
        ))}
      </div>

      {/* Suppliers section */}
      {uniqueSuppliers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-cdy-white">
            Suppliers involved
          </h2>
          <div className="overflow-hidden rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <tbody>
                {uniqueSuppliers.map(({ supplier, itemTitle }) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-cdy-navy-border/50"
                  >
                    <td className="px-4 py-2 font-medium text-cdy-white">
                      {supplier.name}
                    </td>
                    <td className="px-4 py-2 text-cdy-muted">{itemTitle}</td>
                    <td className="px-4 py-2 text-xs text-cdy-muted">
                      {supplier.email ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawers / modals */}
      <AddScopeItemDrawer
        open={addScopeOpen}
        onClose={() => setAddScopeOpen(false)}
        projectId={id}
      />

      <SubmitDesignDrawer
        open={submitItem !== null}
        onClose={() => setSubmitItem(null)}
        projectId={id}
        scopeItem={submitItem}
      />

      <DeliverModal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        project={project}
      />
    </div>
  );
}
