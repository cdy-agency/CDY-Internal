import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityEventType,
  MilestoneStatus,
  Prisma,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CacheService } from '../../cache/cache.service';
import { ProjectActivityService } from '../activity/project-activity.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

@Injectable()
export class MilestonesService {
  private readonly logger = new Logger(MilestonesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cache: CacheService,
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
        order: dto.order ?? 0,
      },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
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
        ...(dto.order !== undefined && { order: dto.order }),
      },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
    });

    return this.serializeMilestone(milestone);
  }

  async remove(projectId: string, milestoneId: string, userId: string) {
    const milestone = await this.ensureMilestone(projectId, milestoneId);

    await this.prisma.milestone.delete({ where: { id: milestoneId } });

    this.projectActivityService.log({
      projectId,
      userId,
      type: ActivityEventType.MILESTONE_CREATED,
      summary: `Milestone "${milestone.name}" deleted`,
      metadata: { milestoneId },
    });
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
      status: milestone.status,
      order: milestone.order,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
      taskCount: milestone._count.tasks,
      doneTaskCount: doneTasks,
    };
  }
}
