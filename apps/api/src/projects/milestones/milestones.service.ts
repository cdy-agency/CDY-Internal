import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityEventType,
  InvoiceStatus,
  MilestoneStatus,
  NotificationType,
  Prisma,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CacheService } from '../../cache/cache.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';
import { ProjectActivityService } from '../activity/project-activity.service';
import {
  ApproveMilestoneDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
} from './dto/milestone.dto';

@Injectable()
export class MilestonesService {
  private readonly logger = new Logger(MilestonesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cache: CacheService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly projectActivityService: ProjectActivityService,
  ) {}

  async findByProject(projectId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: { status: true },
        },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    return milestones.map((m) => this.serializeMilestone(m));
  }

  async create(projectId: string, dto: CreateMilestoneDto, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        billingAmount: dto.billingAmount,
        currency: dto.currency ?? project.currency,
        order: dto.order ?? 0,
      },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    this.projectActivityService.log({
      projectId,
      userId,
      type: ActivityEventType.MILESTONE_CREATED,
      summary: `Milestone "${milestone.name}" created`,
      metadata: { milestoneId: milestone.id },
    });

    return this.serializeMilestone(milestone);
  }

  async update(projectId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    await this.ensureMilestone(projectId, milestoneId);

    const milestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.billingAmount !== undefined && {
          billingAmount: dto.billingAmount,
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    return this.serializeMilestone(milestone);
  }

  async complete(projectId: string, milestoneId: string, userId: string) {
    const milestone = await this.ensureMilestone(projectId, milestoneId);

    const incompleteTasks = await this.prisma.task.count({
      where: {
        milestoneId,
        deletedAt: null,
        status: { not: TaskStatus.DONE },
      },
    });

    if (incompleteTasks > 0) {
      throw new BadRequestException(
        'All tasks in the milestone must be completed first',
      );
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.COMPLETED },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    this.projectActivityService.log({
      projectId,
      userId,
      type: ActivityEventType.MILESTONE_COMPLETED,
      summary: `Milestone "${updated.name}" marked complete`,
      metadata: { milestoneId },
    });

    return this.serializeMilestone(updated);
  }

  async approve(
    projectId: string,
    milestoneId: string,
    dto: ApproveMilestoneDto,
    userId: string,
  ) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
      include: { project: { include: { client: true } } },
    });

    if (!milestone) throw new NotFoundException('Milestone not found');

    if (milestone.status !== MilestoneStatus.COMPLETED) {
      throw new BadRequestException(
        'Milestone must be marked Complete before it can be approved',
      );
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: userId,
      },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    if (milestone.billingAmount && Number(milestone.billingAmount) > 0) {
      const milestoneSnapshot = { ...milestone };
      const note = dto.note;

      setImmediate(() => {
        void this.triggerInvoiceCreation(
          milestoneId,
          milestoneSnapshot,
          userId,
          note,
        );
      });
    }

    this.projectActivityService.log({
      projectId,
      userId,
      type: ActivityEventType.MILESTONE_APPROVED,
      summary: `Milestone "${milestone.name}" approved for invoicing`,
      metadata: { milestoneId },
    });

    await this.cache.del(`projects:profitability:${projectId}`);
    await this.cache.delByPrefix('projects:portfolio');
    await this.cache.delByPrefix('projects:budget-actual');

    return this.serializeMilestone(updated);
  }

  private async triggerInvoiceCreation(
    milestoneId: string,
    milestone: Prisma.MilestoneGetPayload<{
      include: { project: { include: { client: true } } };
    }>,
    userId: string,
    note?: string,
  ): Promise<void> {
    try {
      if (!milestone.project.clientId) {
        this.logger.warn(
          `Cannot create invoice for milestone ${milestoneId}: no client linked`,
        );
        return;
      }

      const invoiceNumber = await this.invoiceNumberService.generate();
      const amount = Number(milestone.billingAmount);
      const lineItem = {
        description: `${milestone.name} — ${milestone.project.name}`,
        quantity: 1,
        unitPrice: amount,
        amount,
      };

      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          clientId: milestone.project.clientId,
          projectId: milestone.projectId,
          milestoneId: milestone.id,
          lineItems: [lineItem] as Prisma.InputJsonValue,
          subtotal: amount,
          taxRate: 0,
          taxAmount: 0,
          total: amount,
          currency: milestone.currency,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.DRAFT,
          serviceType: milestone.project.serviceType,
          notes: note,
          createdBy: userId,
        },
      });

      await this.prisma.milestone.update({
        where: { id: milestoneId },
        data: { status: MilestoneStatus.INVOICED },
      });

      await this.notificationsService.createForRole('FINANCE_MANAGER', {
        type: NotificationType.SYSTEM,
        title: 'Milestone approved — invoice ready',
        body: `${milestone.name} on project ${milestone.project.name} has been approved. Draft invoice ${invoiceNumber} created for $${amount}.`,
        link: `/finance/invoices/${invoice.id}`,
      });

      this.logger.log(
        `Invoice ${invoiceNumber} created for milestone ${milestoneId}`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Invoice creation failed for milestone ${milestoneId}`,
        String(err),
      );
    }
  }

  private async ensureMilestone(projectId: string, milestoneId: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');
    return milestone;
  }

  private serializeMilestone(
    milestone: Prisma.MilestoneGetPayload<{
      include: {
        _count: { select: { tasks: true } };
        tasks: { select: { status: true } };
        invoice: { select: { id: true; invoiceNumber: true } };
      };
    }>,
  ) {
    const doneTasks = milestone.tasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;

    return {
      id: milestone.id,
      projectId: milestone.projectId,
      name: milestone.name,
      description: milestone.description,
      dueDate: milestone.dueDate?.toISOString() ?? null,
      billingAmount: milestone.billingAmount
        ? Number(milestone.billingAmount)
        : null,
      currency: milestone.currency,
      status: milestone.status,
      approvedAt: milestone.approvedAt?.toISOString() ?? null,
      approvedBy: milestone.approvedBy,
      order: milestone.order,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
      taskCount: milestone._count.tasks,
      doneTaskCount: doneTasks,
      invoiceId: milestone.invoice?.id ?? null,
      invoiceNumber: milestone.invoice?.invoiceNumber ?? null,
    };
  }
}
