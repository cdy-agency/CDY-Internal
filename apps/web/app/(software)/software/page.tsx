'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, ExternalLink, X } from 'lucide-react';
import { useSoftwareProjects, useCreateSoftwareProject } from '@/hooks/useSoftware';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { ClientSearch } from '@/components/crm/ClientSearch';
import type { SoftwareProjectListItem } from '@cdy/shared';
import type { ClientSearchResult } from '@cdy/shared';

const PHASE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  REQUIREMENTS: {
    label: 'Requirements',
    color: 'text-cdy-muted',
    bg: 'bg-cdy-navy',
  },
  DESIGN: { label: 'Design', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  DEVELOPMENT: {
    label: 'Development',
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
  },
  QA: { label: 'QA', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  DEPLOYMENT: { label: 'Deployment', color: 'text-cdy-red', bg: 'bg-red-900/20' },
  MAINTENANCE: {
    label: 'Maintenance',
    color: 'text-green-400',
    bg: 'bg-green-900/30',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-cdy-muted',
    bg: 'bg-cdy-navy-light',
  },
};

const TYPE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  WEB_APP: 'Web App',
  MOBILE_APP: 'Mobile App',
  SYSTEM: 'System',
  OTHER: 'Other',
};

function PhaseBadge({ phase }: { phase: string }): JSX.Element {
  const cfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.REQUIREMENTS;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  );
}

interface NewProjectDrawerProps {
  open: boolean;
  onClose: () => void;
}

function NewProjectDrawer({ open, onClose }: NewProjectDrawerProps): JSX.Element | null {
  const createProject = useCreateSoftwareProject();
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState('WEBSITE');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function reset() {
    setSelectedClient(null);
    setName('');
    setProjectType('WEBSITE');
    setStartDate('');
    setDescription('');
    setNotes('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }
    try {
      await createProject.mutateAsync({
        clientId: selectedClient.id,
        name: name.trim(),
        projectType,
        startDate,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create project';
      setError(msg);
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
            New Software Project
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
              <Label htmlFor="sw-name">Project name</Label>
              <Input
                id="sw-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="TechStart Rwanda Website"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div>
              <Label htmlFor="sw-type">Type</Label>
              <select
                id="sw-type"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="sw-start">Start date</Label>
              <Input
                id="sw-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div>
              <Label htmlFor="sw-desc">Description</Label>
              <textarea
                id="sw-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>

            <div>
              <Label htmlFor="sw-notes">Notes (optional)</Label>
              <textarea
                id="sw-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
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
              disabled={createProject.isPending}
            >
              {createProject.isPending ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SoftwareOverviewPage(): JSX.Element {
  const { data: projects, isLoading, isError } = useSoftwareProjects();
  const [addOpen, setAddOpen] = useState(false);

  const activeCount =
    projects?.filter((p) => p.isActive && p.phase !== 'COMPLETED').length ?? 0;
  const inDevCount =
    projects?.filter((p) => p.phase === 'DEVELOPMENT').length ?? 0;
  const inMaintenanceCount =
    projects?.filter((p) => p.phase === 'MAINTENANCE').length ?? 0;
  const openIssuesCount =
    projects?.reduce((sum, p) => sum + p._count.maintenanceLogs, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">
          Software & Web Dev
        </h1>
        <PermissionGate feature="software.projects" action="write">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            New Software Project
          </Button>
        </PermissionGate>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Active projects', value: activeCount },
          { label: 'In development', value: inDevCount },
          { label: 'In maintenance', value: inMaintenanceCount },
          { label: 'Open issues', value: openIssuesCount },
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
        <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          Failed to load software projects.
        </div>
      )}

      {!isLoading && projects && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-cdy-muted"
                  >
                    No software projects yet
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
  project: SoftwareProjectListItem;
}): JSX.Element {
  return (
    <tr className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50">
      <td className="px-4 py-3">
        <Link
          href={`/software/${project.id}`}
          className="font-medium text-cdy-white hover:text-cdy-red hover:underline"
        >
          {project.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-cdy-muted">{project.client.companyName}</td>
      <td className="px-4 py-3 text-cdy-muted">
        {TYPE_LABELS[project.projectType] ?? project.projectType}
      </td>
      <td className="px-4 py-3">
        <PhaseBadge phase={project.phase} />
      </td>
      <td className="px-4 py-3 text-cdy-muted">
        {format(new Date(project.startDate), 'MMM d, yyyy')}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/software/${project.id}`}
          className="flex items-center gap-1 text-xs text-cdy-red hover:underline"
        >
          View
          <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}
