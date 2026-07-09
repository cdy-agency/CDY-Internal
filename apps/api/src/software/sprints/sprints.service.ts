import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ItemStatus, SprintStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDevSprintDto,
  CreateSprintItemDto,
} from './dto/create-dev-sprint.dto';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(softwareProjectId: string) {
    return this.prisma.devSprint.findMany({
      where: { softwareProjectId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { startDate: 'asc' },
    });
  }

  async create(
    softwareProjectId: string,
    dto: CreateDevSprintDto,
    userId: string,
  ) {
    if (dto.status === SprintStatus.ACTIVE) {
      const active = await this.prisma.devSprint.findFirst({
        where: { softwareProjectId, status: SprintStatus.ACTIVE },
      });
      if (active) {
        throw new BadRequestException(
          'Another sprint is already active. Complete it before starting a new one.',
        );
      }
    }

    return this.prisma.devSprint.create({
      data: {
        softwareProjectId,
        name: dto.name,
        goal: dto.goal,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? SprintStatus.PLANNED,
        milestoneId: dto.milestoneId,
        createdBy: userId,
      },
      include: { items: true },
    });
  }

  async startSprint(sprintId: string) {
    const sprint = await this.prisma.devSprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    const active = await this.prisma.devSprint.findFirst({
      where: {
        softwareProjectId: sprint.softwareProjectId,
        status: SprintStatus.ACTIVE,
        id: { not: sprintId },
      },
    });
    if (active) {
      throw new BadRequestException(
        'Another sprint is already active on this project',
      );
    }

    return this.prisma.devSprint.update({
      where: { id: sprintId },
      data: { status: SprintStatus.ACTIVE },
    });
  }

  async completeSprint(sprintId: string) {
    const sprint = await this.prisma.devSprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    return this.prisma.devSprint.update({
      where: { id: sprintId },
      data: { status: SprintStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async addItem(sprintId: string, dto: CreateSprintItemDto) {
    const sprint = await this.prisma.devSprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    return this.prisma.sprintItem.create({
      data: {
        sprintId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        storyPoints: dto.storyPoints,
        status: ItemStatus.TODO,
      },
    });
  }

  async updateItemStatus(itemId: string, status: ItemStatus) {
    const item = await this.prisma.sprintItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Sprint item not found');

    return this.prisma.sprintItem.update({
      where: { id: itemId },
      data: {
        status,
        ...(status === ItemStatus.DONE && { completedAt: new Date() }),
      },
    });
  }

  async remove(sprintId: string): Promise<{ message: string }> {
    const sprint = await this.prisma.devSprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    if (sprint.status === SprintStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active sprint. Complete or skip it first.',
      );
    }

    await this.prisma.devSprint.delete({ where: { id: sprintId } });

    return { message: 'Sprint deleted' };
  }

  async removeItem(itemId: string): Promise<{ message: string }> {
    const item = await this.prisma.sprintItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Sprint item not found');

    await this.prisma.sprintItem.delete({ where: { id: itemId } });

    return { message: 'Sprint item deleted' };
  }

  async getSprintProgress(sprintId: string) {
    const items = await this.prisma.sprintItem.findMany({
      where: { sprintId },
    });
    const total = items.length;
    const done = items.filter((i) => i.status === ItemStatus.DONE).length;
    return {
      total,
      done,
      inProgress: items.filter((i) => i.status === ItemStatus.IN_PROGRESS)
        .length,
      blocked: items.filter((i) => i.status === ItemStatus.BLOCKED).length,
      todo: items.filter((i) => i.status === ItemStatus.TODO).length,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }
}
