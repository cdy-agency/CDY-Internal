'use client';

import Link from 'next/link';
import { format, isPast, isToday, differenceInDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  FolderKanban,
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import {
  ProjectStatus,
  TaskPriority,
  type ProjectRecord,
} from '@cdy/shared';
import {
  useProjectsSummary,
  useProjects,
  useProjectProgress,
  useApproveMilestone,
} from '@/hooks/useProjects';
import { MetricCard } from '@/components/finance/MetricCard';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { cn, formatCurrency } from '@/lib/utils';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: 'Active',
  [ProjectStatus.ON_HOLD]: 'On Hold',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.CANCELLED]: 'Cancelled',
  [ProjectStatus.ARCHIVED]: 'Archived',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'text-emerald-400',
  [TaskPriority.MEDIUM]: 'text-blue-400',
  [TaskPriority.HIGH]: 'text-amber-400',
  [TaskPriority.URGENT]: 'text-cdy-red',
};

function progressBarColor(
  percent: number,
  endDate: string | null,
): string {
  if (percent >= 80) return 'bg-emerald-500';
  if (percent >= 50) return 'bg-amber-500';
  if (endDate) {
    const due = parseISO(endDate);
    if (isPast(due)) return 'bg-cdy-red';
    if (differenceInDays(due, new Date()) <= 7) return 'bg-amber-500';
  }
  return 'bg-cdy-red';
}

function ProjectProgressBar({
  project,
}: {
  project: ProjectRecord;
}): JSX.Element {
  const { data: progress, isLoading } = useProjectProgress(project.id);
  const percent = progress?.progressPercent ?? 0;

  if (isLoading) {
    return <div className="h-2 w-24 animate-pulse rounded-full bg-cdy-navy" />;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-cdy-navy">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            progressBarColor(percent, project.endDate),
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-cdy-muted">{percent}%</span>
    </div>
  );
}

export default function ProjectsOverviewPage(): JSX.Element {
  const { data: summary, isLoading: summaryLoading } = useProjectsSummary();
  const { data: projects, isLoading: projectsLoading } = useProjects({
    status: ProjectStatus.ACTIVE,
  });
  const approveMilestone = useApproveMilestone();

  const activeProjects = projects ?? [];

  async function handleApprove(
    projectId: string,
    milestoneId: string,
  ): Promise<void> {
    try {
      await approveMilestone.mutateAsync({ projectId, milestoneId });
      toast.success(
        'Milestone approved — draft invoice created in Finance.',
      );
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cdy-white">Overview</h1>
        <PermissionGate feature="projects.all" action="write">
          <Link href="/projects/new">
            <Button>New Project</Button>
          </Link>
        </PermissionGate>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active Projects"
          value={String(summary?.activeProjects ?? 0)}
          delta={0}
          deltaLabel="currently active"
          icon={FolderKanban}
          iconColor="bg-cdy-red/20 text-cdy-red"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Overdue Tasks"
          value={String(summary?.overdueTasks ?? 0)}
          delta={0}
          deltaLabel="need attention"
          icon={AlertTriangle}
          iconColor="bg-amber-500/20 text-amber-400"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Blocked Tasks"
          value={String(summary?.blockedTasks ?? 0)}
          delta={0}
          deltaLabel="awaiting resolution"
          icon={Ban}
          iconColor="bg-cdy-red/20 text-cdy-red"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Milestones Due"
          value={String(summary?.milestonesAwaitingApproval ?? 0)}
          delta={0}
          deltaLabel="awaiting approval"
          icon={CalendarClock}
          iconColor="bg-blue-500/20 text-blue-400"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Completed MTD"
          value={String(summary?.completedThisMonth ?? 0)}
          delta={0}
          deltaLabel="projects this month"
          icon={CheckCircle2}
          iconColor="bg-emerald-500/20 text-emerald-400"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Tasks Done MTW"
          value={String(summary?.tasksCompletedThisWeek ?? 0)}
          delta={0}
          deltaLabel="completed this week"
          icon={ListTodo}
          iconColor="bg-purple-500/20 text-purple-400"
          isLoading={summaryLoading}
        />
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h2 className="mb-4 text-lg font-semibold text-cdy-white">
          Active Projects
        </h2>
        {projectsLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : activeProjects.length === 0 ? (
          <p className="text-sm text-cdy-muted">No active projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-cdy-muted">
                  <th className="pb-3 pr-4 font-medium">Project</th>
                  <th className="pb-3 pr-4 font-medium">Client</th>
                  <th className="pb-3 pr-4 font-medium">Service</th>
                  <th className="pb-3 pr-4 font-medium">Progress</th>
                  <th className="pb-3 pr-4 font-medium">Due</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-cdy-navy-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-cdy-white hover:text-cdy-red"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-cdy-muted">
                        {project.projectCode}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-cdy-muted">
                      {project.client?.companyName ?? '—'}
                    </td>
                    <td className="py-3 pr-4 capitalize text-cdy-muted">
                      {project.serviceType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 pr-4">
                      <ProjectProgressBar project={project} />
                    </td>
                    <td className="py-3 pr-4 text-cdy-muted">
                      {project.endDate
                        ? format(parseISO(project.endDate), 'MMM d, yyyy')
                        : 'Ongoing'}
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          project.status === ProjectStatus.ACTIVE
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400',
                        )}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          <h2 className="mb-4 text-lg font-semibold text-cdy-white">
            Upcoming Deadlines
          </h2>
          {summaryLoading ? (
            <p className="text-sm text-cdy-muted">Loading…</p>
          ) : (summary?.upcomingDeadlines.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">
              No deadlines in the next 7 days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-cdy-muted">
                    <th className="pb-2 pr-3 font-medium">Task</th>
                    <th className="pb-2 pr-3 font-medium">Project</th>
                    <th className="pb-2 pr-3 font-medium">Assignee</th>
                    <th className="pb-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.upcomingDeadlines.map((deadline) => {
                    const due = parseISO(deadline.dueDate);
                    const overdue = isPast(due) && !isToday(due);
                    const dueToday = isToday(due);
                    return (
                      <tr
                        key={deadline.taskId}
                        className={cn(
                          'border-b border-cdy-navy-border/50 last:border-0',
                          overdue && 'bg-cdy-red/5',
                          dueToday && !overdue && 'bg-amber-500/5',
                        )}
                      >
                        <td className="py-2 pr-3">
                          <span
                            className={cn(
                              'font-medium',
                              PRIORITY_COLORS[deadline.priority],
                            )}
                          >
                            {deadline.priority}
                          </span>
                          <p className="text-cdy-white">{deadline.title}</p>
                        </td>
                        <td className="py-2 pr-3 text-cdy-muted">
                          {deadline.projectName}
                        </td>
                        <td className="py-2 pr-3 text-cdy-muted">
                          {deadline.assigneeName}
                        </td>
                        <td className="py-2 text-cdy-muted">
                          {format(due, 'MMM d')}
                          {overdue && (
                            <span className="ml-1 text-cdy-red">Overdue</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          <h2 className="mb-2 text-lg font-semibold text-cdy-white">
            Milestones Awaiting Approval
          </h2>
          <p className="mb-4 text-sm text-cdy-muted">
            {summary?.milestonesAwaitingApproval ?? 0} milestone
            {(summary?.milestonesAwaitingApproval ?? 0) !== 1 ? 's' : ''}{' '}
            awaiting approval
          </p>
          {summaryLoading ? (
            <p className="text-sm text-cdy-muted">Loading…</p>
          ) : (summary?.milestonesPendingApproval.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">None pending.</p>
          ) : (
            <div className="space-y-3">
              {summary?.milestonesPendingApproval.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-cdy-navy-border bg-cdy-navy p-3"
                >
                  <div>
                    <p className="font-medium text-cdy-white">
                      {milestone.projectName} — {milestone.name}
                    </p>
                    <p className="text-sm text-cdy-muted">
                      {formatCurrency(
                        milestone.billingAmount,
                        milestone.currency,
                      )}
                    </p>
                  </div>
                  <PermissionGate feature="projects.approvals" action="write">
                    <Button
                      size="sm"
                      onClick={() =>
                        void handleApprove(
                          milestone.projectId,
                          milestone.id,
                        )
                      }
                      disabled={approveMilestone.isPending}
                    >
                      Approve
                    </Button>
                  </PermissionGate>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
