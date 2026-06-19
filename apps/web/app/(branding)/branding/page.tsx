'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, ExternalLink, X, Trash2 } from 'lucide-react';
import { useBrandingProjects, useCreateBrandingProject } from '@/hooks/useBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { ClientSearch } from '@/components/crm/ClientSearch';
import type { BrandingProjectListItem, ScopeStatus } from '@cdy/shared';
import type { ClientSearchResult } from '@cdy/shared';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-900/30' },
  DELIVERED: { label: 'Delivered', color: 'text-green-400', bg: 'bg-green-900/30' },
  ON_HOLD: { label: 'On Hold', color: 'text-cdy-muted', bg: 'bg-cdy-navy' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-900/20' },
};

function StatusBadge({ status }: { status: string }): JSX.Element {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.IN_PROGRESS;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  );
}

function ScopeProgress({
  items,
}: {
  items: { status: ScopeStatus | string }[];
}): JSX.Element {
  const total = items.length;
  const approved = items.filter(
    (i) => i.status === 'APPROVED' || i.status === 'DELIVERED',
  ).length;
  const awaiting = items.filter((i) => i.status === 'SUBMITTED').length;
  const percent = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-cdy-navy">
        <div
          className={`h-full rounded-full ${percent === 100 ? 'bg-green-400' : 'bg-cdy-red'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-cdy-muted">
        {approved}/{total}
        {awaiting > 0 && (
          <span className="ml-1 text-blue-400" title="Awaiting review">
            ⏳
          </span>
        )}
      </span>
    </div>
  );
}

interface NewProjectDrawerProps {
  open: boolean;
  onClose: () => void;
}

function NewProjectDrawer({ open, onClose }: NewProjectDrawerProps): JSX.Element | null {
  const create = useCreateBrandingProject();
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeItems, setScopeItems] = useState<string[]>(['']);
  const [error, setError] = useState('');

  function reset() {
    setSelectedClient(null);
    setName('');
    setDescription('');
    setScopeItems(['']);
    setError('');
  }

  function addScopeItem() {
    setScopeItems((prev) => [...prev, '']);
  }

  function removeScopeItem(index: number) {
    setScopeItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateScopeItem(index: number, value: string) {
    setScopeItems((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!selectedClient) { setError('Please select a client'); return; }
    if (!name.trim()) { setError('Project name is required'); return; }

    const validItems = scopeItems
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title) => ({ title }));

    try {
      await create.mutateAsync({
        clientId: selectedClient.id,
        name: name.trim(),
        description: description.trim() || undefined,
        scopeItems: validItems.length > 0 ? validItems : undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
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
          <h2 className="text-lg font-semibold text-cdy-white">New Branding Project</h2>
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
              <Label>Client</Label>
              <div className="mt-1">
                <ClientSearch
                  value={selectedClient}
                  onChange={setSelectedClient}
                  placeholder="Search CRM clients..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="br-name">Project name</Label>
              <Input
                id="br-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp Brand Identity"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div>
              <Label htmlFor="br-desc">Description (optional)</Label>
              <textarea
                id="br-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>

            <div>
              <Label>Initial scope items</Label>
              <div className="mt-2 space-y-2">
                {scopeItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateScopeItem(idx, e.target.value)}
                      placeholder={`e.g. ${['Logo Design', 'Brand Guidelines', 'Business Cards'][idx] ?? 'Scope item'}`}
                      className="border-cdy-navy-border bg-cdy-navy text-cdy-white"
                    />
                    {scopeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeScopeItem(idx)}
                        className="shrink-0 text-cdy-muted hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addScopeItem}
                  className="flex items-center gap-1 text-xs text-cdy-red hover:text-cdy-red/80"
                >
                  <Plus className="h-3.5 w-3.5" /> Add scope item
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
              disabled={create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BrandingOverviewPage(): JSX.Element {
  const { data: projects, isLoading, isError } = useBrandingProjects();
  const [addOpen, setAddOpen] = useState(false);

  const activeCount =
    projects?.filter((p) => p.status === 'IN_PROGRESS').length ?? 0;
  const awaitingCount =
    projects?.filter((p) =>
      p.scopeItems.some((i) => i.status === 'SUBMITTED'),
    ).length ?? 0;
  const deliveredCount =
    projects?.filter((p) => p.status === 'DELIVERED').length ?? 0;
  const totalApproved =
    projects?.reduce(
      (sum, p) =>
        sum +
        p.scopeItems.filter(
          (i) => i.status === 'APPROVED' || i.status === 'DELIVERED',
        ).length,
      0,
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">Branding Services</h1>
        <PermissionGate feature="branding.projects" action="write">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            New Branding Project
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Active projects', value: activeCount },
          { label: 'Awaiting approval', value: awaitingCount },
          { label: 'Delivered', value: deliveredCount },
          { label: 'Scope items approved', value: totalApproved },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
          >
            <p className="text-xs text-cdy-muted">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold text-cdy-white">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <div className="rounded-lg border border-red-800/30 bg-red-900/10 px-4 py-3 text-sm text-red-400">
          Failed to load branding projects.
        </div>
      )}

      {!isLoading && projects && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Scope items</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-cdy-muted">
                    No branding projects yet
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewProjectDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function ProjectRow({
  project,
}: {
  project: BrandingProjectListItem;
}): JSX.Element {
  return (
    <tr className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50">
      <td className="px-4 py-3">
        <Link
          href={`/branding/${project.id}`}
          className="font-medium text-cdy-white hover:text-cdy-red hover:underline"
        >
          {project.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-cdy-muted">{project.client.companyName}</td>
      <td className="px-4 py-3 text-cdy-muted">{project.scopeItems.length} items</td>
      <td className="px-4 py-3">
        <ScopeProgress items={project.scopeItems} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={project.status} />
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/branding/${project.id}`}
          className="flex items-center gap-1 text-xs text-cdy-red hover:underline"
        >
          View
          <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}
