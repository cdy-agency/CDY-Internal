'use client';

import { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  format,
  isPast,
  isToday,
  parseISO,
} from 'date-fns';
import toast from 'react-hot-toast';
import {
  ProjectPriority,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  MilestoneStatus,
  ApprovalStatus,
} from '@cdy/shared';
import type { TaskRecord } from '@cdy/shared';
import {
  useProject,
  useProjectProgress,
  useProjectTasks,
  useTask,
  useMilestones,
  useProjectTimeSummary,
  useCreateTask,
  useUpdateTaskStatus,
  useAddTaskComment,
  useLogTime,
  useCompleteMilestone,
  useApproveMilestone,
  useRequestApproval,
  useCompleteProject,
  useGenerateHandoverReport,
  useImportTasksCsv,
} from '@/hooks/useProjects';
import { ProjectApprovalsPanel } from '@/components/projects/ProjectApprovalsPanel';
import { ProjectActivityPanel } from '@/components/projects/ProjectActivityPanel';
import { CompleteProjectModal } from '@/components/projects/CompleteProjectModal';
import { CsvImportModal } from '@/components/projects/CsvImportModal';
import { useEmployees } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { cn, formatCurrency } from '@/lib/utils';

type DetailTab = 'tasks' | 'milestones' | 'time' | 'approvals' | 'activity';

const TAB_LABELS: Record<DetailTab, string> = {
  tasks: 'Tasks',
  milestones: 'Milestones',
  time: 'Time',
  approvals: 'Approvals',
  activity: 'Activity',
};

const KANBAN_COLUMNS: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

const COLUMN_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.BLOCKED]: 'Blocked',
  [TaskStatus.IN_REVIEW]: 'In Review',
  [TaskStatus.DONE]: 'Done',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: 'Active',
  [ProjectStatus.ON_HOLD]: 'On Hold',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.CANCELLED]: 'Cancelled',
  [ProjectStatus.ARCHIVED]: 'Archived',
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'text-emerald-400',
  [TaskPriority.MEDIUM]: 'text-blue-400',
  [TaskPriority.HIGH]: 'text-amber-400',
  [TaskPriority.URGENT]: 'text-cdy-red',
};

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  [MilestoneStatus.PENDING]: 'Pending',
  [MilestoneStatus.IN_PROGRESS]: 'In Progress',
  [MilestoneStatus.COMPLETED]: 'Completed',
  [MilestoneStatus.APPROVED]: 'Approved',
  [MilestoneStatus.INVOICED]: 'Invoiced',
};

function TaskKanbanCard({
  task,
  onSelect,
}: {
  task: TaskRecord;
  onSelect: (task: TaskRecord) => void;
}): JSX.Element {
  const overdue =
    task.dueDate &&
    isPast(parseISO(task.dueDate)) &&
    !isToday(parseISO(task.dueDate)) &&
    task.status !== TaskStatus.DONE;

  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light p-3 text-left transition-colors hover:border-cdy-red/40"
    >
      <p className={cn('text-xs font-semibold', PRIORITY_BADGE[task.priority])}>
        {task.priority}
      </p>
      <p className="mt-1 text-sm font-medium text-cdy-white">{task.title}</p>
      {task.assignee && (
        <p className="mt-1 text-xs text-cdy-muted">
          {task.assignee.firstName} {task.assignee.lastName}
        </p>
      )}
      {task.dueDate && (
        <p
          className={cn(
            'mt-1 text-xs',
            overdue ? 'text-cdy-red' : 'text-cdy-muted',
          )}
        >
          Due {format(parseISO(task.dueDate), 'MMM d')}
          {overdue ? ' — Overdue' : ''}
        </p>
      )}
      {task.estimatedHours != null && (
        <p className="mt-1 text-xs text-cdy-muted">
          {task.loggedHours ?? 0} / {task.estimatedHours}h estimated
        </p>
      )}
      {task.requiresApproval && task.approvalStatus && (
        <p
          className={cn(
            'mt-2 rounded px-2 py-0.5 text-xs',
            task.approvalStatus === ApprovalStatus.PENDING_APPROVAL &&
              'bg-amber-950 text-amber-400',
            task.approvalStatus === ApprovalStatus.APPROVED &&
              'bg-green-950 text-green-400',
            task.approvalStatus === ApprovalStatus.CHANGES_REQUESTED &&
              'bg-red-950 text-red-400',
          )}
        >
          {task.approvalStatus === ApprovalStatus.PENDING_APPROVAL &&
            '⏳ Approval pending'}
          {task.approvalStatus === ApprovalStatus.APPROVED && '✅ Approved'}
          {task.approvalStatus === ApprovalStatus.CHANGES_REQUESTED &&
            '❌ Changes requested'}
        </p>
      )}
    </button>
  );
}

export default function ProjectDetailPage(): JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = String(params.id);

  const tabParam = searchParams.get('tab');
  const validTabs: DetailTab[] = [
    'tasks',
    'milestones',
    'time',
    'approvals',
    'activity',
  ];
  const initialTab =
    tabParam && validTabs.includes(tabParam as DetailTab)
      ? (tabParam as DetailTab)
      : 'tasks';
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: progress } = useProjectProgress(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const { data: selectedTask } = useTask(
    projectId,
    selectedTaskId ?? '',
  );
  const { data: milestones } = useMilestones(projectId);
  const { data: timeSummary } = useProjectTimeSummary(projectId);
  const { data: employees } = useEmployees();

  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const addComment = useAddTaskComment();
  const logTime = useLogTime();
  const completeMilestone = useCompleteMilestone();
  const approveMilestone = useApproveMilestone();
  const requestApproval = useRequestApproval();
  const completeProject = useCompleteProject();
  const generateHandover = useGenerateHandoverReport();
  const importTasksCsv = useImportTasksCsv();

  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus | ''>('');
  const [commentText, setCommentText] = useState('');
  const [approvalFormOpen, setApprovalFormOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    milestoneId: '',
    assigneeId: '',
    priority: TaskPriority.MEDIUM,
    dueDate: '',
    estimatedHours: '',
    requiresApproval: false,
    parentTaskId: '',
  });

  const [timeForm, setTimeForm] = useState({
    employeeId: '',
    taskId: '',
    date: new Date().toISOString().slice(0, 10),
    hours: '',
    description: '',
    isBillable: true,
  });

  const tasksByStatus = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = (tasks ?? []).filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, TaskRecord[]>,
  );

  const incompleteTasks = (tasks ?? []).filter(
    (t) => t.status !== TaskStatus.DONE,
  );
  const uninvoicedMilestones = (milestones ?? []).filter(
    (m) =>
      m.billingAmount != null &&
      m.billingAmount > 0 &&
      m.status !== MilestoneStatus.INVOICED,
  );

  async function handleCompleteProject(payload: {
    acknowledgeIncompleteTasks: boolean;
    acknowledgeUninvoicedMilestones: boolean;
    completionNotes?: string;
  }): Promise<void> {
    try {
      const updated = await completeProject.mutateAsync({
        projectId,
        payload,
      });
      toast.success(
        `Project ${updated.projectCode} completed. Handover report ready to generate.`,
      );
    } catch {
      /* interceptor */
    }
  }

  async function handleGenerateHandover(): Promise<void> {
    try {
      await generateHandover.mutateAsync(projectId);
      toast.success('Handover report generated');
      router.push(`/projects/${projectId}/handover`);
    } catch {
      /* interceptor */
    }
  }

  async function handleCreateTask(): Promise<void> {
    if (!taskForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await createTask.mutateAsync({
        projectId,
        payload: {
          projectId,
          title: taskForm.title,
          description: taskForm.description || undefined,
          milestoneId: taskForm.milestoneId || undefined,
          assigneeId: taskForm.assigneeId || undefined,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || undefined,
          estimatedHours: taskForm.estimatedHours
            ? Number(taskForm.estimatedHours)
            : undefined,
          requiresApproval: taskForm.requiresApproval,
          parentTaskId: taskForm.parentTaskId || undefined,
        },
      });
      toast.success('Task created');
      setAddTaskOpen(false);
      setTaskForm({
        title: '',
        description: '',
        milestoneId: '',
        assigneeId: '',
        priority: TaskPriority.MEDIUM,
        dueDate: '',
        estimatedHours: '',
        requiresApproval: false,
        parentTaskId: '',
      });
    } catch {
      /* interceptor */
    }
  }

  async function handleUpdateStatus(): Promise<void> {
    if (!selectedTaskId || !newStatus) return;
    try {
      await updateStatus.mutateAsync({
        projectId,
        taskId: selectedTaskId,
        payload: {
          status: newStatus,
          note: statusNote || undefined,
        },
      });
      toast.success('Status updated');
      setStatusNote('');
      setNewStatus('');
    } catch {
      /* interceptor */
    }
  }

  async function handleAddComment(): Promise<void> {
    if (!selectedTaskId || !commentText.trim()) return;
    try {
      await addComment.mutateAsync({
        projectId,
        taskId: selectedTaskId,
        payload: { content: commentText },
      });
      toast.success('Comment added');
      setCommentText('');
    } catch {
      /* interceptor */
    }
  }

  async function handleLogTime(): Promise<void> {
    const hours = Number(timeForm.hours);
    if (!timeForm.employeeId || !hours) {
      toast.error('Employee and hours are required');
      return;
    }
    try {
      await logTime.mutateAsync({
        projectId,
        payload: {
          projectId,
          employeeId: timeForm.employeeId,
          taskId: timeForm.taskId || undefined,
          date: timeForm.date,
          hours,
          description: timeForm.description || undefined,
          isBillable: timeForm.isBillable,
        },
      });
      toast.success('Time logged');
      setLogTimeOpen(false);
    } catch {
      /* interceptor */
    }
  }

  async function handleCompleteMilestone(milestoneId: string): Promise<void> {
    try {
      await completeMilestone.mutateAsync({ projectId, milestoneId });
      toast.success('Milestone marked complete');
    } catch {
      /* interceptor */
    }
  }

  async function handleApproveMilestone(milestoneId: string): Promise<void> {
    try {
      await approveMilestone.mutateAsync({ projectId, milestoneId });
      toast.success(
        'Milestone approved — draft invoice created in Finance.',
      );
    } catch {
      /* interceptor */
    }
  }

  async function handleRequestApproval(): Promise<void> {
    if (!selectedTaskId || !approvalForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await requestApproval.mutateAsync({
        projectId,
        taskId: selectedTaskId,
        payload: {
          title: approvalForm.title,
          description: approvalForm.description || undefined,
          fileUrl: approvalForm.fileUrl || undefined,
        },
      });
      toast.success('Approval requested');
      setApprovalFormOpen(false);
      setApprovalForm({ title: '', description: '', fileUrl: '' });
    } catch {
      /* interceptor */
    }
  }

  const invoicedTotal =
    milestones
      ?.filter((m) =>
        [MilestoneStatus.APPROVED, MilestoneStatus.INVOICED].includes(m.status),
      )
      .reduce((s, m) => s + (m.billingAmount ?? 0), 0) ?? 0;
  const budgetTotal = project?.estimatedBudget ?? 0;

  if (projectLoading) {
    return <p className="text-sm text-cdy-muted">Loading project…</p>;
  }

  if (!project) {
    return <p className="text-sm text-cdy-muted">Project not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 border-b border-cdy-navy-border bg-cdy-navy px-6 pb-4 pt-2">
        <Link
          href="/projects"
          className="text-sm text-cdy-muted hover:text-cdy-white"
        >
          ← All projects
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-cdy-muted">
                {project.projectCode}
              </span>
              <span className="text-cdy-muted">·</span>
              <h1 className="text-xl font-semibold text-cdy-white">
                {project.name}
              </h1>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                {STATUS_LABELS[project.status]}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  project.priority === ProjectPriority.URGENT
                    ? 'bg-cdy-red/15 text-cdy-red'
                    : 'bg-amber-500/15 text-amber-400',
                )}
              >
                {project.priority}
              </span>
            </div>
            <p className="mt-1 text-sm text-cdy-muted">
              {project.client?.companyName && (
                <>Client: {project.client.companyName} · </>
              )}
              <span className="capitalize">
                {project.serviceType.replace(/_/g, ' ')}
              </span>
              {project.endDate && (
                <> · Due {format(parseISO(project.endDate), 'MMM d, yyyy')}</>
              )}
            </p>
            {project.manager && (
              <p className="mt-1 text-sm text-cdy-muted">
                PM: {project.manager.firstName} {project.manager.lastName}
              </p>
            )}
          </div>
          <div className="min-w-[200px]">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-cdy-muted">Progress</span>
              <span className="text-cdy-white">
                {progress?.progressPercent ?? 0}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cdy-navy-light">
              <div
                className="h-full rounded-full bg-cdy-red transition-all"
                style={{ width: `${progress?.progressPercent ?? 0}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <PermissionGate feature="projects.all" action="write">
                {project.status === ProjectStatus.ACTIVE && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCompleteModalOpen(true)}
                  >
                    Complete Project
                  </Button>
                )}
                {project.status === ProjectStatus.COMPLETED && (
                  <Button
                    size="sm"
                    onClick={() => void handleGenerateHandover()}
                    disabled={generateHandover.isPending}
                  >
                    📄 Generate Handover Report
                  </Button>
                )}
              </PermissionGate>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1 border-b border-cdy-navy-border">
          {(['tasks', 'milestones', 'time', 'approvals', 'activity'] as DetailTab[]).map(
            (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'border-b-2 border-cdy-red text-cdy-red'
                  : 'text-cdy-muted hover:text-cdy-white',
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
          <Link
            href={`/projects/${projectId}/profitability`}
            className="px-4 py-2 text-sm font-medium text-cdy-muted hover:text-cdy-white"
          >
            Profitability
          </Link>
          <Link
            href={`/projects/${projectId}/status-report`}
            className="px-4 py-2 text-sm font-medium text-cdy-muted hover:text-cdy-white"
          >
            Status Report
          </Link>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <div>
          <div className="mb-4 flex justify-end gap-2">
            <PermissionGate feature="projects.tasks" action="write">
              <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
                Import tasks from CSV
              </Button>
              <Button onClick={() => setAddTaskOpen(true)}>+ Add Task</Button>
            </PermissionGate>
          </div>
          <div className="grid gap-4 overflow-x-auto lg:grid-cols-5">
            {KANBAN_COLUMNS.map((status) => (
              <div
                key={status}
                className="min-w-[200px] rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-3"
              >
                <h3 className="mb-3 text-sm font-semibold text-cdy-white">
                  {COLUMN_LABELS[status]}
                  <span className="ml-2 text-cdy-muted">
                    ({tasksByStatus[status].length})
                  </span>
                </h3>
                <div className="space-y-2">
                  {tasksByStatus[status].map((task) => (
                    <TaskKanbanCard
                      key={task.id}
                      task={task}
                      onSelect={(t) => setSelectedTaskId(t.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          {budgetTotal > 0 && (
            <p className="mb-4 text-sm text-cdy-muted">
              Progress toward invoicing:{' '}
              <span className="text-cdy-white">
                {formatCurrency(invoicedTotal, project.currency)}
              </span>{' '}
              / {formatCurrency(budgetTotal, project.currency)} (
              {Math.round((invoicedTotal / budgetTotal) * 100)}%)
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-cdy-muted">
                  <th className="pb-3 pr-4 font-medium">Milestone</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Tasks</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {milestones?.map((milestone) => {
                  const taskCount = milestone._count?.tasks ?? 0;
                  const completed = milestone.completedTaskCount ?? 0;
                  const allDone =
                    taskCount > 0 && completed === taskCount;
                  return (
                    <tr
                      key={milestone.id}
                      className="border-b border-cdy-navy-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4 text-cdy-white">
                        {milestone.name}
                      </td>
                      <td className="py-3 pr-4 text-cdy-muted">
                        {milestone.billingAmount
                          ? formatCurrency(
                              milestone.billingAmount,
                              milestone.currency,
                            )
                          : '—'}
                      </td>
                      <td className="py-3 pr-4 text-cdy-muted">
                        {completed}/{taskCount}
                      </td>
                      <td className="py-3 pr-4">
                        {MILESTONE_STATUS_LABELS[milestone.status]}
                      </td>
                      <td className="py-3">
                        {allDone &&
                          milestone.status === MilestoneStatus.IN_PROGRESS && (
                            <PermissionGate
                              feature="projects.tasks"
                              action="write"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void handleCompleteMilestone(milestone.id)
                                }
                              >
                                Mark Complete
                              </Button>
                            </PermissionGate>
                          )}
                        {milestone.status === MilestoneStatus.COMPLETED && (
                          <PermissionGate
                            feature="projects.approvals"
                            action="write"
                          >
                            <Button
                              size="sm"
                              onClick={() =>
                                void handleApproveMilestone(milestone.id)
                              }
                            >
                              Approve & Invoice
                            </Button>
                          </PermissionGate>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-cdy-muted">
              Total: {timeSummary?.totalHours ?? 0}h · Billable:{' '}
              {timeSummary?.billableHours ?? 0}h · Non-billable:{' '}
              {(
                (timeSummary?.totalHours ?? 0) -
                (timeSummary?.billableHours ?? 0)
              ).toFixed(1)}
              h
            </p>
            <PermissionGate feature="projects.time" action="write">
              <Button onClick={() => setLogTimeOpen(true)}>+ Log Time</Button>
            </PermissionGate>
          </div>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Billable</th>
                </tr>
              </thead>
              <tbody>
                {timeSummary?.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-cdy-navy-border/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-cdy-muted">
                      {format(parseISO(entry.date), 'MMM d')}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {entry.employee
                        ? `${entry.employee.firstName} ${entry.employee.lastName}`
                        : entry.employeeId}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {entry.task?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {entry.hours}h
                    </td>
                    <td className="px-4 py-3">
                      {entry.isBillable ? '✅' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <ProjectApprovalsPanel projectId={projectId} />
      )}

      {activeTab === 'activity' && (
        <ProjectActivityPanel projectId={projectId} />
      )}

      {selectedTaskId && selectedTask && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setSelectedTaskId(null)}
            role="presentation"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-cdy-navy-border bg-cdy-navy shadow-xl">
            <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
              <div>
                <p
                  className={cn(
                    'text-xs font-semibold',
                    PRIORITY_BADGE[selectedTask.priority],
                  )}
                >
                  {selectedTask.priority} · {selectedTask.status}
                </p>
                <h3 className="font-semibold text-cdy-white">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="text-cdy-muted hover:text-cdy-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {selectedTask.assignee && (
                <p className="text-sm text-cdy-muted">
                  Assignee: {selectedTask.assignee.firstName}{' '}
                  {selectedTask.assignee.lastName}
                </p>
              )}
              {selectedTask.dueDate && (
                <p className="text-sm text-cdy-muted">
                  Due: {format(parseISO(selectedTask.dueDate), 'MMM d, yyyy')}
                </p>
              )}
              {selectedTask.estimatedHours != null && (
                <p className="text-sm text-cdy-muted">
                  Estimated: {selectedTask.estimatedHours}h · Logged:{' '}
                  {selectedTask.loggedHours ?? 0}h
                </p>
              )}
              {selectedTask.milestone && (
                <p className="text-sm text-cdy-muted">
                  Milestone: {selectedTask.milestone.name}
                </p>
              )}
              {selectedTask.description && (
                <div>
                  <p className="mb-1 text-xs font-medium text-cdy-muted">
                    Description
                  </p>
                  <p className="text-sm text-cdy-white">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              <div className="rounded-md border border-cdy-navy-border p-3">
                <p className="mb-2 text-xs font-medium text-cdy-muted">
                  Update status
                </p>
                <select
                  value={newStatus || selectedTask.status}
                  onChange={(e) =>
                    setNewStatus(e.target.value as TaskStatus)
                  }
                  className="mb-2 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                >
                  {KANBAN_COLUMNS.map((s) => (
                    <option key={s} value={s}>
                      {COLUMN_LABELS[s]}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Note (optional)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="mb-2"
                />
                <Button
                  size="sm"
                  onClick={() => void handleUpdateStatus()}
                  disabled={updateStatus.isPending}
                >
                  Update Status
                </Button>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-cdy-muted">
                  Comments ({selectedTask.comments?.length ?? 0})
                </p>
                <div className="mb-3 space-y-3">
                  {selectedTask.comments?.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-md bg-cdy-navy-light p-3 text-sm"
                    >
                      <p className="font-medium text-cdy-white">
                        {comment.author
                          ? `${comment.author.firstName} ${comment.author.lastName}`
                          : 'User'}
                        :
                      </p>
                      <p className="text-cdy-muted">{comment.content}</p>
                      <p className="mt-1 text-xs text-cdy-muted">
                        {format(
                          parseISO(comment.createdAt),
                          'MMM d \'at\' h:mm a',
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => void handleAddComment()}
                    disabled={addComment.isPending}
                  >
                    Post
                  </Button>
                </div>
              </div>

              {selectedTask.requiresApproval &&
                selectedTask.status === TaskStatus.IN_REVIEW &&
                selectedTask.approvalStatus !== ApprovalStatus.PENDING_APPROVAL && (
                  <PermissionGate feature="projects.approvals" action="write">
                    {!approvalFormOpen ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setApprovalFormOpen(true)}
                      >
                        Request Approval
                      </Button>
                    ) : (
                      <div className="rounded-md border border-cdy-navy-border p-3 space-y-3">
                        <p className="text-xs font-medium text-cdy-muted">
                          Deliverable ready for approval?
                        </p>
                        <div>
                          <Label htmlFor="approvalTitle">Title *</Label>
                          <Input
                            id="approvalTitle"
                            value={approvalForm.title}
                            onChange={(e) =>
                              setApprovalForm((f) => ({
                                ...f,
                                title: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="approvalDesc">Description</Label>
                          <textarea
                            id="approvalDesc"
                            rows={2}
                            value={approvalForm.description}
                            onChange={(e) =>
                              setApprovalForm((f) => ({
                                ...f,
                                description: e.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="approvalUrl">File/Link URL</Label>
                          <Input
                            id="approvalUrl"
                            value={approvalForm.fileUrl}
                            onChange={(e) =>
                              setApprovalForm((f) => ({
                                ...f,
                                fileUrl: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setApprovalFormOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => void handleRequestApproval()}
                            disabled={requestApproval.isPending}
                          >
                            Request Approval
                          </Button>
                        </div>
                      </div>
                    )}
                  </PermissionGate>
                )}

              <PermissionGate feature="projects.time" action="write">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setTimeForm((f) => ({
                      ...f,
                      taskId: selectedTask.id,
                      employeeId: selectedTask.assigneeId ?? '',
                    }));
                    setLogTimeOpen(true);
                  }}
                >
                  Log time
                </Button>
              </PermissionGate>
            </div>
          </div>
        </>
      )}

      {addTaskOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setAddTaskOpen(false)}
            role="presentation"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-cdy-navy-border bg-cdy-navy shadow-xl">
            <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
              <h3 className="font-semibold text-cdy-white">Add Task</h3>
              <button
                type="button"
                onClick={() => setAddTaskOpen(false)}
                className="text-cdy-muted hover:text-cdy-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div>
                <Label htmlFor="taskTitle">Title *</Label>
                <Input
                  id="taskTitle"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="taskDesc">Description</Label>
                <textarea
                  id="taskDesc"
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                />
              </div>
              <div>
                <Label htmlFor="taskMilestone">Milestone</Label>
                <select
                  id="taskMilestone"
                  value={taskForm.milestoneId}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      milestoneId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                >
                  <option value="">None</option>
                  {milestones?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="taskAssignee">Assignee</Label>
                <select
                  id="taskAssignee"
                  value={taskForm.assigneeId}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      assigneeId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                >
                  <option value="">Unassigned</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taskPriority">Priority</Label>
                  <select
                    id="taskPriority"
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm((f) => ({
                        ...f,
                        priority: e.target.value as TaskPriority,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                  >
                    {Object.values(TaskPriority).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="taskDue">Due date</Label>
                  <Input
                    id="taskDue"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) =>
                      setTaskForm((f) => ({
                        ...f,
                        dueDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="taskHours">Estimated hours</Label>
                <Input
                  id="taskHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={taskForm.estimatedHours}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      estimatedHours: e.target.value,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-cdy-muted">
                <input
                  type="checkbox"
                  checked={taskForm.requiresApproval}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      requiresApproval: e.target.checked,
                    }))
                  }
                />
                Requires approval
              </label>
              <div>
                <Label htmlFor="taskParent">Sub-task of</Label>
                <select
                  id="taskParent"
                  value={taskForm.parentTaskId}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      parentTaskId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                >
                  <option value="">None</option>
                  {tasks?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-cdy-navy-border p-6">
              <Button variant="outline" onClick={() => setAddTaskOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreateTask()}
                disabled={createTask.isPending}
              >
                Add Task
              </Button>
            </div>
          </div>
        </>
      )}

      {logTimeOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={() => setLogTimeOpen(false)}
            role="presentation"
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy p-6 shadow-xl">
              <h3 className="mb-4 font-semibold text-cdy-white">Log Time</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="logDate">Date *</Label>
                  <Input
                    id="logDate"
                    type="date"
                    value={timeForm.date}
                    onChange={(e) =>
                      setTimeForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="logEmployee">Employee *</Label>
                  <select
                    id="logEmployee"
                    value={timeForm.employeeId}
                    onChange={(e) =>
                      setTimeForm((f) => ({
                        ...f,
                        employeeId: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                  >
                    <option value="">Select…</option>
                    {employees?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="logTask">Task</Label>
                  <select
                    id="logTask"
                    value={timeForm.taskId}
                    onChange={(e) =>
                      setTimeForm((f) => ({ ...f, taskId: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
                  >
                    <option value="">None</option>
                    {tasks?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="logHours">Hours *</Label>
                  <Input
                    id="logHours"
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
                  <Label htmlFor="logDesc">Description</Label>
                  <Input
                    id="logDesc"
                    value={timeForm.description}
                    onChange={(e) =>
                      setTimeForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-cdy-muted">
                  <input
                    type="checkbox"
                    checked={timeForm.isBillable}
                    onChange={(e) =>
                      setTimeForm((f) => ({
                        ...f,
                        isBillable: e.target.checked,
                      }))
                    }
                  />
                  Billable
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setLogTimeOpen(false)}
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

      <CompleteProjectModal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        projectName={project.name}
        projectCode={project.projectCode}
        currency={project.currency}
        incompleteTasks={incompleteTasks}
        uninvoicedMilestones={uninvoicedMilestones}
        onComplete={handleCompleteProject}
        isPending={completeProject.isPending}
      />

      <CsvImportModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImport={async (file) =>
          importTasksCsv.mutateAsync({ projectId, file })
        }
        isPending={importTasksCsv.isPending}
        onViewTasks={() => setActiveTab('tasks')}
      />
    </div>
  );
}
