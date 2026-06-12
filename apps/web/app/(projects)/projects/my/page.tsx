'use client';

import { useState } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { TaskPriority, TaskStatus } from '@cdy/shared';
import type { TaskRecord } from '@cdy/shared';
import {
  useMyTasks,
  useUpdateTaskStatus,
  useLogTime,
} from '@/hooks/useProjects';
import { useMyEmployeeProfile } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const logTime = useLogTime();
  const { data: myProfile } = useMyEmployeeProfile();

  const [timeModalTask, setTimeModalTask] = useState<TaskRecord | null>(null);
  const [timeForm, setTimeForm] = useState({
    hours: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

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

  async function handleLogTime(): Promise<void> {
    if (!timeModalTask || !myProfile) return;
    const hours = Number(timeForm.hours);
    if (!hours || hours <= 0) {
      toast.error('Enter valid hours');
      return;
    }
    try {
      await logTime.mutateAsync({
        projectId: timeModalTask.projectId,
        payload: {
          projectId: timeModalTask.projectId,
          taskId: timeModalTask.id,
          employeeId: myProfile.id,
          date: timeForm.date,
          hours,
          description: timeForm.description || undefined,
        },
      });
      toast.success('Time logged');
      setTimeModalTask(null);
      setTimeForm({
        hours: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });
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
                          <button
                            type="button"
                            onClick={() => setTimeModalTask(task)}
                            className="text-sm text-cdy-red hover:underline"
                          >
                            Log time
                          </button>
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

      {timeModalTask && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setTimeModalTask(null)}
            role="presentation"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy p-6 shadow-xl">
              <h3 className="mb-4 font-semibold text-cdy-white">
                Log Time — {timeModalTask.title}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="timeDate">Date</Label>
                  <Input
                    id="timeDate"
                    type="date"
                    value={timeForm.date}
                    onChange={(e) =>
                      setTimeForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timeHours">Hours *</Label>
                  <Input
                    id="timeHours"
                    type="number"
                    min="0.01"
                    max="24"
                    step="0.25"
                    value={timeForm.hours}
                    onChange={(e) =>
                      setTimeForm((f) => ({ ...f, hours: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timeDesc">Description</Label>
                  <Input
                    id="timeDesc"
                    value={timeForm.description}
                    onChange={(e) =>
                      setTimeForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setTimeModalTask(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleLogTime()}
                  disabled={logTime.isPending}
                >
                  Log Time
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
