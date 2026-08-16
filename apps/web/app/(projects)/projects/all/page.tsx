'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ProjectPriority, ProjectStatus } from '@cdy/shared';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: 'Active',
  [ProjectStatus.ON_HOLD]: 'On Hold',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.CANCELLED]: 'Cancelled',
  [ProjectStatus.ARCHIVED]: 'Archived',
};

const STATUS_STYLES: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: 'bg-emerald-500/15 text-emerald-400',
  [ProjectStatus.ON_HOLD]: 'bg-amber-500/15 text-amber-400',
  [ProjectStatus.COMPLETED]: 'bg-blue-500/15 text-blue-400',
  [ProjectStatus.CANCELLED]: 'bg-cdy-red/15 text-cdy-red',
  [ProjectStatus.ARCHIVED]: 'bg-cdy-navy text-cdy-dim',
};

const PRIORITY_STYLES: Record<ProjectPriority, string> = {
  [ProjectPriority.LOW]: 'text-emerald-400',
  [ProjectPriority.MEDIUM]: 'text-blue-400',
  [ProjectPriority.HIGH]: 'text-amber-400',
  [ProjectPriority.URGENT]: 'text-cdy-red',
};

const STATUS_FILTERS: { value: ProjectStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: ProjectStatus.ACTIVE, label: 'Active' },
  { value: ProjectStatus.ON_HOLD, label: 'On Hold' },
  { value: ProjectStatus.COMPLETED, label: 'Completed' },
  { value: ProjectStatus.CANCELLED, label: 'Cancelled' },
  { value: ProjectStatus.ARCHIVED, label: 'Archived' },
];

export default function AllProjectsPage(): JSX.Element {
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [search, setSearch] = useState('');
  const { data: projects, isLoading } = useProjects({
    status: status || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cdy-white">All Projects</h1>
          <p className="text-sm text-cdy-muted">
            Every project across every status — not just what's currently active.
          </p>
        </div>
        <PermissionGate feature="projects.all" action="write">
          <Link href="/projects/new">
            <Button className="bg-cdy-red hover:bg-cdy-red/90">New Project</Button>
          </Link>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus | '')}
          className="h-9 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code…"
          className="h-9 w-64 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white placeholder:text-cdy-muted"
        />
        {!isLoading && (
          <span className="text-xs text-cdy-muted">
            {projects?.length ?? 0} project{(projects?.length ?? 0) === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-cdy-muted">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Manager</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">End date</th>
              <th className="px-4 py-3 font-medium">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-cdy-muted">
                  Loading…
                </td>
              </tr>
            ) : (projects?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-cdy-muted">
                  No projects match this filter.
                </td>
              </tr>
            ) : (
              projects!.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30"
                >
                  <td className="px-4 py-3 text-cdy-muted">{project.projectCode}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-cdy-white hover:text-cdy-red"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {project.client?.companyName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {project.manager
                      ? `${project.manager.firstName} ${project.manager.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        STATUS_STYLES[project.status],
                      )}
                    >
                      {STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td className={cn('px-4 py-3 capitalize', PRIORITY_STYLES[project.priority])}>
                    {project.priority.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Ongoing'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">{project._count?.tasks ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
