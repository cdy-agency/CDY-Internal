'use client';

import Link from 'next/link';
import { format, isPast, isToday, differenceInDays, parseISO } from 'date-fns';
import {
  ProjectStatus,
  TaskPriority,
  type ProjectRecord,
} from '@cdy/shared';
import {
  useProjectsSummary,
  useProjects,
  useProjectProgress,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';
import {
  MetricHero,
  SectionCard,
  DonutChart,
  DataTable,
  QualityBadge,
} from '@/components/dashboard';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'text-emerald-400',
  [TaskPriority.MEDIUM]: 'text-blue-400',
  [TaskPriority.HIGH]: 'text-amber-400',
  [TaskPriority.URGENT]: 'text-cdy-red',
};

function progressColor(percent: number, endDate: string | null): string {
  if (percent >= 80) return '#4ADE80';
  if (percent >= 50) return '#FBBF24';
  if (endDate && isPast(parseISO(endDate))) return '#C41E3A';
  if (endDate && differenceInDays(parseISO(endDate), new Date()) <= 7) return '#FBBF24';
  return '#C41E3A';
}

function ProjectRow({ project }: { project: ProjectRecord }): JSX.Element {
  const { data: progress, isLoading } = useProjectProgress(project.id);
  const percent = progress?.progressPercent ?? 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/projects/${project.id}`}
          className="min-w-0 flex-1 font-medium text-cdy-white hover:text-cdy-red"
        >
          <span className="truncate">{project.name}</span>
          <span className="ml-2 text-xs text-cdy-dim">
            {project.projectCode}
          </span>
        </Link>
        <span className="shrink-0 text-xs text-cdy-muted">
          {project.client?.companyName ?? '—'}
        </span>
        <span className="shrink-0 font-mono text-xs text-cdy-muted">
          {percent}%
        </span>
      </div>
      {isLoading ? (
        <div className="h-1.5 animate-pulse rounded-full bg-cdy-navy" />
      ) : (
        <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${percent}%`,
              backgroundColor: progressColor(percent, project.endDate),
            }}
          />
        </div>
      )}
      <div className="flex justify-between text-xs text-cdy-dim">
        <span className="capitalize">{project.serviceType.replace(/_/g, ' ')}</span>
        <span>
          {project.endDate
            ? format(parseISO(project.endDate), 'MMM d, yyyy')
            : 'Ongoing'}
        </span>
      </div>
    </div>
  );
}

export default function ProjectsOverviewPage(): JSX.Element {
  const { data: summary, isLoading: summaryLoading } = useProjectsSummary();
  const { data: projects, isLoading: projectsLoading } = useProjects({
    status: ProjectStatus.ACTIVE,
  });

  const activeProjects = projects ?? [];
  const totalTracked =
    (summary?.activeProjects ?? 0) +
    (summary?.completedThisMonth ?? 0);

  const healthData = [
    {
      label: 'On track',
      value: Math.max(
        (summary?.activeProjects ?? 0) -
        (summary?.overdueTasks ?? 0) -
        (summary?.blockedTasks ?? 0),
        0,
      ),
      color: '#4ADE80',
    },
    {
      label: 'Overdue tasks',
      value: summary?.overdueTasks ?? 0,
      color: '#FBBF24',
    },
    {
      label: 'Blocked tasks',
      value: summary?.blockedTasks ?? 0,
      color: '#F87171',
    },
  ].filter((s) => s.value > 0);

  const healthScore =
    totalTracked > 0
      ? Math.round(
          (Math.max(
            (summary?.activeProjects ?? 0) -
            (summary?.overdueTasks ?? 0) -
            (summary?.blockedTasks ?? 0),
            0,
          ) /
          Math.max(summary?.activeProjects ?? 1, 1)) *
          100,
        )
      : 0;

  const healthQuality =
    healthScore >= 80 ? { label: 'HEALTHY', variant: 'green' as const } :
    healthScore >= 60 ? { label: 'FAIR', variant: 'blue' as const } :
    healthScore >= 40 ? { label: 'AT RISK', variant: 'amber' as const } :
    { label: 'CRITICAL', variant: 'red' as const };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <PermissionGate feature="projects.all" action="write">
          <Link href="/projects/new">
            <Button className="bg-cdy-red hover:bg-cdy-red/90">
              New Project
            </Button>
          </Link>
        </PermissionGate>
      </div>

      {/* Row 1 — Hero metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <SectionCard>
          <MetricHero
            value={String(summary?.activeProjects ?? 0)}
            label="Active projects"
            isLoading={summaryLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={String(summary?.overdueTasks ?? 0)}
            label="Overdue tasks"
            badge={
              (summary?.overdueTasks ?? 0) > 0 ? 'ACTION REQUIRED' : 'ALL CLEAR'
            }
            badgeVariant={
              (summary?.overdueTasks ?? 0) > 0 ? 'amber' : 'green'
            }
            isLoading={summaryLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={String(summary?.blockedTasks ?? 0)}
            label="Blocked tasks"
            badge={
              (summary?.blockedTasks ?? 0) > 0 ? 'BLOCKED' : 'ALL CLEAR'
            }
            badgeVariant={
              (summary?.blockedTasks ?? 0) > 0 ? 'red' : 'green'
            }
            isLoading={summaryLoading}
            size="md"
          />
        </SectionCard>
      </div>

      {/* Row 2 — Health DonutChart + Active project progress bars */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Portfolio health">
          <div className="flex items-center gap-4">
            {healthData.length > 0 ? (
              <DonutChart segments={healthData} size={110} thickness={22} />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-8 border-cdy-navy text-2xl font-bold text-cdy-white">
                —
              </div>
            )}
            <div className="space-y-2">
              <QualityBadge
                label={healthQuality.label}
                variant={healthQuality.variant}
              />
              <div className="space-y-1 text-xs text-cdy-muted">
                <p>
                  <span className="font-mono text-green-400">
                    {summary?.completedThisMonth ?? 0}
                  </span>{' '}
                  completed MTD
                </p>
                <p>
                  <span className="font-mono text-purple-400">
                    {summary?.tasksCompletedThisWeek ?? 0}
                  </span>{' '}
                  tasks done this week
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Active project progress" className="lg:col-span-2">
          {projectsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-48 animate-pulse rounded bg-cdy-navy" />
                  <div className="h-1.5 animate-pulse rounded-full bg-cdy-navy" />
                </div>
              ))}
            </div>
          ) : activeProjects.length === 0 ? (
            <p className="text-sm text-cdy-muted">No active projects yet.</p>
          ) : (
            <div className="space-y-4">
              {activeProjects.slice(0, 6).map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
              {activeProjects.length > 6 && (
                <Link
                  href="/projects"
                  className="block text-xs text-cdy-red hover:underline"
                >
                  +{activeProjects.length - 6} more projects →
                </Link>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 3 — Upcoming deadlines */}
      <SectionCard title="Upcoming deadlines — 7 days">
        {summaryLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : (summary?.upcomingDeadlines.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">No deadlines in the next 7 days.</p>
        ) : (
          <DataTable
            columns={['Task', 'Project', 'Assignee', 'Due']}
            rows={(summary?.upcomingDeadlines ?? []).map((d) => {
              const due = parseISO(d.dueDate);
              const overdue = isPast(due) && !isToday(due);
              const dueToday = isToday(due);
              return [
                <span key="task" className={cn(
                  PRIORITY_COLORS[d.priority],
                  'font-medium',
                )}>
                  {d.title}
                </span>,
                d.projectName,
                d.assigneeName,
                <span key="due" className={cn(
                  overdue ? 'text-cdy-red font-semibold' :
                  dueToday ? 'text-amber-400 font-semibold' :
                  'text-cdy-muted',
                )}>
                  {format(due, 'MMM d')}
                  {overdue && ' (overdue)'}
                  {dueToday && ' (today)'}
                </span>,
              ];
            })}
          />
        )}
      </SectionCard>
    </div>
  );
}
