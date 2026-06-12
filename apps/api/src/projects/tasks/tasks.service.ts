import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityEventType,
  NotificationType,
  Prisma,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import {
  addDays,
  endOfDay,
  isPast,
  isToday,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CacheService } from '../../cache/cache.service';
import { ProjectActivityService } from '../activity/project-activity.service';
import {
  CreateTaskCommentDto,
  CreateTaskDto,
  TaskFiltersDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
    private readonly projectActivityService: ProjectActivityService,
  ) {}

  async create(dto: CreateTaskDto, userId: string) {
    if (dto.parentTaskId) {
      const parent = await this.prisma.task.findUnique({
        where: { id: dto.parentTaskId },
      });
      if (!parent) throw new NotFoundException('Parent task not found');
      if (parent.parentTaskId) {
        throw new BadRequestException(
          'Sub-tasks cannot be nested more than one level deep',
        );
      }
    }

    const task = await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        milestoneId: dto.milestoneId,
        parentTaskId: dto.parentTaskId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours,
        requiresApproval: dto.requiresApproval ?? false,
        tags: dto.tags ?? [],
        createdBy: userId,
      },
      include: {
        milestone: { select: { name: true } },
        subTasks: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        _count: { select: { comments: true, timeEntries: true } },
      },
    });

    await this.prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        changedBy: userId,
      },
    });

    if (dto.assigneeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.assigneeId },
        select: { userId: true },
      });
      if (employee) {
        await this.notificationsService.createNotification({
          userId: employee.userId,
          type: NotificationType.SYSTEM,
          title: `Task assigned — ${task.title}`,
          body: `You have been assigned a new task on a project.`,
          link: `/projects/${task.projectId}?task=${task.id}`,
        });

        this.projectActivityService.log({
          projectId: dto.projectId,
          userId,
          type: ActivityEventType.TASK_ASSIGNED,
          summary: `Task "${task.title}" assigned`,
          metadata: { taskId: task.id, assigneeId: dto.assigneeId },
        });
      }
    }

    this.projectActivityService.log({
      projectId: dto.projectId,
      userId,
      type: ActivityEventType.TASK_CREATED,
      summary: `Task "${task.title}" created`,
      metadata: { taskId: task.id },
    });

    await this.cacheService.del(`projects:progress:${dto.projectId}`);
    await this.cacheService.del('projects:summary');
    await this.cacheService.del('projects:workload');
    return this.serializeTask(task);
  }

  async importFromCsv(
    projectId: string,
    csvBuffer: Buffer,
    userId: string,
  ): Promise<{ imported: number; errors: string[] }> {
    await this.prisma.project.findFirstOrThrow({
      where: { id: projectId, deletedAt: null },
    });

    const rows = csvBuffer.toString().split('\n').slice(1);
    const errors: string[] = [];
    let imported = 0;

    for (const [index, row] of rows.entries()) {
      if (!row.trim()) continue;

      const [
        title,
        description,
        milestoneName,
        assigneeEmail,
        priority,
        dueDate,
        estimatedHours,
      ] = row.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));

      if (!title) {
        errors.push(`Row ${index + 2}: Title is required`);
        continue;
      }

      try {
        let milestoneId: string | null = null;
        if (milestoneName) {
          const milestone = await this.prisma.milestone.findFirst({
            where: {
              projectId,
              name: { equals: milestoneName, mode: 'insensitive' },
            },
          });
          milestoneId = milestone?.id ?? null;
          if (!milestoneId) {
            errors.push(
              `Row ${index + 2}: Milestone "${milestoneName}" not found — task created without milestone`,
            );
          }
        }

        let assigneeId: string | null = null;
        if (assigneeEmail) {
          const employee = await this.prisma.employee.findUnique({
            where: { email: assigneeEmail },
          });
          assigneeId = employee?.id ?? null;
          if (!assigneeId) {
            errors.push(
              `Row ${index + 2}: Employee "${assigneeEmail}" not found — task created unassigned`,
            );
          }
        }

        const task = await this.prisma.task.create({
          data: {
            projectId,
            milestoneId,
            assigneeId,
            title,
            description: description || null,
            priority: Object.values(TaskPriority).includes(
              priority as TaskPriority,
            )
              ? (priority as TaskPriority)
              : TaskPriority.MEDIUM,
            dueDate: dueDate ? new Date(dueDate) : null,
            estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
            createdBy: userId,
            status: TaskStatus.TODO,
          },
        });

        await this.prisma.taskStatusHistory.create({
          data: {
            taskId: task.id,
            toStatus: TaskStatus.TODO,
            changedBy: userId,
          },
        });

        this.projectActivityService.log({
          projectId,
          userId,
          type: ActivityEventType.TASK_CREATED,
          summary: `Task "${task.title}" imported from CSV`,
          metadata: { taskId: task.id },
        });

        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${index + 2}: Failed to import — ${message}`);
      }
    }

    await this.cacheService.del(`projects:progress:${projectId}`);
    await this.cacheService.del('projects:summary');
    await this.cacheService.del('projects:workload');

    return { imported, errors };
  }

  async findByProject(
    projectId: string,
    filters: TaskFiltersDto,
    requestingUser: { id: string; roleKey: string },
  ) {
    const isLimited = requestingUser.roleKey === 'TEAM_MEMBER';
    let assigneeFilter: Prisma.TaskWhereInput = {};

    if (isLimited) {
      const employee = await this.prisma.employee.findUnique({
        where: { userId: requestingUser.id },
        select: { id: true },
      });
      assigneeFilter = employee ? { assigneeId: employee.id } : { id: 'none' };
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        parentTaskId: null,
        ...assigneeFilter,
        ...(filters.status && { status: filters.status }),
        ...(filters.assigneeId &&
          !isLimited && { assigneeId: filters.assigneeId }),
        ...(filters.milestoneId && { milestoneId: filters.milestoneId }),
        ...(filters.priority && { priority: filters.priority }),
      },
      include: {
        subTasks: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        _count: { select: { comments: true, timeEntries: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { order: 'asc' },
      ],
    });

    const employeeIds = [
      ...new Set(
        tasks
          .flatMap((t) => [t.assigneeId, ...t.subTasks.map((s) => s.assigneeId)])
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const employees =
      employeeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const nameMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]),
    );

    return tasks.map((t) => ({
      ...this.serializeTask(t),
      assigneeName: t.assigneeId
        ? (nameMap.get(t.assigneeId) ?? null)
        : null,
      subTasks: t.subTasks.map((s) => ({
        ...this.serializeTask(s),
        assigneeName: s.assigneeId
          ? (nameMap.get(s.assigneeId) ?? null)
          : null,
      })),
    }));
  }

  async findMyTasks(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) {
      return {
        overview: {
          overdue: 0,
          dueToday: 0,
          dueThisWeek: 0,
          totalOpen: 0,
        },
        groups: [],
      };
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: employee.id,
        deletedAt: null,
        status: { not: TaskStatus.DONE },
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });

    const now = new Date();
    const weekEnd = endOfDay(addDays(startOfWeek(now, { weekStartsOn: 1 }), 6));

    let overdue = 0;
    let dueToday = 0;
    let dueThisWeek = 0;

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const due = task.dueDate;
      if (isPast(due) && !isToday(due)) {
        overdue += 1;
      } else if (isToday(due)) {
        dueToday += 1;
      } else if (due <= weekEnd) {
        dueThisWeek += 1;
      }
    }

    const groupMap = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        projectCode: string;
        tasks: ReturnType<TasksService['serializeTask']>[];
      }
    >();

    for (const task of tasks) {
      const serialized = this.serializeTask(task);
      const existing = groupMap.get(task.projectId);
      if (existing) {
        existing.tasks.push(serialized);
      } else {
        groupMap.set(task.projectId, {
          projectId: task.project.id,
          projectName: task.project.name,
          projectCode: task.project.projectCode,
          tasks: [serialized],
        });
      }
    }

    return {
      overview: {
        overdue,
        dueToday,
        dueThisWeek,
        totalOpen: tasks.length,
      },
      groups: [...groupMap.values()],
    };
  }

  async findOne(projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      include: {
        subTasks: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 20 },
        _count: { select: { comments: true, timeEntries: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    let assigneeName: string | null = null;
    if (task.assigneeId) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: task.assigneeId },
        select: { firstName: true, lastName: true },
      });
      assigneeName = emp ? `${emp.firstName} ${emp.lastName}` : null;
    }

    const timeLogged = await this.prisma.timeEntry.aggregate({
      where: { taskId },
      _sum: { hours: true },
    });

    return {
      ...this.serializeTask(task),
      assigneeName,
      loggedHours: Number(timeLogged._sum.hours ?? 0),
      comments: task.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
      statusHistory: task.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: h.changedBy,
        note: h.note,
        changedAt: h.changedAt.toISOString(),
      })),
      subTasks: task.subTasks.map((s) => this.serializeTask(s)),
    };
  }

  async update(
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
    userId: string,
  ) {
    const existing = await this.findOne(projectId, taskId);

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.milestoneId !== undefined && { milestoneId: dto.milestoneId }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.estimatedHours !== undefined && {
          estimatedHours: dto.estimatedHours,
        }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
      include: {
        subTasks: { where: { deletedAt: null } },
        _count: { select: { comments: true, timeEntries: true } },
      },
    });

    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      this.projectActivityService.log({
        projectId,
        userId,
        type: ActivityEventType.TASK_ASSIGNED,
        summary: `Task "${task.title}" reassigned`,
        metadata: { taskId, assigneeId: dto.assigneeId },
      });
    }

    return this.serializeTask(task);
  }

  async updateStatus(
    projectId: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      include: { project: { select: { managerId: true, name: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const previousStatus = task.status;

    const [updated] = await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: dto.status,
          ...(dto.status === TaskStatus.DONE && { completedAt: new Date() }),
          ...(dto.status !== TaskStatus.DONE && { completedAt: null }),
        },
        include: {
          subTasks: { where: { deletedAt: null } },
          _count: { select: { comments: true, timeEntries: true } },
        },
      }),
      this.prisma.taskStatusHistory.create({
        data: {
          taskId,
          fromStatus: previousStatus,
          toStatus: dto.status,
          changedBy: userId,
          note: dto.note,
        },
      }),
    ]);

    if (dto.status === TaskStatus.BLOCKED) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: task.project.managerId },
        select: { userId: true },
      });
      if (manager) {
        await this.notificationsService.createNotification({
          userId: manager.userId,
          type: NotificationType.SYSTEM,
          title: `Task blocked — ${task.title}`,
          body: `A task on ${task.project.name} has been marked as blocked.${dto.note ? ` Note: ${dto.note}` : ''}`,
          link: `/projects/${projectId}?task=${taskId}`,
        });
      }
    }

    await this.cacheService.del(`projects:progress:${projectId}`);
    await this.cacheService.del('projects:summary');
    await this.cacheService.del('projects:workload');

    this.projectActivityService.log({
      projectId,
      userId,
      type: ActivityEventType.TASK_STATUS_CHANGED,
      summary: `Task "${task.title}" → ${dto.status}`,
      metadata: {
        taskId,
        fromStatus: previousStatus,
        toStatus: dto.status,
        note: dto.note ?? null,
      },
    });

    return this.serializeTask(updated);
  }

  async softDelete(projectId: string, taskId: string) {
    await this.findOne(projectId, taskId);
    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
  }

  async addComment(
    projectId: string,
    taskId: string,
    dto: CreateTaskCommentDto,
    userId: string,
  ) {
    await this.findOne(projectId, taskId);
    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        authorId: userId,
        content: dto.content,
      },
    });

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });

    this.projectActivityService.log({
      projectId,
      userId,
      type: ActivityEventType.TASK_COMMENTED,
      summary: `Comment added on task "${task?.title ?? taskId}"`,
      metadata: { taskId, commentId: comment.id },
    });

    return {
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  private serializeTask(
    task: Prisma.TaskGetPayload<{
      include: {
        subTasks?: true;
        _count?: { select: { comments: true; timeEntries: true } };
        milestone?: { select: { name: true } };
      };
    }> | Prisma.TaskGetPayload<object>,
  ) {
    const withCounts = task as Prisma.TaskGetPayload<{
      include: { _count: { select: { comments: true; timeEntries: true } } };
    }>;

    return {
      id: task.id,
      projectId: task.projectId,
      milestoneId: task.milestoneId,
      parentTaskId: task.parentTaskId,
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? null,
      estimatedHours: task.estimatedHours
        ? Number(task.estimatedHours)
        : null,
      completedAt: task.completedAt?.toISOString() ?? null,
      requiresApproval: task.requiresApproval,
      approvalStatus: task.approvalStatus,
      tags: task.tags,
      order: task.order,
      createdBy: task.createdBy,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      commentCount: withCounts._count?.comments ?? 0,
      timeEntryCount: withCounts._count?.timeEntries ?? 0,
    };
  }
}
