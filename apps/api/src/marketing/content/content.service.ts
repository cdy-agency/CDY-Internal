import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import {
  startOfMonth,
  endOfMonth,
  parse,
  format,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateContentItemDto, UpdateContentItemDto } from './dto/create-content-item.dto';
import { ContentFiltersDto } from './dto/content-filters.dto';

const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: [ContentStatus.READY, ContentStatus.CANCELLED],
  READY: [ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.DRAFT, ContentStatus.CANCELLED],
  APPROVED: [ContentStatus.PUBLISHED, ContentStatus.CANCELLED],
  REJECTED: [ContentStatus.DRAFT, ContentStatus.CANCELLED],
  PUBLISHED: [],
  CANCELLED: [],
};

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    marketingClientId: string,
    dto: CreateContentItemDto,
    userId: string,
  ) {
    const mc = await this.prisma.marketingClient.findUnique({
      where: { id: marketingClientId },
    });
    if (!mc) throw new NotFoundException('Marketing client not found');
    if (!mc.isActive)
      throw new BadRequestException('Marketing client is inactive');

    return this.prisma.contentItem.create({
      data: {
        marketingClientId,
        title: dto.title,
        description: dto.description,
        platform: dto.platform,
        contentType: dto.contentType,
        scheduledDate: new Date(dto.scheduledDate),
        fileUrl: dto.fileUrl,
        notes: dto.notes,
        status: ContentStatus.DRAFT,
        createdBy: userId,
      },
    });
  }

  async updateStatus(
    id: string,
    status: ContentStatus,
    userId: string,
  ) {
    const item = await this.prisma.contentItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        marketingClient: { include: { client: true } },
      },
    });
    if (!item) throw new NotFoundException('Content item not found');

    const allowed = ALLOWED_TRANSITIONS[item.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot move from ${item.status} to ${status}`,
      );
    }

    const updateData: {
      status: ContentStatus;
      approvedAt?: Date;
      approvedBy?: string;
      publishedAt?: Date;
    } = { status };

    if (status === ContentStatus.APPROVED) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
    }

    if (status === ContentStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    const updated = await this.prisma.contentItem.update({
      where: { id },
      data: updateData,
    });

    if (status === ContentStatus.APPROVED) {
      this.notificationsService.createForRoleAsync('OPERATIONS_MANAGER', {
        type: 'SYSTEM',
        title: `Content approved — ${item.title}`,
        body: `"${item.title}" for ${item.marketingClient.client?.companyName ?? 'client'} has been approved and is ready to publish.`,
        link: `/marketing/${item.marketingClientId}`,
      });
    }

    return updated;
  }

  async update(id: string, dto: UpdateContentItemDto) {
    const item = await this.prisma.contentItem.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Content item not found');

    return this.prisma.contentItem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.contentType !== undefined && { contentType: dto.contentType }),
        ...(dto.scheduledDate !== undefined && {
          scheduledDate: new Date(dto.scheduledDate),
        }),
        ...(dto.fileUrl !== undefined && { fileUrl: dto.fileUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async softDelete(id: string) {
    const item = await this.prisma.contentItem.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Content item not found');

    await this.prisma.contentItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Content item deleted' };
  }

  async findByClient(
    marketingClientId: string,
    filters: ContentFiltersDto,
  ) {
    const month = filters.month
      ? parse(filters.month, 'yyyy-MM', new Date())
      : new Date();

    const from = filters.month ? startOfMonth(month) : undefined;
    const to = filters.month ? endOfMonth(month) : undefined;

    return this.prisma.contentItem.findMany({
      where: {
        marketingClientId,
        deletedAt: null,
        ...(from && to ? { scheduledDate: { gte: from, lte: to } } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.platform ? { platform: filters.platform } : {}),
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async getCalendar(marketingClientId: string, month: string) {
    const monthDate = parse(month, 'yyyy-MM', new Date());
    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);

    const items = await this.prisma.contentItem.findMany({
      where: {
        marketingClientId,
        scheduledDate: { gte: from, lte: to },
        deletedAt: null,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const byDate: Record<string, typeof items> = {};
    for (const item of items) {
      const key = format(item.scheduledDate, 'yyyy-MM-dd');
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(item);
    }

    return { month, items, byDate };
  }
}
