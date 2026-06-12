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
  MilestoneStatus,
  NotificationType,
  Prisma,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BudgetService } from '../../budget/budget.service';
import { CacheService } from '../../cache/cache.service';
import { ProjectCodeService } from './project-code.service';
import { ProjectActivityService } from '../activity/project-activity.service';
import { HourlyRateService } from '../hourly-rates/hourly-rate.service';
import { TimeService } from '../time/time.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFiltersDto } from './dto/project-filters.dto';
import { CompleteProjectDto } from './dto/complete-project.dto';
import { WorkloadFiltersDto } from '../approvals/approval.dto';

const LIMITED_ROLES = ['TEAM_MEMBER', 'SALES_AGENT'];

export interface ProjectProfitabilityResult {
  projectId: string;
  projectName: string;
  revenue: {
    invoiced: number;
    collected: number;
    outstanding: number;
  };
  costs: {
    labour: number;
    directExpenses: number;
    total: number;
  };
  time: {
    totalHours: number;
    billableHours: number;
    utilisation: number;
  };
  profitability: {
    grossProfit: number;
    grossMargin: number;
    isHealthy: boolean;
  };
  budget: {
    approved: number;
    consumed: number;
    remaining: number;
    percentConsumed: number | null;
    alertThresholdPct: number;
    isBlocked: boolean;
  } | null;
  milestones: Array<{
    id: string;
    name: string;
    billingAmount: number;
    status: MilestoneStatus;
    invoiceId: string | null;
    invoiceNumber: string | null;
  }>;
  milestoneBilling: {
    total: number;
    invoiced: number;
    percentInvoiced: number;
  };
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectCodeService: ProjectCodeService,
    private readonly budgetService: BudgetService,
    private readonly notificationsService: NotificationsService,
    private readonly projectActivityService: ProjectActivityService,
    private readonly hourlyRateService: HourlyRateService,
    private readonly cache: CacheService,
    private readonly timeService: TimeService,
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
          estimatedBudget: dto.estimatedBudget,
          currency: dto.currency ?? 'USD',
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

    if (dto.estimatedBudget && dto.clientId) {
      try {
        await this.budgetService.createBudget(
          {
            projectId: project.id,
            projectName: project.name,
            clientId: dto.clientId,
            approvedBudget: Number(dto.estimatedBudget),
            currency: dto.currency ?? 'USD',
          },
          userId,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Budget tracking not created for project ${project.id}: ${String(err)}`,
        );
      }
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
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) return [];

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
        ...(dto.estimatedBudget !== undefined && {
          estimatedBudget: dto.estimatedBudget,
        }),
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
        milestones: true,
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
    const uninvoicedMilestones = project.milestones.filter(
      (m) =>
        m.billingAmount &&
        Number(m.billingAmount) > 0 &&
        m.status !== MilestoneStatus.INVOICED,
    );

    if (incompleteTasks.length > 0 && !dto.acknowledgeIncompleteTasks) {
      throw new BadRequestException(
        `${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's are' : ' is'} not yet complete. ` +
          'Set acknowledgeIncompleteTasks: true to complete the project anyway.',
      );
    }

    if (uninvoicedMilestones.length > 0 && !dto.acknowledgeUninvoicedMilestones) {
      throw new BadRequestException(
        `${uninvoicedMilestones.length} milestone${uninvoicedMilestones.length > 1 ? 's have' : ' has'} ` +
          'not been invoiced. Set acknowledgeUninvoicedMilestones: true to complete anyway.',
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
          select: { id: true, status: true, name: true, billingAmount: true },
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
      metadata: {
        incompleteTasks: incompleteTasks.length,
        uninvoicedMilestones: uninvoicedMilestones.length,
      },
    });

    const totalInvoiced = project.milestones.reduce(
      (s, m) => s + Number(m.billingAmount ?? 0),
      0,
    );

    await this.notificationsService.createForRole('CEO', {
      type: NotificationType.SYSTEM,
      title: `Project completed — ${project.name}`,
      body: `${project.projectCode} has been marked complete. Total invoiced: $${totalInvoiced.toFixed(2)}.`,
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
    await this.cache.delByPrefix('projects:budget-actual');

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

    const profitability = await this.getProfitability(projectId);
    const timeEntries = await this.timeService.getProjectSummary(projectId);
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
          billingAmount: m.billingAmount ? Number(m.billingAmount) : null,
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
      financials: {
        totalBudget: Number(project.estimatedBudget ?? 0),
        totalInvoiced: profitability.revenue.invoiced,
        totalCollected: profitability.revenue.collected,
        totalCosts: profitability.costs.total,
        grossMargin: profitability.profitability.grossMargin,
      },
      teamSummary: {
        totalHours: timeEntries.totalHours,
        billableHours: timeEntries.billableHours,
        totalLabourCost: timeEntries.totalLabourCost,
        teamSize: project.members.length,
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
        billingAmount: m.billingAmount ? Number(m.billingAmount) : null,
      })),
    };
  }

  async getProfitability(projectId: string): Promise<ProjectProfitabilityResult> {
    const cacheKey = `projects:profitability:${projectId}`;
    const cached = await this.cache.get<ProjectProfitabilityResult>(cacheKey);
    if (cached) return cached;

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        milestones: {
          include: { invoice: { select: { id: true, invoiceNumber: true } } },
          orderBy: { order: 'asc' },
        },
        timeEntries: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const invoices = await this.prisma.invoice.findMany({
      where: {
        milestone: { projectId },
        status: { not: InvoiceStatus.DRAFT },
        deletedAt: null,
      },
      select: { total: true, status: true },
    });

    const invoicedRevenue = invoices.reduce(
      (s, i) => s + Number(i.total),
      0,
    );
    const collectedRevenue = invoices
      .filter((i) => i.status === InvoiceStatus.PAID)
      .reduce((s, i) => s + Number(i.total), 0);

    const employeeIds = [
      ...new Set(project.timeEntries.map((e) => e.employeeId)),
    ];
    const rates = await this.hourlyRateService.getTeamRates(employeeIds);

    const labourCost = project.timeEntries
      .filter((e) => e.isBillable)
      .reduce(
        (s, e) => s + Number(e.hours) * (rates[e.employeeId] ?? 0),
        0,
      );

    const totalHours = project.timeEntries.reduce(
      (s, e) => s + Number(e.hours),
      0,
    );
    const billableHours = project.timeEntries
      .filter((e) => e.isBillable)
      .reduce((s, e) => s + Number(e.hours), 0);

    const expenseAggregate = await this.prisma.expense.aggregate({
      where: { projectId, deletedAt: null },
      _sum: { amount: true },
    });
    const directExpenses = Number(expenseAggregate._sum.amount ?? 0);

    const totalCost = labourCost + directExpenses;
    const grossProfit = invoicedRevenue - totalCost;
    const grossMargin =
      invoicedRevenue > 0
        ? Number(((grossProfit / invoicedRevenue) * 100).toFixed(2))
        : 0;

    const budgetRecord = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    const budgetConsumed = totalCost;
    const budgetRemaining = budgetRecord
      ? Number(budgetRecord.approvedBudget) - budgetConsumed
      : null;
    const budgetPercent =
      budgetRecord && Number(budgetRecord.approvedBudget) > 0
        ? Number(
            (
              (budgetConsumed / Number(budgetRecord.approvedBudget)) *
              100
            ).toFixed(2),
          )
        : null;

    const totalMilestoneBilling = project.milestones.reduce(
      (s, m) => s + Number(m.billingAmount ?? 0),
      0,
    );
    const invoicedMilestoneAmount = project.milestones
      .filter((m) =>
        (
          [
            MilestoneStatus.APPROVED,
            MilestoneStatus.INVOICED,
          ] as MilestoneStatus[]
        ).includes(m.status),
      )
      .reduce((s, m) => s + Number(m.billingAmount ?? 0), 0);

    const result: ProjectProfitabilityResult = {
      projectId,
      projectName: project.name,
      revenue: {
        invoiced: Number(invoicedRevenue.toFixed(2)),
        collected: Number(collectedRevenue.toFixed(2)),
        outstanding: Number((invoicedRevenue - collectedRevenue).toFixed(2)),
      },
      costs: {
        labour: Number(labourCost.toFixed(2)),
        directExpenses: Number(directExpenses.toFixed(2)),
        total: Number(totalCost.toFixed(2)),
      },
      time: {
        totalHours: Number(totalHours.toFixed(2)),
        billableHours: Number(billableHours.toFixed(2)),
        utilisation:
          totalHours > 0
            ? Number(((billableHours / totalHours) * 100).toFixed(2))
            : 0,
      },
      profitability: {
        grossProfit: Number(grossProfit.toFixed(2)),
        grossMargin,
        isHealthy: grossMargin >= 40,
      },
      budget: budgetRecord
        ? {
            approved: Number(budgetRecord.approvedBudget),
            consumed: Number(budgetConsumed.toFixed(2)),
            remaining: Number(budgetRemaining?.toFixed(2) ?? 0),
            percentConsumed: budgetPercent,
            alertThresholdPct: budgetRecord.alertThresholdPct,
            isBlocked: budgetRecord.isBlocked,
          }
        : null,
      milestones: project.milestones.map((m) => ({
        id: m.id,
        name: m.name,
        billingAmount: m.billingAmount ? Number(m.billingAmount) : 0,
        status: m.status,
        invoiceId: m.invoice?.id ?? null,
        invoiceNumber: m.invoice?.invoiceNumber ?? null,
      })),
      milestoneBilling: {
        total: Number(totalMilestoneBilling.toFixed(2)),
        invoiced: Number(invoicedMilestoneAmount.toFixed(2)),
        percentInvoiced:
          totalMilestoneBilling > 0
            ? Number(
                ((invoicedMilestoneAmount / totalMilestoneBilling) * 100).toFixed(
                  2,
                ),
              )
            : 0,
      },
    };

    await this.cache.set(cacheKey, result, 120);
    return result;
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
    const profitability = await this.getProfitability(projectId);

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
        billingAmount: m.billingAmount ? Number(m.billingAmount) : null,
      })),
      financials: {
        invoicedRevenue: profitability.revenue.invoiced,
        collectedRevenue: profitability.revenue.collected,
        totalCosts: profitability.costs.total,
        grossMargin: profitability.profitability.grossMargin,
      },
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
      estimatedBudget: project.estimatedBudget
        ? Number(project.estimatedBudget)
        : null,
      currency: project.currency,
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
