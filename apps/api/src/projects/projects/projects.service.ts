import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityEventType,
  ApprovalStatus,
  InvoiceStatus,
  MemberRole,
  NotificationType,
  Prisma,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CacheService } from '../../cache/cache.service';
import { ProjectCodeService } from './project-code.service';
import { ProjectActivityService } from '../activity/project-activity.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFiltersDto } from './dto/project-filters.dto';
import { CompleteProjectDto } from './dto/complete-project.dto';
import { WorkloadFiltersDto } from '../approvals/approval.dto';

const LIMITED_ROLES = ['TEAM_MEMBER', 'SALES_AGENT'];

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectCodeService: ProjectCodeService,
    private readonly notificationsService: NotificationsService,
    private readonly projectActivityService: ProjectActivityService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateProjectDto, userId: string) {
    const projectCode = await this.projectCodeService.generate();

    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, deletedAt: null },
      });
      if (!client) throw new NotFoundException('Client not found in CRM');
    }

    const manager = await this.prisma.employee.findFirst({
      where: { id: dto.managerId, deletedAt: null },
    });
    if (!manager) {
      throw new NotFoundException('Project manager not found in HR records');
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          projectCode,
          name: dto.name,
          description: dto.description,
          clientId: dto.clientId,
          serviceType: dto.serviceType,
          status: ProjectStatus.ACTIVE,
          priority: dto.priority,
          managerId: dto.managerId,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          totalCost: dto.totalCost,
          currency: dto.currency ?? 'RWF',
          notes: dto.notes,
          createdBy: userId,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: p.id,
          employeeId: dto.managerId,
          role: MemberRole.MANAGER,
        },
      });

      if (dto.memberIds?.length) {
        const uniqueMembers = dto.memberIds.filter((id) => id !== dto.managerId);
        if (uniqueMembers.length > 0) {
          await tx.projectMember.createMany({
            data: uniqueMembers.map((employeeId) => ({
              projectId: p.id,
              employeeId,
              role: MemberRole.MEMBER,
            })),
            skipDuplicates: true,
          });
        }
      }

      return p;
    });

    // Auto-create DRAFT invoice if totalCost is set — fire-and-forget
    if (dto.totalCost && Number(dto.totalCost) > 0 && dto.clientId) {
      const snapshot = { ...project };
      const managerId = manager.userId;
      setImmediate(() => {
        void this.createProjectInvoice(
          snapshot,
          dto.clientId!,
          dto.serviceType,
          Number(dto.totalCost),
          dto.currency ?? 'RWF',
          projectCode,
          userId,
          managerId,
        );
      });
    }

    await this.notificationsService.createNotification({
      userId: manager.userId,
      type: NotificationType.SYSTEM,
      title: `New project assigned — ${project.name}`,
      body: `You have been assigned as project manager for ${project.name} (${projectCode}).`,
      link: `/projects/${project.id}`,
    });

    const created = await this.findProjectWithRelations(project.id);
    if (!created) throw new NotFoundException('Project not found after creation');

    this.projectActivityService.log({
      projectId: project.id,
      userId,
      type: ActivityEventType.PROJECT_CREATED,
      summary: `Project "${project.name}" created (${projectCode})`,
      metadata: { projectCode },
    });

    return this.serializeProject(created);
  }

  private async createProjectInvoice(
    project: { id: string; name: string },
    clientId: string,
    serviceType: string,
    totalCost: number,
    currency: string,
    projectCode: string,
    userId: string,
    managerUserId: string,
  ): Promise<void> {
    try {
      const invoiceNumber = await this.invoiceNumberService.generate();

      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          clientId,
          serviceType,
          lineItems: [
            {
              description: `${project.name} — Project delivery`,
              quantity: 1,
              unitPrice: totalCost,
              amount: totalCost,
            },
          ] as Prisma.InputJsonValue,
          subtotal: totalCost,
          taxRate: 0,
          taxAmount: 0,
          total: totalCost,
          currency,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.DRAFT,
          notes: `Auto-created for project ${projectCode}. Review and adjust before sending to client.`,
          createdBy: userId,
        },
      });

      await this.prisma.project.update({
        where: { id: project.id },
        data: { invoiceId: invoice.id },
      });

      await this.notificationsService.createForRole('FINANCE_MANAGER', {
        type: NotificationType.SYSTEM,
        title: `New project invoice ready — ${project.name}`,
        body: `Draft invoice ${invoiceNumber} created for ${currency} ${totalCost.toFixed(2)}. Review and send when ready.`,
        link: `/finance/invoices/${invoice.id}`,
      });

      if (managerUserId) {
        await this.notificationsService.createNotification({
          userId: managerUserId,
          type: NotificationType.SYSTEM,
          title: `Project created — ${project.name}`,
          body: `${projectCode} has been set up. Draft invoice ${invoiceNumber} created for ${currency} ${totalCost.toFixed(2)}.`,
          link: `/projects/${project.id}`,
        });
      }

      this.logger.log(
        `Draft invoice ${invoiceNumber} created for project ${projectCode}`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to create invoice for project ${project.id}`,
        String(err),
      );
    }
  }

  async findAll(
    filters: ProjectFiltersDto,
    requestingUser: { id: string; roleKey: string },
  ) {
    const isLimited = LIMITED_ROLES.includes(requestingUser.roleKey);

    let employeeId: string | null = null;
    if (isLimited) {
      const employee = await this.prisma.employee.findUnique({
        where: { userId: requestingUser.id },
        select: { id: true },
      });
      employeeId = employee?.id ?? null;
      if (!employeeId) return [];
    }

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(isLimited &&
        employeeId && {
          members: { some: { employeeId } },
        }),
      ...(filters.status && { status: filters.status }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.managerId && { managerId: filters.managerId }),
      ...(filters.serviceType && { serviceType: filters.serviceType }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { projectCode: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        members: { select: { employeeId: true, role: true } },
        milestones: {
          select: { id: true, status: true, name: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
      orderBy: [
        { status: 'asc' },
        { endDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return projects.map((p) => this.serializeProject(p));
  }

  async findMyProjects(userId: string) {
    return this.findAll({}, { id: userId, roleKey: 'TEAM_MEMBER' });
  }

  async findOne(id: string) {
    const project = await this.findProjectWithRelations(id);
    if (!project) throw new NotFoundException('Project not found');
    return this.serializeProject(project);
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const existing = await this.findProjectWithRelations(id);
    if (!existing) throw new NotFoundException('Project not found');

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.serviceType !== undefined && { serviceType: dto.serviceType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.totalCost !== undefined && { totalCost: dto.totalCost }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        members: { select: { employeeId: true, role: true } },
        milestones: {
          select: { id: true, status: true, name: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
    });

    if (dto.status && dto.status !== existing.status) {
      this.projectActivityService.log({
        projectId: id,
        userId,
        type: ActivityEventType.PROJECT_STATUS_CHANGED,
        summary: `Project status changed to ${dto.status}`,
        metadata: { from: existing.status, to: dto.status },
      });
    }

    return this.serializeProject(project);
  }

  async complete(id: string, dto: CompleteProjectDto, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null, parentTaskId: null },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        `Project is ${project.status} and cannot be completed`,
      );
    }

    const incompleteTasks = project.tasks.filter(
      (t) => t.status !== TaskStatus.DONE,
    );

    if (incompleteTasks.length > 0 && !dto.acknowledgeIncompleteTasks) {
      throw new BadRequestException(
        `${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's are' : ' is'} not yet complete. ` +
          'Set acknowledgeIncompleteTasks: true to complete the project anyway.',
      );
    }

    const completed = await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.COMPLETED,
        completedAt: new Date(),
        notes: dto.completionNotes
          ? `${project.notes ?? ''}\n[Completion notes] ${dto.completionNotes}`.trim()
          : project.notes,
      },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        members: { select: { employeeId: true, role: true } },
        milestones: {
          select: { id: true, status: true, name: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
    });

    this.projectActivityService.log({
      projectId: id,
      userId,
      type: ActivityEventType.PROJECT_STATUS_CHANGED,
      summary: 'Project marked as COMPLETED',
      metadata: { incompleteTasks: incompleteTasks.length },
    });

    await this.notificationsService.createForRole('CEO', {
      type: NotificationType.SYSTEM,
      title: `Project completed — ${project.name}`,
      body: `${project.projectCode} has been marked complete.`,
      link: `/projects/${id}`,
    });

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: NotificationType.SYSTEM,
      title: `Project completed — ${project.name}`,
      body: `${project.projectCode} has been marked complete. Review final billing and handover.`,
      link: `/projects/${id}`,
    });

    await this.cache.del('projects:summary');
    await this.cache.delByPrefix('projects:portfolio');

    return this.serializeProject(completed);
  }

  async onHold(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        `Project is ${project.status} and cannot be put on hold`,
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.ON_HOLD },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        members: { select: { employeeId: true, role: true } },
        milestones: {
          select: { id: true, status: true, name: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
    });

    this.projectActivityService.log({
      projectId: id,
      userId,
      type: ActivityEventType.PROJECT_STATUS_CHANGED,
      summary: 'Project placed on hold',
      metadata: { status: ProjectStatus.ON_HOLD },
    });

    await this.cache.del('projects:summary');
    await this.cache.delByPrefix('projects:portfolio');

    return this.serializeProject(updated);
  }

  async reactivate(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (
      project.status !== ProjectStatus.ON_HOLD &&
      project.status !== ProjectStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Project is ${project.status} and cannot be reactivated`,
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.ACTIVE,
        completedAt: null,
      },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        members: { select: { employeeId: true, role: true } },
        milestones: {
          select: { id: true, status: true, name: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
    });

    this.projectActivityService.log({
      projectId: id,
      userId,
      type: ActivityEventType.PROJECT_STATUS_CHANGED,
      summary: 'Project reactivated',
      metadata: { status: ProjectStatus.ACTIVE },
    });

    await this.cache.del('projects:summary');
    await this.cache.delByPrefix('projects:portfolio');

    return this.serializeProject(updated);
  }

  async generateHandoverReport(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        client: true,
        milestones: {
          include: {
            tasks: {
              where: { deletedAt: null },
              select: { title: true, status: true, completedAt: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        members: true,
        files: { orderBy: { uploadedAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        'Handover report can only be generated for completed projects',
      );
    }

    const approvals = await this.prisma.deliverableApproval.findMany({
      where: { projectId, status: ApprovalStatus.APPROVED },
      include: { task: { select: { title: true } } },
      orderBy: { reviewedAt: 'asc' },
    });

    const handover = {
      type: 'handover' as const,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      project: {
        code: project.projectCode,
        name: project.name,
        description: project.description,
        serviceType: project.serviceType,
        startDate: project.startDate.toISOString(),
        completedAt: project.completedAt?.toISOString() ?? null,
        totalDuration:
          project.completedAt && project.startDate
            ? Math.floor(
                (project.completedAt.getTime() - project.startDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null,
        totalCost: project.totalCost ? Number(project.totalCost) : null,
        currency: project.currency,
        invoiceId: project.invoiceId ?? null,
      },
      client: project.client
        ? {
            company: project.client.companyName,
            contact: project.client.contactName,
            email: project.client.email,
          }
        : null,
      deliverables: {
        milestones: project.milestones.map((m) => ({
          name: m.name,
          status: m.status,
          taskCount: m.tasks.length,
          tasksCompleted: m.tasks.filter((t) => t.status === TaskStatus.DONE)
            .length,
          tasks: m.tasks.map((t) => ({
            title: t.title,
            status: t.status,
            completedAt: t.completedAt?.toISOString() ?? null,
          })),
        })),
        approvedDeliverables: approvals.map((a) => ({
          title: a.title,
          task: a.task.title,
          approvedAt: a.reviewedAt?.toISOString() ?? null,
          fileUrl: a.fileUrl,
        })),
        files: project.files.map((f) => ({
          name: f.name,
          url: f.url,
          uploadedAt: f.uploadedAt.toISOString(),
        })),
      },
      notes: project.notes,
    };

    await this.prisma.projectReport.create({
      data: {
        projectId,
        type: 'handover',
        generatedBy: userId,
        data: handover,
      },
    });

    return handover;
  }

  async getHandoverReport(projectId: string) {
    await this.findOne(projectId);

    const report = await this.prisma.projectReport.findFirst({
      where: { projectId, type: 'handover' },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) {
      throw new NotFoundException(
        'No handover report found. Generate one first.',
      );
    }

    return report.data;
  }

  async archive(id: string, userId: string) {
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.ARCHIVED,
        archivedAt: new Date(),
      },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        members: { select: { employeeId: true, role: true } },
        milestones: {
          select: { id: true, status: true, name: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
    });

    this.projectActivityService.log({
      projectId: id,
      userId,
      type: ActivityEventType.PROJECT_STATUS_CHANGED,
      summary: 'Project archived',
      metadata: { status: ProjectStatus.ARCHIVED },
    });

    return this.serializeProject(project);
  }

  async addMembers(
    projectId: string,
    employeeIds: string[],
    userId: string,
  ) {
    await this.findOne(projectId);
    await this.prisma.projectMember.createMany({
      data: employeeIds.map((employeeId) => ({
        projectId,
        employeeId,
        role: MemberRole.MEMBER,
      })),
      skipDuplicates: true,
    });

    for (const employeeId of employeeIds) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true },
      });
      this.projectActivityService.log({
        projectId,
        userId,
        type: ActivityEventType.MEMBER_ADDED,
        summary: `Member added — ${employee ? `${employee.firstName} ${employee.lastName}` : employeeId}`,
        metadata: { employeeId },
      });
    }

    return this.findOne(projectId);
  }

  async removeMember(
    projectId: string,
    employeeId: string,
    userId: string,
  ) {
    await this.findOne(projectId);
    await this.prisma.projectMember.deleteMany({
      where: { projectId, employeeId },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true },
    });
    this.projectActivityService.log({
      projectId,
      userId,
      type: ActivityEventType.MEMBER_REMOVED,
      summary: `Member removed — ${employee ? `${employee.firstName} ${employee.lastName}` : employeeId}`,
      metadata: { employeeId },
    });

    return this.findOne(projectId);
  }

  async getProgress(projectId: string) {
    await this.findOne(projectId);

    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null, parentTaskId: null },
      select: { status: true },
    });

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const inProgress = tasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const blocked = tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
    const todo = tasks.filter((t) => t.status === TaskStatus.TODO).length;
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });

    return {
      totalTasks: total,
      done,
      inProgress,
      blocked,
      todo,
      progressPercent,
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        taskCount: m._count.tasks,
        dueDate: m.dueDate?.toISOString() ?? null,
      })),
    };
  }

  async getTeamWorkload(_filters: WorkloadFiltersDto) {
    const cacheKey = 'projects:workload';
    const cached = await this.cache.get<object>(cacheKey);
    if (cached) return cached;

    const tasks = await this.prisma.task.findMany({
      where: {
        project: { status: ProjectStatus.ACTIVE, deletedAt: null },
        status: { notIn: [TaskStatus.DONE] },
        deletedAt: null,
        assigneeId: { not: null },
      },
      select: {
        id: true,
        title: true,
        assigneeId: true,
        priority: true,
        dueDate: true,
        status: true,
        projectId: true,
        estimatedHours: true,
        project: { select: { name: true, projectCode: true } },
      },
    });

    const now = new Date();
    const byEmployee: Record<
      string,
      {
        employeeId: string;
        taskCount: number;
        overdueCount: number;
        urgentCount: number;
        estimatedHours: number;
        tasks: typeof tasks;
      }
    > = {};

    for (const task of tasks) {
      const empId = task.assigneeId!;
      if (!byEmployee[empId]) {
        byEmployee[empId] = {
          employeeId: empId,
          taskCount: 0,
          overdueCount: 0,
          urgentCount: 0,
          estimatedHours: 0,
          tasks: [],
        };
      }
      byEmployee[empId].taskCount++;
      byEmployee[empId].tasks.push(task);
      byEmployee[empId].estimatedHours += Number(task.estimatedHours ?? 0);
      if (task.dueDate && task.dueDate < now) {
        byEmployee[empId].overdueCount++;
      }
      if (task.priority === TaskPriority.URGENT) {
        byEmployee[empId].urgentCount++;
      }
    }

    const employeeIds = Object.keys(byEmployee);
    const employees =
      employeeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            include: { department: { select: { name: true } } },
          })
        : [];
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const sorted = Object.values(byEmployee)
      .sort((a, b) => b.taskCount - a.taskCount)
      .map((entry) => {
        const emp = empMap.get(entry.employeeId);
        const load =
          entry.taskCount > 6 || entry.overdueCount > 0
            ? 'HIGH'
            : entry.taskCount >= 4
              ? 'MEDIUM'
              : 'NORMAL';

        return {
          employeeId: entry.employeeId,
          employeeName: emp
            ? `${emp.firstName} ${emp.lastName}`
            : 'Unknown',
          departmentName: emp?.department?.name ?? null,
          taskCount: entry.taskCount,
          overdueCount: entry.overdueCount,
          urgentCount: entry.urgentCount,
          estimatedHours: Number(entry.estimatedHours.toFixed(2)),
          load,
          tasks: entry.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            projectId: t.projectId,
            projectName: t.project.name,
            projectCode: t.project.projectCode,
            priority: t.priority,
            dueDate: t.dueDate?.toISOString() ?? null,
            status: t.status,
            estimatedHours: t.estimatedHours
              ? Number(t.estimatedHours)
              : null,
          })),
        };
      });

    const workloadResult = {
      totalActiveTasks: tasks.length,
      assignedEmployees: sorted.length,
      overdueTasks: tasks.filter(
        (t) => t.dueDate && t.dueDate < now,
      ).length,
      blockedTasks: tasks.filter((t) => t.status === TaskStatus.BLOCKED)
        .length,
      workload: sorted,
    };

    await this.cache.set(cacheKey, workloadResult, 120);
    return workloadResult;
  }

  async generateStatusReport(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        client: { select: { companyName: true, contactName: true } },
        milestones: {
          include: {
            _count: { select: { tasks: true } },
            tasks: { where: { deletedAt: null }, select: { status: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const progress = await this.getProgress(projectId);

    const recentActivity = await this.prisma.projectActivity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        projectId,
        status: { notIn: [TaskStatus.DONE] },
        dueDate: {
          gte: new Date(),
          lte: addDays(new Date(), 14),
        },
        deletedAt: null,
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    const blockedTasks = await this.prisma.task.findMany({
      where: { projectId, status: TaskStatus.BLOCKED, deletedAt: null },
      select: { title: true, dueDate: true, description: true },
    });

    return {
      generatedAt: new Date().toISOString(),
      project: {
        code: project.projectCode,
        name: project.name,
        client: project.client?.companyName ?? null,
        status: project.status,
        startDate: project.startDate.toISOString(),
        endDate: project.endDate?.toISOString() ?? null,
        totalCost: project.totalCost ? Number(project.totalCost) : null,
        currency: project.currency,
      },
      progress: {
        overall: progress.progressPercent,
        taskBreakdown: {
          total: progress.totalTasks,
          done: progress.done,
          inProgress: progress.inProgress,
          blocked: progress.blocked,
          todo: progress.todo,
        },
      },
      milestones: project.milestones.map((m) => ({
        name: m.name,
        status: m.status,
        dueDate: m.dueDate?.toISOString() ?? null,
        tasksDone: m.tasks.filter((t) => t.status === TaskStatus.DONE).length,
        tasksTotal: m.tasks.length,
      })),
      invoice: project.invoiceId
        ? { invoiceId: project.invoiceId, totalCost: project.totalCost ? Number(project.totalCost) : null, currency: project.currency }
        : null,
      blockedItems: blockedTasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate?.toISOString() ?? null,
      })),
      upcomingDeadlines: upcomingTasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate?.toISOString() ?? null,
        priority: t.priority,
      })),
      recentActivity: recentActivity.map((a) => ({
        summary: a.summary,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  private async findProjectWithRelations(id: string) {
    return this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        members: { select: { employeeId: true, role: true } },
        milestones: {
          select: { id: true, status: true, name: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
    });
  }

  private serializeProject(
    project: Prisma.ProjectGetPayload<{
      include: {
        client: { select: { id: true; companyName: true; contactName: true } };
        members: { select: { employeeId: true; role: true } };
        milestones: { select: { id: true; status: true; name: true } };
        _count: { select: { tasks: true } };
      };
    }>,
  ) {
    return {
      id: project.id,
      projectCode: project.projectCode,
      name: project.name,
      description: project.description,
      clientId: project.clientId,
      client: project.client
        ? {
            companyName: project.client.companyName,
            contactName: project.client.contactName,
          }
        : null,
      serviceType: project.serviceType,
      status: project.status,
      priority: project.priority,
      managerId: project.managerId,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate?.toISOString() ?? null,
      totalCost: project.totalCost ? Number(project.totalCost) : null,
      currency: project.currency,
      invoiceId: project.invoiceId ?? null,
      completedAt: project.completedAt?.toISOString() ?? null,
      archivedAt: project.archivedAt?.toISOString() ?? null,
      notes: project.notes,
      createdBy: project.createdBy,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      members: project.members,
      milestones: project.milestones,
      _count: { tasks: project._count.tasks },
    };
  }
}
