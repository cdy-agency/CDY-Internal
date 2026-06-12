import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditFiltersDto } from './dto/audit-filters.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('finance.audit', 'read')
  @ApiOperation({ summary: 'List finance audit logs (CEO only)' })
  async findAll(@Query() filters: AuditFiltersDto) {
    const page = filters.page ?? 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const where: Prisma.FinanceAuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.financeAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.financeAuditLog.count({ where }),
    ]);

    return {
      data: {
        logs: logs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
      message: 'Audit logs retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':entityId')
  @RequirePermission('finance.audit', 'read')
  @ApiOperation({ summary: 'Audit logs for a specific entity' })
  async findByEntity(@Param('entityId') entityId: string) {
    const logs = await this.prisma.financeAuditLog.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      data: {
        logs: logs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
        total: logs.length,
        page: 1,
        totalPages: 1,
      },
      message: 'Entity audit logs retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
