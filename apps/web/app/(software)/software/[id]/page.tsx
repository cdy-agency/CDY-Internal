'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format, differenceInMonths } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  useSoftwareProject,
  useAdvancePhase,
  useCreateRequirementDoc,
  useRequirementDocAction,
  useUpdateDesignPhase,
  useDesignAction,
  useCreateSprint,
  useSprintAction,
  useAddSprintItem,
  useUpdateItemStatus,
  useQaAction,
  useLogBug,
  useUpdateBugStatus,
  useDeployProject,
  useLogMaintenanceIssue,
  useResolveMaintenanceIssue,
} from '@/hooks/useSoftware';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { ItemStatus, BugStatus } from '@cdy/shared';
import type {
  SoftwareProjectDetail,
  RequirementDocRecord,
  DevSprintRecord,
  SprintItemRecord,
  BugRecord,
  MaintenanceLogRecord,
} from '@cdy/shared';

// ─── Phase config ─────────────────────────────────────────────

const PHASES: Array<{ key: string; label: string; icon: string }> = [
  { key: 'REQUIREMENTS', label: 'Requirements', icon: '📋' },
  { key: 'DESIGN', label: 'Design', icon: '🎨' },
  { key: 'DEVELOPMENT', label: 'Development', icon: '💻' },
  { key: 'QA', label: 'QA', icon: '🔍' },
  { key: 'DEPLOYMENT', label: 'Deploy', icon: '🚀' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: '🔧' },
];

const PHASE_ORDER = PHASES.map((p) => p.key);

function phaseIndex(phase: string): number {
  return PHASE_ORDER.indexOf(phase);
}

// ─── Doc status badge ────────────────────────────────────────

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'DRAFT', color: 'text-cdy-muted' },
  SENT: { label: 'SENT', color: 'text-blue-400' },
  SIGNED: { label: 'SIGNED', color: 'text-green-400' },
  REVISED: { label: 'REVISED', color: 'text-amber-400' },
};

// ─── Bug severity ─────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { dot: string; label: string }> = {
  CRITICAL: { dot: '🔴', label: 'CRITICAL' },
  HIGH: { dot: '🟡', label: 'HIGH' },
  MEDIUM: { dot: '🟢', label: 'MEDIUM' },
  LOW: { dot: '⚪', label: 'LOW' },
};

const BUG_STATUS: Record<string, string> = {
  OPEN: 'text-red-400',
  IN_PROGRESS: 'text-amber-400',
  RESOLVED: 'text-green-400',
  WONT_FIX: 'text-cdy-muted',
};

// ─── Maintenance status ───────────────────────────────────────

const MAINT_STATUS_COLOR: Record<string, string> = {
  OPEN: 'text-red-400',
  IN_PROGRESS: 'text-amber-400',
  RESOLVED: 'text-green-400',
};

// ─── Phase stepper ────────────────────────────────────────────

function PhaseStepper({
  currentPhase,
}: {
  currentPhase: string;
}): JSX.Element {
  const current = phaseIndex(currentPhase);

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {PHASES.map((phase, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={phase.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1 px-3 py-2 min-w-[80px] text-center">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : active ? (
                <Circle className="h-5 w-5 fill-cdy-red text-cdy-red" />
              ) : (
                <Circle className="h-5 w-5 text-cdy-muted/40" />
              )}
              <span
                className={`text-xs font-medium ${
                  done
                    ? 'text-green-400'
                    : active
                      ? 'text-cdy-red'
                      : 'text-cdy-muted/50'
                }`}
              >
                {phase.icon} {phase.label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div
                className={`h-px w-8 shrink-0 ${i < current ? 'bg-green-400' : 'bg-cdy-navy-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }): JSX.Element {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-cdy-navy">
      <div
        className={`h-full rounded-full transition-all ${
          percent >= 100
            ? 'bg-green-400'
            : percent >= 50
              ? 'bg-amber-400'
              : 'bg-cdy-red'
        }`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// ─── Phase section wrapper ────────────────────────────────────

function PhaseSection({
  icon,
  title,
  statusBadge,
  isExpanded,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  statusBadge?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-cdy-navy-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="font-medium text-cdy-white">{title}</span>
          {statusBadge}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-cdy-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-cdy-muted" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-cdy-navy-border px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Requirements panel ───────────────────────────────────────

function RequirementsPanel({
  projectId,
  docs,
}: {
  projectId: string;
  docs: RequirementDocRecord[];
}): JSX.Element {
  const createDoc = useCreateRequirementDoc(projectId);
  const docAction = useRequirementDocAction(projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [err, setErr] = useState('');

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr('');
    if (!title.trim() || !content.trim()) {
      setErr('Title and content are required');
      return;
    }
    try {
      await createDoc.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        fileUrl: fileUrl.trim() || undefined,
      });
      setTitle('');
      setContent('');
      setFileUrl('');
      setAddOpen(false);
    } catch {
      setErr('Failed to create document');
    }
  }

  return (
    <div className="space-y-3">
      {docs.length === 0 && (
        <p className="text-sm text-cdy-muted">No requirement documents yet.</p>
      )}
      {docs.map((doc) => {
        const cfg = DOC_STATUS[doc.status] ?? DOC_STATUS.DRAFT;
        return (
          <div
            key={doc.id}
            className="flex items-start justify-between rounded-md border border-cdy-navy-border bg-cdy-navy p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-cdy-white">
                  v{doc.version} — {doc.title}
                </span>
                <span className={`text-xs font-semibold ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              {doc.clientSignedAt && (
                <p className="mt-0.5 text-xs text-cdy-muted">
                  Signed {format(new Date(doc.clientSignedAt), 'MMM d, yyyy')}
                </p>
              )}
              {doc.sentToClientAt && !doc.clientSignedAt && (
                <p className="mt-0.5 text-xs text-cdy-muted">
                  Sent {format(new Date(doc.sentToClientAt), 'MMM d, yyyy')}
                </p>
              )}
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-xs text-cdy-red hover:underline"
                >
                  View file <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <PermissionGate feature="software.delivery" action="write">
              <div className="ml-3 flex shrink-0 gap-2">
                {doc.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-cdy-navy-border text-xs text-cdy-muted"
                    onClick={() =>
                      void docAction.mutateAsync({ docId: doc.id, action: 'send' })
                    }
                  >
                    Send
                  </Button>
                )}
                {doc.status === 'SENT' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-green-800 text-xs text-green-400"
                      onClick={() =>
                        void docAction.mutateAsync({ docId: doc.id, action: 'sign' })
                      }
                    >
                      Sign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-amber-800 text-xs text-amber-400"
                      onClick={() =>
                        void docAction.mutateAsync({ docId: doc.id, action: 'revise' })
                      }
                    >
                      Revise
                    </Button>
                  </>
                )}
              </div>
            </PermissionGate>
          </div>
        );
      })}

      <PermissionGate feature="software.delivery" action="write">
        {addOpen ? (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="space-y-3 rounded-md border border-cdy-navy-border bg-cdy-navy p-3"
          >
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Requirements doc title"
                className="border-cdy-navy-border bg-cdy-navy-light text-cdy-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">Content</Label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Describe the requirements..."
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">File URL (optional)</Label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://docs.google.com/..."
                className="border-cdy-navy-border bg-cdy-navy-light text-cdy-white"
              />
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(false)}
                className="border-cdy-navy-border text-cdy-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={createDoc.isPending}
              >
                {createDoc.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="border-cdy-navy-border text-cdy-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Document
          </Button>
        )}
      </PermissionGate>
    </div>
  );
}

// ─── Design panel ─────────────────────────────────────────────

function DesignPanel({
  projectId,
  project,
}: {
  projectId: string;
  project: SoftwareProjectDetail;
}): JSX.Element {
  const design = project.designPhase;
  const updateDesign = useUpdateDesignPhase(projectId);
  const designAction = useDesignAction(projectId);
  const [figmaUrl, setFigmaUrl] = useState(design?.figmaUrl ?? '');
  const [editingUrl, setEditingUrl] = useState(false);

  async function saveUrl(): Promise<void> {
    await updateDesign.mutateAsync({ figmaUrl: figmaUrl.trim() || undefined });
    setEditingUrl(false);
  }

  return (
    <div className="space-y-3">
      {design?.isSkipped && (
        <p className="text-sm text-cdy-muted">Design phase was skipped.</p>
      )}

      {!design?.isSkipped && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {editingUrl ? (
                <div className="flex gap-2">
                  <Input
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    placeholder="https://figma.com/..."
                    className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
                  />
                  <Button
                    size="sm"
                    onClick={() => void saveUrl()}
                    disabled={updateDesign.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingUrl(false)}
                    className="border-cdy-navy-border text-cdy-muted"
                  >
                    Cancel
                  </Button>
                </div>
              ) : design?.figmaUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={design.figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-cdy-red hover:underline"
                  >
                    Open Figma <ExternalLink className="h-3 w-3" />
                  </a>
                  <PermissionGate feature="software.delivery" action="write">
                    <button
                      type="button"
                      onClick={() => setEditingUrl(true)}
                      className="text-xs text-cdy-muted hover:text-cdy-white"
                    >
                      Edit
                    </button>
                  </PermissionGate>
                </div>
              ) : (
                <PermissionGate feature="software.delivery" action="write">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingUrl(true)}
                    className="border-cdy-navy-border text-cdy-muted"
                  >
                    Add Figma URL
                  </Button>
                </PermissionGate>
              )}
            </div>
          </div>

          {design?.status === 'APPROVED' && (
            <p className="text-sm text-green-400">
              ✅ Approved{' '}
              {design.clientApprovedAt &&
                format(new Date(design.clientApprovedAt), 'MMM d, yyyy')}
            </p>
          )}
          {design?.status === 'CHANGES_REQUESTED' && (
            <p className="text-sm text-amber-400">⚠️ Client requested changes</p>
          )}

          <PermissionGate feature="software.delivery" action="write">
            <div className="flex gap-2">
              {(!design ||
                design.status === 'IN_PROGRESS' ||
                design.status === 'CHANGES_REQUESTED') && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-800 text-green-400"
                    onClick={() => void designAction.mutateAsync('approve')}
                    disabled={designAction.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-800 text-amber-400"
                    onClick={() => void designAction.mutateAsync('changes')}
                    disabled={designAction.isPending}
                  >
                    Request Changes
                  </Button>
                </>
              )}
              {!design && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cdy-navy-border text-cdy-muted"
                  onClick={() => void designAction.mutateAsync('skip')}
                  disabled={designAction.isPending}
                >
                  Skip Design
                </Button>
              )}
            </div>
          </PermissionGate>
        </>
      )}
    </div>
  );
}

// ─── Sprint board ─────────────────────────────────────────────

function SprintBoard({ items }: { items: SprintItemRecord[] }): JSX.Element {
  const columns: Array<{ key: string; label: string }> = [
    { key: 'TODO', label: 'TODO' },
    { key: 'IN_PROGRESS', label: 'IN PROGRESS' },
    { key: 'BLOCKED', label: 'BLOCKED' },
    { key: 'DONE', label: 'DONE' },
  ];

  return (
    <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
      {columns.map((col) => (
        <div key={col.key}>
          <p className="mb-2 font-semibold text-cdy-muted">{col.label}</p>
          <div className="space-y-1">
            {items
              .filter((i) => i.status === col.key)
              .map((i) => (
                <div
                  key={i.id}
                  className="rounded border border-cdy-navy-border bg-cdy-navy px-2 py-1.5 text-cdy-white"
                >
                  {i.title}
                </div>
              ))}
            {items.filter((i) => i.status === col.key).length === 0 && (
              <div className="text-cdy-muted/40">—</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Add Sprint drawer ────────────────────────────────────────

function AddSprintDrawer({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}): JSX.Element | null {
  const createSprint = useCreateSprint(projectId);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [err, setErr] = useState('');

  function reset() {
    setName('');
    setGoal('');
    setStartDate('');
    setEndDate('');
    setErr('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr('');
    if (!name.trim() || !startDate || !endDate) {
      setErr('Name, start date, and end date are required');
      return;
    }
    try {
      await createSprint.mutateAsync({
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate,
        endDate,
      });
      reset();
      onClose();
    } catch {
      setErr('Failed to create sprint');
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
          <h2 className="text-lg font-semibold text-cdy-white">Add Sprint</h2>
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
            <div className="space-y-1.5">
              <Label className="text-cdy-muted">Sprint name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sprint 1 — Homepage & Navigation"
                className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-cdy-muted">Goal (optional)</Label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
                placeholder="What this sprint aims to deliver"
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-cdy-muted">Start date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-cdy-muted">End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
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
              disabled={createSprint.isPending}
            >
              {createSprint.isPending ? 'Creating…' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Sprint Item inline form ──────────────────────────────

function AddSprintItemForm({
  projectId,
  sprintId,
  onDone,
}: {
  projectId: string;
  sprintId: string;
  onDone: () => void;
}): JSX.Element {
  const addItem = useAddSprintItem(projectId);
  const [title, setTitle] = useState('');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!title.trim()) return;
    await addItem.mutateAsync({ sprintId, title: title.trim() });
    setTitle('');
    onDone();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New item title"
        className="h-8 border-cdy-navy-border bg-cdy-navy text-xs text-cdy-white"
      />
      <Button
        type="submit"
        size="sm"
        className="h-8 bg-cdy-red text-xs"
        disabled={addItem.isPending}
      >
        Add
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-cdy-navy-border text-xs text-cdy-muted"
        onClick={onDone}
      >
        Cancel
      </Button>
    </form>
  );
}

// ─── Development panel ────────────────────────────────────────

function DevelopmentPanel({
  projectId,
  sprints,
}: {
  projectId: string;
  sprints: DevSprintRecord[];
}): JSX.Element {
  const sprintAction = useSprintAction(projectId);
  const updateItemStatus = useUpdateItemStatus(projectId);
  const [addSprintOpen, setAddSprintOpen] = useState(false);
  const [expandedSprint, setExpandedSprint] = useState<string | null>(
    sprints.find((s) => s.status === 'ACTIVE')?.id ?? null,
  );
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {sprints.length === 0 && (
        <p className="text-sm text-cdy-muted">No sprints yet.</p>
      )}

      {sprints.map((sprint) => {
        const total = sprint.items.length;
        const done = sprint.items.filter((i) => i.status === 'DONE').length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        const isOpen = expandedSprint === sprint.id;

        return (
          <div
            key={sprint.id}
            className="rounded-md border border-cdy-navy-border bg-cdy-navy"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              onClick={() => setExpandedSprint(isOpen ? null : sprint.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-cdy-white">
                  {sprint.name}
                </span>
                {sprint.status === 'ACTIVE' && (
                  <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">
                    ACTIVE
                  </span>
                )}
                {sprint.status === 'COMPLETED' && (
                  <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                    COMPLETED
                  </span>
                )}
                {sprint.status === 'PLANNED' && (
                  <span className="rounded-full bg-cdy-navy-light px-2 py-0.5 text-xs text-cdy-muted">
                    PLANNED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-cdy-muted">
                {done}/{total} done
                {isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-cdy-navy-border px-3 pb-3 pt-2">
                <ProgressBar percent={percent} />
                <p className="mt-1 text-right text-xs text-cdy-muted">
                  {percent}% complete ·{' '}
                  {format(new Date(sprint.startDate), 'MMM d')} –{' '}
                  {format(new Date(sprint.endDate), 'MMM d, yyyy')}
                </p>

                <SprintBoard items={sprint.items} />

                <PermissionGate feature="software.delivery" action="write">
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sprint.status === 'PLANNED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-amber-800 text-xs text-amber-400"
                        onClick={() =>
                          void sprintAction.mutateAsync({
                            sprintId: sprint.id,
                            action: 'start',
                          })
                        }
                        disabled={sprintAction.isPending}
                      >
                        Start Sprint
                      </Button>
                    )}
                    {sprint.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-green-800 text-xs text-green-400"
                        onClick={() =>
                          void sprintAction.mutateAsync({
                            sprintId: sprint.id,
                            action: 'complete',
                          })
                        }
                        disabled={sprintAction.isPending}
                      >
                        Complete Sprint
                      </Button>
                    )}
                    {sprint.status !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-cdy-navy-border text-xs text-cdy-muted"
                        onClick={() =>
                          setAddingItemTo(
                            addingItemTo === sprint.id ? null : sprint.id,
                          )
                        }
                      >
                        <Plus className="h-3 w-3" /> Add Item
                      </Button>
                    )}

                    {sprint.items.length > 0 && sprint.status === 'ACTIVE' && (
                      <div className="flex flex-wrap gap-1">
                        {sprint.items
                          .filter((i) => i.status !== 'DONE')
                          .slice(0, 3)
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                void updateItemStatus.mutateAsync({
                                  sprintId: sprint.id,
                                  itemId: item.id,
                                  status: ItemStatus.DONE,
                                })
                              }
                              className="rounded border border-cdy-navy-border px-2 py-0.5 text-xs text-cdy-muted hover:border-green-800 hover:text-green-400"
                            >
                              ✓ {item.title}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {addingItemTo === sprint.id && (
                    <AddSprintItemForm
                      projectId={projectId}
                      sprintId={sprint.id}
                      onDone={() => setAddingItemTo(null)}
                    />
                  )}
                </PermissionGate>
              </div>
            )}
          </div>
        );
      })}

      <PermissionGate feature="software.delivery" action="write">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddSprintOpen(true)}
          className="border-cdy-navy-border text-cdy-muted"
        >
          <Plus className="h-3.5 w-3.5" /> Add Sprint
        </Button>
      </PermissionGate>

      <AddSprintDrawer
        open={addSprintOpen}
        onClose={() => setAddSprintOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}

// ─── Log Bug drawer ───────────────────────────────────────────

function LogBugDrawer({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}): JSX.Element | null {
  const logBug = useLogBug(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [err, setErr] = useState('');

  function reset() {
    setTitle('');
    setDescription('');
    setSeverity('MEDIUM');
    setErr('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr('');
    if (!title.trim()) {
      setErr('Title is required');
      return;
    }
    try {
      await logBug.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
      });
      reset();
      onClose();
    } catch {
      setErr('Failed to log bug');
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
          <h2 className="text-lg font-semibold text-cdy-white">Log Bug</h2>
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
            <div className="space-y-1.5">
              <Label className="text-cdy-muted">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bug description"
                className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-cdy-muted">Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-cdy-muted">Severity</Label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
              >
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_CONFIG[s].dot} {s}
                  </option>
                ))}
              </select>
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
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
              disabled={logBug.isPending}
            >
              {logBug.isPending ? 'Logging…' : 'Log Bug'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── QA panel ────────────────────────────────────────────────

function QaPanel({
  projectId,
  project,
}: {
  projectId: string;
  project: SoftwareProjectDetail;
}): JSX.Element {
  const qa = project.qaPhase;
  const qaAction = useQaAction(projectId);
  const updateBugStatus = useUpdateBugStatus(projectId);
  const [logBugOpen, setLogBugOpen] = useState(false);
  const [qaError, setQaError] = useState('');

  const openCritical =
    qa?.bugs.filter(
      (b) => b.severity === 'CRITICAL' && b.status !== 'RESOLVED',
    ).length ?? 0;

  async function handleComplete(): Promise<void> {
    setQaError('');
    try {
      await qaAction.mutateAsync('complete');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete QA';
      setQaError(msg);
    }
  }

  if (!qa) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-cdy-muted">QA phase not started.</p>
        <PermissionGate feature="software.delivery" action="write">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-cdy-navy-border text-cdy-muted"
              onClick={() => void qaAction.mutateAsync('skip')}
              disabled={qaAction.isPending}
            >
              Skip QA
            </Button>
          </div>
        </PermissionGate>
      </div>
    );
  }

  if (qa.isSkipped) {
    return <p className="text-sm text-cdy-muted">QA phase was skipped.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cdy-muted">
          {openCritical > 0 && (
            <span className="text-red-400">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              {openCritical} CRITICAL bug{openCritical > 1 ? 's' : ''} open
            </span>
          )}
          {openCritical === 0 && qa.status === 'IN_PROGRESS' && (
            <span className="text-green-400">No critical bugs open</span>
          )}
          {qa.status === 'COMPLETED' && (
            <span className="text-green-400">✅ QA Complete</span>
          )}
        </p>
        <PermissionGate feature="software.delivery" action="write">
          <Button
            size="sm"
            onClick={() => setLogBugOpen(true)}
            className="bg-cdy-red hover:bg-cdy-red/90"
          >
            <Plus className="h-3.5 w-3.5" /> Log Bug
          </Button>
        </PermissionGate>
      </div>

      {qa.bugs.length === 0 && (
        <p className="text-sm text-cdy-muted">No bugs logged.</p>
      )}

      <div className="space-y-2">
        {qa.bugs.map((bug: BugRecord) => (
          <div
            key={bug.id}
            className="flex items-start justify-between rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2"
          >
            <div>
              <div className="flex items-center gap-2">
                <span>{SEVERITY_CONFIG[bug.severity]?.dot ?? '⚪'}</span>
                <span className="text-sm font-medium text-cdy-white">
                  {bug.title}
                </span>
                <span
                  className={`text-xs font-semibold ${BUG_STATUS[bug.status] ?? 'text-cdy-muted'}`}
                >
                  {bug.status}
                </span>
              </div>
              {bug.description && (
                <p className="mt-0.5 text-xs text-cdy-muted">{bug.description}</p>
              )}
            </div>
            <PermissionGate feature="software.delivery" action="write">
              {bug.status !== 'RESOLVED' && bug.status !== 'WONT_FIX' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 h-7 shrink-0 border-green-800 text-xs text-green-400"
                  onClick={() =>
                    void updateBugStatus.mutateAsync({
                      bugId: bug.id,
                      status: BugStatus.RESOLVED,
                    })
                  }
                  disabled={updateBugStatus.isPending}
                >
                  Resolve
                </Button>
              )}
            </PermissionGate>
          </div>
        ))}
      </div>

      {qa.status === 'IN_PROGRESS' && (
        <PermissionGate feature="software.delivery" action="write">
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              onClick={() => void handleComplete()}
              disabled={qaAction.isPending || openCritical > 0}
              className={
                openCritical > 0
                  ? 'cursor-not-allowed opacity-50'
                  : 'bg-green-700 hover:bg-green-600'
              }
            >
              Mark QA Complete
            </Button>
            {openCritical > 0 && (
              <p className="text-xs text-red-400">Resolve all CRITICAL bugs first</p>
            )}
            {qaError && <p className="text-xs text-red-400">{qaError}</p>}
          </div>
        </PermissionGate>
      )}

      <LogBugDrawer
        open={logBugOpen}
        onClose={() => setLogBugOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}

// ─── Deployment panel ─────────────────────────────────────────

function DeploymentPanel({
  projectId,
  project,
}: {
  projectId: string;
  project: SoftwareProjectDetail;
}): JSX.Element {
  const deployProject = useDeployProject(projectId);
  const dep = project.deployment;
  const [deployUrl, setDeployUrl] = useState('');
  const [serverDetails, setServerDetails] = useState('');
  const [deployedAt, setDeployedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState('');

  if (dep) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-green-400">
          ✅ Deployed {format(new Date(dep.deployedAt), 'MMMM d, yyyy')}
        </p>
        {dep.deploymentUrl && (
          <a
            href={dep.deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cdy-red hover:underline"
          >
            Live site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {dep.serverDetails && (
          <p className="text-cdy-muted">Server: {dep.serverDetails}</p>
        )}
        {project.maintenanceEndsAt && (
          <p className="text-cdy-muted">
            Maintenance until:{' '}
            {format(new Date(project.maintenanceEndsAt), 'MMMM d, yyyy')}
          </p>
        )}
      </div>
    );
  }

  async function handleDeploy(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr('');
    try {
      await deployProject.mutateAsync({
        deployedAt: deployedAt || undefined,
        deploymentUrl: deployUrl.trim() || undefined,
        serverDetails: serverDetails.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setShowForm(false);
    } catch {
      setErr('Failed to record deployment');
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-cdy-muted">Not yet deployed.</p>
      <PermissionGate feature="software.delivery" action="write">
        {!showForm ? (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-cdy-red hover:bg-cdy-red/90"
          >
            Record Deployment
          </Button>
        ) : (
          <form
            className="space-y-3 rounded-md border border-cdy-navy-border bg-cdy-navy p-3"
            onSubmit={(e) => void handleDeploy(e)}
          >
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">Deployed at (optional)</Label>
              <Input
                type="date"
                value={deployedAt}
                onChange={(e) => setDeployedAt(e.target.value)}
                className="border-cdy-navy-border bg-cdy-navy-light text-cdy-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">Live URL</Label>
              <Input
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                placeholder="https://client.example.com"
                className="border-cdy-navy-border bg-cdy-navy-light text-cdy-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">Server details</Label>
              <Input
                value={serverDetails}
                onChange={(e) => setServerDetails(e.target.value)}
                placeholder="Vercel (CDY account)"
                className="border-cdy-navy-border bg-cdy-navy-light text-cdy-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
                className="border-cdy-navy-border text-cdy-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={deployProject.isPending}
              >
                {deployProject.isPending ? 'Deploying…' : 'Deploy'}
              </Button>
            </div>
          </form>
        )}
      </PermissionGate>
    </div>
  );
}

// ─── Log Issue drawer ─────────────────────────────────────────

function LogIssueDrawer({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}): JSX.Element | null {
  const logIssue = useLogMaintenanceIssue(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('BUG');
  const [priority, setPriority] = useState('MEDIUM');
  const [err, setErr] = useState('');

  function reset() {
    setTitle('');
    setDescription('');
    setType('BUG');
    setPriority('MEDIUM');
    setErr('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr('');
    if (!title.trim() || !description.trim()) {
      setErr('Title and description are required');
      return;
    }
    try {
      await logIssue.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
      });
      reset();
      onClose();
    } catch {
      setErr('Failed to log issue');
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
          <h2 className="text-lg font-semibold text-cdy-white">
            Log Maintenance Issue
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
          className="flex flex-1 flex-col overflow-y-auto p-6"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-cdy-muted">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-cdy-muted">Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-cdy-muted">Type</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
                >
                  <option value="BUG">Bug</option>
                  <option value="UPDATE">Update</option>
                  <option value="SECURITY">Security</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-cdy-muted">Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
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
              disabled={logIssue.isPending}
            >
              {logIssue.isPending ? 'Logging…' : 'Log Issue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Maintenance panel ────────────────────────────────────────

function MaintenancePanel({
  projectId,
  project,
}: {
  projectId: string;
  project: SoftwareProjectDetail;
}): JSX.Element {
  const resolveIssue = useResolveMaintenanceIssue(projectId);
  const [logIssueOpen, setLogIssueOpen] = useState(false);
  const logs = project.maintenanceLogs;

  const now = new Date();
  const deployedAt = project.deployedAt ? new Date(project.deployedAt) : null;
  const maintenanceEndsAt = project.maintenanceEndsAt
    ? new Date(project.maintenanceEndsAt)
    : null;
  const monthsElapsed = deployedAt ? differenceInMonths(now, deployedAt) : 0;

  const openCount = logs.filter((l) => l.status !== 'RESOLVED').length;
  const resolvedCount = logs.filter((l) => l.status === 'RESOLVED').length;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-0.5 text-sm text-cdy-muted">
          <p>
            {monthsElapsed} of 12 months elapsed · {openCount} open ·{' '}
            {resolvedCount} resolved
          </p>
          {maintenanceEndsAt && (
            <p>Ends: {format(maintenanceEndsAt, 'MMMM d, yyyy')}</p>
          )}
        </div>
        <PermissionGate feature="software.delivery" action="write">
          <Button
            size="sm"
            onClick={() => setLogIssueOpen(true)}
            className="bg-cdy-red hover:bg-cdy-red/90"
          >
            <Plus className="h-3.5 w-3.5" /> Log Issue
          </Button>
        </PermissionGate>
      </div>

      {logs.length === 0 && (
        <p className="text-sm text-cdy-muted">No maintenance issues logged.</p>
      )}

      <div className="space-y-2">
        {logs.map((log: MaintenanceLogRecord) => (
          <div
            key={log.id}
            className="flex items-start justify-between rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2"
          >
            <div>
              <div className="flex items-center gap-2">
                <span>{SEVERITY_CONFIG[log.priority]?.dot ?? '⚪'}</span>
                <span className="text-xs uppercase text-cdy-muted">{log.type}</span>
                <span className="text-sm font-medium text-cdy-white">
                  {log.title}
                </span>
                <span
                  className={`text-xs font-semibold ${MAINT_STATUS_COLOR[log.status] ?? 'text-cdy-muted'}`}
                >
                  {log.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-cdy-muted">
                {format(new Date(log.reportedAt), 'MMM d, yyyy')}
              </p>
            </div>
            <PermissionGate feature="software.delivery" action="write">
              {log.status !== 'RESOLVED' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 h-7 shrink-0 border-green-800 text-xs text-green-400"
                  onClick={() => void resolveIssue.mutateAsync(log.id)}
                  disabled={resolveIssue.isPending}
                >
                  Resolve
                </Button>
              )}
            </PermissionGate>
          </div>
        ))}
      </div>

      <LogIssueDrawer
        open={logIssueOpen}
        onClose={() => setLogIssueOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  WEB_APP: 'Web App',
  MOBILE_APP: 'Mobile App',
  SYSTEM: 'System',
  OTHER: 'Other',
};

export default function SoftwareProjectPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: project, isLoading, isError, error } = useSoftwareProject(id);
  const advancePhase = useAdvancePhase(id);
  const [advanceError, setAdvanceError] = useState('');

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  function togglePhase(phase: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  function isExpanded(phase: string): boolean {
    if (project && phase === project.phase) return true;
    return expandedPhases.has(phase);
  }

  async function handleAdvance(): Promise<void> {
    setAdvanceError('');
    try {
      await advancePhase.mutateAsync();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot advance phase';
      setAdvanceError(msg);
    }
  }

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

  const currentPhaseIndex = phaseIndex(project.phase);
  const canAdvance =
    project.phase !== 'COMPLETED' && project.phase !== 'MAINTENANCE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cdy-white">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-cdy-muted">
            {project.client.companyName} ·{' '}
            {TYPE_LABELS[project.projectType] ?? project.projectType} · Started{' '}
            {format(new Date(project.startDate), 'MMM d, yyyy')}
          </p>
        </div>
        <PermissionGate feature="software.projects" action="write">
          {canAdvance && (
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => void handleAdvance()}
                disabled={advancePhase.isPending}
                className="bg-cdy-red hover:bg-cdy-red/90"
              >
                {advancePhase.isPending
                  ? 'Advancing…'
                  : `Advance to ${PHASES[currentPhaseIndex + 1]?.label ?? '…'} →`}
              </Button>
              {advanceError && (
                <p className="text-xs text-red-400">{advanceError}</p>
              )}
            </div>
          )}
        </PermissionGate>
      </div>

      {/* Phase stepper */}
      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-3">
        <PhaseStepper currentPhase={project.phase} />
      </div>

      {/* Phase panels */}
      <div className="space-y-3">
        {/* Requirements */}
        <PhaseSection
          icon="📋"
          title="Requirements"
          statusBadge={
            project.requirements.some((r) => r.status === 'SIGNED') ? (
              <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                ✅ SIGNED
              </span>
            ) : project.requirements.length > 0 ? (
              <span className="rounded-full bg-cdy-navy px-2 py-0.5 text-xs text-cdy-muted">
                {project.requirements.length} doc
                {project.requirements.length > 1 ? 's' : ''}
              </span>
            ) : undefined
          }
          isExpanded={isExpanded('REQUIREMENTS')}
          onToggle={() => togglePhase('REQUIREMENTS')}
        >
          <RequirementsPanel projectId={id} docs={project.requirements} />
        </PhaseSection>

        {/* Design */}
        <PhaseSection
          icon="🎨"
          title="Design"
          statusBadge={
            project.designPhase?.status === 'APPROVED' ? (
              <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                ✅ APPROVED
              </span>
            ) : project.designPhase?.isSkipped ? (
              <span className="rounded-full bg-cdy-navy px-2 py-0.5 text-xs text-cdy-muted">
                SKIPPED
              </span>
            ) : undefined
          }
          isExpanded={isExpanded('DESIGN')}
          onToggle={() => togglePhase('DESIGN')}
        >
          <DesignPanel projectId={id} project={project} />
        </PhaseSection>

        {/* Development */}
        <PhaseSection
          icon="💻"
          title="Development"
          statusBadge={
            <span className="rounded-full bg-cdy-navy px-2 py-0.5 text-xs text-cdy-muted">
              {project.devSprints.length} sprint
              {project.devSprints.length !== 1 ? 's' : ''}
            </span>
          }
          isExpanded={isExpanded('DEVELOPMENT')}
          onToggle={() => togglePhase('DEVELOPMENT')}
        >
          <DevelopmentPanel projectId={id} sprints={project.devSprints} />
        </PhaseSection>

        {/* QA */}
        <PhaseSection
          icon="🔍"
          title="QA"
          statusBadge={
            project.qaPhase?.status === 'COMPLETED' ? (
              <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                ✅ COMPLETE
              </span>
            ) : project.qaPhase?.isSkipped ? (
              <span className="rounded-full bg-cdy-navy px-2 py-0.5 text-xs text-cdy-muted">
                SKIPPED
              </span>
            ) : project.qaPhase ? (
              <span className="rounded-full bg-purple-900/30 px-2 py-0.5 text-xs text-purple-400">
                IN PROGRESS
              </span>
            ) : undefined
          }
          isExpanded={isExpanded('QA')}
          onToggle={() => togglePhase('QA')}
        >
          <QaPanel projectId={id} project={project} />
        </PhaseSection>

        {/* Deployment */}
        <PhaseSection
          icon="🚀"
          title="Deployment"
          statusBadge={
            project.deployment ? (
              <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                ✅ DEPLOYED
              </span>
            ) : undefined
          }
          isExpanded={isExpanded('DEPLOYMENT')}
          onToggle={() => togglePhase('DEPLOYMENT')}
        >
          <DeploymentPanel projectId={id} project={project} />
        </PhaseSection>

        {/* Maintenance */}
        {(project.phase === 'MAINTENANCE' || project.phase === 'COMPLETED') && (
          <PhaseSection
            icon="🔧"
            title="Maintenance"
            statusBadge={
              project.maintenanceLogs.filter((l) => l.status !== 'RESOLVED')
                .length > 0 ? (
                <span className="rounded-full bg-red-900/20 px-2 py-0.5 text-xs text-red-400">
                  {
                    project.maintenanceLogs.filter((l) => l.status !== 'RESOLVED')
                      .length
                  }{' '}
                  open
                </span>
              ) : undefined
            }
            isExpanded={isExpanded('MAINTENANCE')}
            onToggle={() => togglePhase('MAINTENANCE')}
          >
            <MaintenancePanel projectId={id} project={project} />
          </PhaseSection>
        )}
      </div>
    </div>
  );
}
