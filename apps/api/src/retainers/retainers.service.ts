import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, RetainerStatus } from '@prisma/client';
import {
  addDays,
  addMonths,
  endOfMonth,
  getDaysInMonth,
  setDate,
  startOfDay,
  subDays,
} from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';
import { CreateRetainerDto } from './dto/create-retainer.dto';
import { AmendRetainerDto } from './dto/amend-retainer.dto';
import { RetainerFiltersDto } from './dto/retainer-filters.dto';

@Injectable()
export class RetainersService {
  private readonly logger = new Logger(RetainersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  calculateNextBillingDate(billingDay: number, fromDate: Date): Date {
    const today = startOfDay(new Date());
    let candidate = setDate(startOfDay(fromDate), billingDay);

    if (candidate <= today) {
      candidate = setDate(addMonths(candidate, 1), billingDay);
    }

    const daysInMonth = getDaysInMonth(candidate);
    if (billingDay > daysInMonth) {
      candidate = endOfMonth(candidate);
    }

    return candidate;
  }

  async create(dto: CreateRetainerDto, userId: string, auditCtx: AuditContext) {
    const nextBillingDate = this.calculateNextBillingDate(
      dto.billingDayOfMonth,
      new Date(dto.startDate),
    );

    const retainer = await this.prisma.retainerContract.create({
      data: {
        clientId: dto.clientId,
        serviceName: dto.serviceName,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'RWF',
        billingDayOfMonth: dto.billingDayOfMonth,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        taxRateId: dto.taxRateId,
        nextBillingDate,
        createdBy: userId,
      },
      include: { taxRate: true },
    });

    this.auditService.log({
      ...auditCtx,
      action: 'retainer.created',
      entityType: 'RetainerContract',
      entityId: retainer.id,
      newValue: this.serializeRetainer(retainer),
    });

    return this.serializeRetainer(retainer);
  }

  async findAll(filters: RetainerFiltersDto) {
    const where: Prisma.RetainerContractWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.clientId) {
      where.clientId = { contains: filters.clientId, mode: 'insensitive' };
    }
    if (filters.search) {
      const term = filters.search;
      where.OR = [
        { serviceName: { contains: term, mode: 'insensitive' } },
        { client: { companyName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const retainers = await this.prisma.retainerContract.findMany({
      where,
      include: {
        taxRate: true,
        client: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return retainers.map((r) => ({
      ...this.serializeRetainer(r),
      clientName: r.client?.companyName ?? null,
    }));
  }

  async findOne(id: string) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id },
      include: { taxRate: true },
    });
    if (!retainer) throw new NotFoundException('Retainer not found');
    return this.serializeRetainer(retainer);
  }

  async findInvoices(id: string) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id },
    });
    if (!retainer) throw new NotFoundException('Retainer not found');

    const invoices = await this.prisma.invoice.findMany({
      where: { retainerContractId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      total: Number(inv.total),
      status: inv.status,
      sentAt: inv.sentAt?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  async pause(id: string, reason: string) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id },
    });
    if (!retainer) throw new NotFoundException();
    if (retainer.status !== RetainerStatus.ACTIVE) {
      throw new BadRequestException('Only active retainers can be paused');
    }

    const updated = await this.prisma.retainerContract.update({
      where: { id },
      data: {
        status: RetainerStatus.PAUSED,
        pausedAt: new Date(),
        pauseReason: reason,
      },
      include: { taxRate: true },
    });

    return this.serializeRetainer(updated);
  }

  async resume(id: string) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id },
    });
    if (!retainer) throw new NotFoundException();
    if (retainer.status !== RetainerStatus.PAUSED) {
      throw new BadRequestException('Only paused retainers can be resumed');
    }

    const nextBillingDate = this.calculateNextBillingDate(
      retainer.billingDayOfMonth,
      new Date(),
    );

    const updated = await this.prisma.retainerContract.update({
      where: { id },
      data: {
        status: RetainerStatus.ACTIVE,
        pausedAt: null,
        pauseReason: null,
        nextBillingDate,
      },
      include: { taxRate: true },
    });

    return this.serializeRetainer(updated);
  }

  async end(id: string, reason: string) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id },
    });
    if (!retainer) throw new NotFoundException();
    if (retainer.status === RetainerStatus.ENDED) {
      throw new BadRequestException('Retainer is already ended');
    }

    const updated = await this.prisma.retainerContract.update({
      where: { id },
      data: {
        status: RetainerStatus.ENDED,
        endedAt: new Date(),
        endReason: reason,
        endDate: new Date(),
      },
      include: { taxRate: true },
    });

    return this.serializeRetainer(updated);
  }

  async amend(
    id: string,
    dto: AmendRetainerDto,
    auditCtx: AuditContext,
  ) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id },
    });
    if (!retainer) throw new NotFoundException();
    if (retainer.status !== RetainerStatus.ACTIVE) {
      throw new BadRequestException('Only active retainers can be amended');
    }

    const previous = {
      amount: Number(retainer.amount),
      serviceName: retainer.serviceName,
    };

    const updated = await this.prisma.retainerContract.update({
      where: { id },
      data: {
        amount: dto.amount ?? retainer.amount,
        serviceName: dto.serviceName ?? retainer.serviceName,
        description: dto.description ?? retainer.description,
        taxRateId: dto.taxRateId ?? retainer.taxRateId,
      },
      include: { taxRate: true },
    });

    this.auditService.log({
      ...auditCtx,
      action: 'retainer.amended',
      entityType: 'RetainerContract',
      entityId: id,
      previousValue: previous,
      newValue: {
        amount: Number(updated.amount),
        serviceName: updated.serviceName,
      },
    });

    return this.serializeRetainer(updated);
  }

  async getMRRSummary() {
    const activeRetainers = await this.prisma.retainerContract.findMany({
      where: { status: RetainerStatus.ACTIVE },
      include: { taxRate: true },
    });

    const mrrByCurrency = activeRetainers.reduce<Record<string, number>>(
      (acc, r) => {
        const key = r.currency;
        acc[key] = (acc[key] ?? 0) + Number(r.amount);
        return acc;
      },
      {},
    );

    const totalMRR = activeRetainers.reduce(
      (s, r) => s + Number(r.amount),
      0,
    );

    const thirtyDaysFromNow = addDays(new Date(), 30);
    const upForRenewal = await this.prisma.retainerContract.findMany({
      where: {
        status: RetainerStatus.ACTIVE,
        endDate: { lte: thirtyDaysFromNow, not: null },
      },
      include: { taxRate: true },
    });

    const ninetyDaysAgo = subDays(new Date(), 90);
    const recentChurn = await this.prisma.retainerContract.findMany({
      where: {
        status: RetainerStatus.ENDED,
        endedAt: { gte: ninetyDaysAgo },
      },
      orderBy: { endedAt: 'desc' },
      include: { taxRate: true },
    });

    const pausedCount = await this.prisma.retainerContract.count({
      where: { status: RetainerStatus.PAUSED },
    });

    return {
      activeCount: activeRetainers.length,
      totalMRR: Number(totalMRR.toFixed(2)),
      totalARR: Number((totalMRR * 12).toFixed(2)),
      mrrByCurrency,
      upForRenewal: upForRenewal.map((r) => this.serializeRetainer(r)),
      recentChurn: recentChurn.map((r) => this.serializeRetainer(r)),
      pausedCount,
    };
  }

  private serializeRetainer(
    retainer: Prisma.RetainerContractGetPayload<{
      include: { taxRate: true };
    }>,
  ) {
    return {
      id: retainer.id,
      clientId: retainer.clientId,
      serviceName: retainer.serviceName,
      description: retainer.description,
      amount: Number(retainer.amount),
      currency: retainer.currency,
      billingDayOfMonth: retainer.billingDayOfMonth,
      startDate: retainer.startDate.toISOString(),
      endDate: retainer.endDate?.toISOString() ?? null,
      status: retainer.status,
      taxRateId: retainer.taxRateId,
      taxRate: retainer.taxRate
        ? {
            id: retainer.taxRate.id,
            name: retainer.taxRate.name,
            ratePercent: Number(retainer.taxRate.ratePercent),
          }
        : null,
      nextBillingDate: retainer.nextBillingDate.toISOString(),
      lastBilledAt: retainer.lastBilledAt?.toISOString() ?? null,
      pausedAt: retainer.pausedAt?.toISOString() ?? null,
      pauseReason: retainer.pauseReason,
      endedAt: retainer.endedAt?.toISOString() ?? null,
      endReason: retainer.endReason,
      createdBy: retainer.createdBy,
      createdAt: retainer.createdAt.toISOString(),
      updatedAt: retainer.updatedAt.toISOString(),
    };
  }
}
