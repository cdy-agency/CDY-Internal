import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrmAuditLogInput {
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: object;
  newValue?: object;
  ipAddress?: string;
}

@Injectable()
export class CrmAuditService {
  private readonly logger = new Logger(CrmAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(data: CrmAuditLogInput): void {
    void this.prisma.crmAuditLog
      .create({
        data: {
          userId: data.userId,
          userEmail: data.userEmail,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          previousValue: data.previousValue as Prisma.InputJsonValue | undefined,
          newValue: data.newValue as Prisma.InputJsonValue | undefined,
          ipAddress: data.ipAddress,
        },
      })
      .catch((err: unknown) => {
        this.logger.error('CRM audit log write failed', String(err));
      });
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.CrmAuditLogWhereInput = {};
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.userId) where.userId = filters.userId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.crmAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.crmAuditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findByEntity(entityId: string, limit = 50) {
    return this.prisma.crmAuditLog.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
