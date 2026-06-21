'use client';

import { format, isPast, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { TaskPriority, TaskStatus } from '@cdy/shared';
import {
  useMyTasks,
  useUpdateTaskStatus,
} from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.BLOCKED]: 'Blocked',
  [TaskStatus.IN_REVIEW]: 'In Review',
  [TaskStatus.DONE]: 'Done',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'bg-emerald-400',
  [TaskPriority.MEDIUM]: 'bg-blue-400',
  [TaskPriority.HIGH]: 'bg-amber-400',
  [TaskPriority.URGENT]: 'bg-cdy-red',
};

export default function MyTasksPage(): JSX.Element {
  const { data, isLoading } = useMyTasks();
  const updateStatus = useUpdateTaskStatus();

  async function handleStatusChange(
    projectId: string,
    taskId: string,
    status: TaskStatus,
  ): Promise<void> {
    try {
      await updateStatus.mutateAsync({
        projectId,
        taskId,
        payload: { status },
      });
      toast.success('Status updated');
    } catch {
      /* interceptor */
    }
  }

  const overview = data?.overview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cdy-white">My Tasks</h1>
        <p className="text-sm text-cdy-muted">
          Tasks assigned to you across all projects
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-cdy-red">
                {overview?.overdue ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Overdue</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-amber-400">
                {overview?.dueToday ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Due today</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-blue-400">
                {overview?.dueThisWeek ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Due this week</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-cdy-white">
                {overview?.totalOpen ?? 0}
              </p>
              <p className="text-xs text-cdy-muted">Total open</p>
            </div>
          </div>

          {(data?.groups.length ?? 0) === 0 ? (
            <p className="text-sm text-cdy-muted">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-6">
              {data?.groups.map((group) => (
                <div
                  key={group.projectId}
                  className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5"
                >
                  <h2 className="mb-4 font-semibold text-cdy-white">
                    {group.projectName}
                    <span className="ml-2 text-sm font-normal text-cdy-muted">
                      {group.projectCode}
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {group.tasks.map((task) => {
                      const overdue =
                        task.dueDate &&
                        isPast(parseISO(task.dueDate)) &&
                        !isToday(parseISO(task.dueDate)) &&
                        task.status !== TaskStatus.DONE;
                      return (
                        <div
                          key={task.id}
                          className="flex flex-wrap items-center gap-3 rounded-md border border-cdy-navy-border bg-cdy-navy p-3"
                        >
                          <span
                            className={cn(
                              'h-2 w-2 shrink-0 rounded-full',
                              PRIORITY_DOT[task.priority],
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-cdy-white">
                              {task.title}
                            </p>
                            {task.dueDate && (
                              <p
                                className={cn(
                                  'text-xs',
                                  overdue
                                    ? 'text-cdy-red'
                                    : 'text-cdy-muted',
                                )}
                              >
                                Due {format(parseISO(task.dueDate), 'MMM d')}
                                {overdue ? ' — Overdue' : ''}
                              </p>
                            )}
                          </div>
                          <select
                            value={task.status}
                            onChange={(e) =>
                              void handleStatusChange(
                                task.projectId,
                                task.id,
                                e.target.value as TaskStatus,
                              )
                            }
                            className="rounded-md border border-cdy-navy-border bg-cdy-navy-light px-2 py-1 text-sm text-cdy-white"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
