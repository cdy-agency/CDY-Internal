import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';
import { CreateDirectIncomeDto } from './dto/create-direct-income.dto';
import { DirectIncomeFiltersDto } from './dto/direct-income-filters.dto';

@Injectable()
export class DirectIncomeService {
  private readonly logger = new Logger(DirectIncomeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDirectIncomeDto, userId: string, auditCtx: AuditContext) {
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, deletedAt: null },
      });
      if (!client) throw new BadRequestException('Client not found');
    }

    const record = await this.prisma.directIncome.create({
      data: {
        clientId: dto.clientId ?? null,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'RWF',
        paymentMethod: dto.paymentMethod,
        reference: dto.reference ?? null,
        category: dto.category ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
        notes: dto.notes ?? null,
        createdBy: userId,
      },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
      },
    });

    const serialized = this.serialize(record);
    this.auditService.log({
      ...auditCtx,
      action: 'direct_income.created',
      entityType: 'DirectIncome',
      entityId: record.id,
      newValue: serialized,
    });

    return serialized;
  }

  async findAll(filters: DirectIncomeFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.DirectIncomeWhereInput = { deletedAt: null };

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' };

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.directIncome.findMany({
        where,
        include: {
          client: { select: { id: true, companyName: true, contactName: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.directIncome.count({ where }),
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthAgg = await this.prisma.directIncome.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { deletedAt: null, date: { gte: monthStart } },
    });

    return {
      data: records.map((r) => this.serialize(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalThisMonth: Number(monthAgg._sum.amount ?? 0),
        countThisMonth: monthAgg._count,
      },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.directIncome.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
      },
    });
    if (!record) throw new NotFoundException('Direct income record not found');
    return this.serialize(record);
  }

  async softDelete(id: string, userId: string): Promise<{ message: string }> {
    const record = await this.prisma.directIncome.findFirst({
      where: { id, deletedAt: null },
    });
    if (!record) throw new NotFoundException('Direct income record not found');
    if (record.createdBy !== userId) {
      throw new BadRequestException('Only the creator can delete this record');
    }

    await this.prisma.directIncome.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Record deleted' };
  }

  async getMonthlySummary(year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const start = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const end = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

    const records = await this.prisma.directIncome.findMany({
      where: {
        deletedAt: null,
        date: { gte: start, lt: end },
      },
      select: { amount: true, date: true, category: true },
    });

    const monthly: Record<number, { total: number; count: number }> = {};
    for (let m = 1; m <= 12; m++) monthly[m] = { total: 0, count: 0 };

    for (const r of records) {
      const month = r.date.getMonth() + 1;
      monthly[month].total += Number(r.amount);
      monthly[month].count += 1;
    }

    return Object.entries(monthly).map(([month, data]) => ({
      month: Number(month),
      total: Number(data.total.toFixed(2)),
      count: data.count,
    }));
  }

  private serialize(
    record: Prisma.DirectIncomeGetPayload<{
      include: { client: { select: { id: true; companyName: true; contactName: true } } };
    }>,
  ) {
    return {
      id: record.id,
      clientId: record.clientId,
      clientName: record.client?.companyName ?? record.client?.contactName ?? null,
      description: record.description,
      amount: Number(record.amount),
      currency: record.currency,
      paymentMethod: record.paymentMethod,
      reference: record.reference,
      category: record.category,
      date: record.date.toISOString(),
      notes: record.notes,
      createdBy: record.createdBy,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
