'use client';

import { Fragment, useState } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { TaskStatus } from '@cdy/shared';
import { useTeamWorkload } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

const LOAD_STYLES = {
  HIGH: 'text-cdy-red',
  MEDIUM: 'text-amber-400',
  NORMAL: 'text-emerald-400',
} as const;

const LOAD_LABELS = {
  HIGH: '🔴 High',
  MEDIUM: '🟡 Medium',
  NORMAL: '🟢 Normal',
} as const;

export default function TeamWorkloadPage(): JSX.Element {
  const { data, isLoading } = useTeamWorkload();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cdy-white">Team Workload</h1>
        <p className="text-sm text-cdy-muted">
          Open tasks across all active projects
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-cdy-white">
                {data?.totalActiveTasks ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Active tasks</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-cdy-white">
                {data?.assignedEmployees ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Assigned employees</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-cdy-red">
                {data?.overdueTasks ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Overdue</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-amber-400">
                {data?.blockedTasks ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Blocked</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Dept</th>
                  <th className="px-4 py-3 font-medium">Open Tasks</th>
                  <th className="px-4 py-3 font-medium">Overdue</th>
                  <th className="px-4 py-3 font-medium">Urgent</th>
                  <th className="px-4 py-3 font-medium">Est. Hours</th>
                  <th className="px-4 py-3 font-medium">Load</th>
                </tr>
              </thead>
              <tbody>
                {data?.workload.map((row) => (
                  <Fragment key={row.employeeId}>
                    <tr
                      className="cursor-pointer border-b border-cdy-navy-border/50 hover:bg-cdy-navy/50"
                      onClick={() =>
                        setExpandedId(
                          expandedId === row.employeeId
                            ? null
                            : row.employeeId,
                        )
                      }
                    >
                      <td className="px-4 py-3 font-medium text-cdy-white">
                        {row.employeeName}
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {row.departmentName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-cdy-white">
                        {row.taskCount}
                      </td>
                      <td className="px-4 py-3 text-cdy-red">
                        {row.overdueCount}
                      </td>
                      <td className="px-4 py-3 text-cdy-white">
                        {row.urgentCount}
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {row.estimatedHours}h
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 font-medium',
                          LOAD_STYLES[row.load],
                        )}
                      >
                        {LOAD_LABELS[row.load]}
                      </td>
                    </tr>
                    {expandedId === row.employeeId && (
                      <tr>
                        <td colSpan={7} className="bg-cdy-navy px-4 py-4">
                          <p className="mb-3 text-sm font-medium text-cdy-white">
                            {row.employeeName} — {row.taskCount} open tasks
                          </p>
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="text-cdy-muted">
                                <th className="pb-2 pr-3">Project</th>
                                <th className="pb-2 pr-3">Task</th>
                                <th className="pb-2 pr-3">Priority</th>
                                <th className="pb-2 pr-3">Due</th>
                                <th className="pb-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.tasks.map((task) => {
                                const overdue =
                                  task.dueDate &&
                                  isPast(parseISO(task.dueDate)) &&
                                  task.status !== TaskStatus.DONE;
                                return (
                                  <tr
                                    key={task.id}
                                    className="border-t border-cdy-navy-border/50"
                                  >
                                    <td className="py-2 pr-3 text-cdy-muted">
                                      {task.projectName}
                                    </td>
                                    <td className="py-2 pr-3 text-cdy-white">
                                      {task.title}
                                    </td>
                                    <td className="py-2 pr-3 text-cdy-muted">
                                      {task.priority}
                                    </td>
                                    <td
                                      className={cn(
                                        'py-2 pr-3',
                                        overdue
                                          ? 'text-cdy-red'
                                          : 'text-cdy-muted',
                                      )}
                                    >
                                      {task.dueDate
                                        ? format(
                                            parseISO(task.dueDate),
                                            'MMM d',
                                          )
                                        : '—'}
                                      {overdue ? ' ⚠️' : ''}
                                    </td>
                                    <td className="py-2 text-cdy-muted">
                                      {task.status.replace(/_/g, ' ')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
