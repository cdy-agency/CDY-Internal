import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: object;
  newValue?: object;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(data: AuditLogData): void {
    const payload = {
      userId: data.userId,
      userEmail: data.userEmail,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      previousValue: data.previousValue as Prisma.InputJsonValue | undefined,
      newValue: data.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    void this.prisma.financeAuditLog
      .create({ data: payload })
      .catch((err: unknown) => {
        this.logger.error('Audit log write failed', String(err));
      });
  }
}
