import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BillStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto, PayBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillFiltersDto } from './dto/bill-filters.dto';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateBillDto, userId: string, auditCtx: AuditContext) {
    const bill = await this.prisma.bill.create({
      data: {
        vendorName: dto.vendorName,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency ?? 'RWF',
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        createdBy: userId,
      },
    });
    const serialized = this.serialize(bill);
    this.auditService.log({
      ...auditCtx,
      action: 'bill.created',
      entityType: 'Bill',
      entityId: bill.id,
      newValue: serialized,
    });
    return serialized;
  }

  async findAll(filters: BillFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.BillWhereInput = { deletedAt: null };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.overdue) {
      where.status = BillStatus.UNPAID;
      where.dueDate = { lt: now };
    }

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.bill.count({ where }),
    ]);

    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [dueSoonBills, overdueBills] = await Promise.all([
      this.prisma.bill.findMany({
        where: {
          deletedAt: null,
          status: BillStatus.UNPAID,
          dueDate: { gte: now, lte: in3Days },
        },
      }),
      this.prisma.bill.findMany({
        where: {
          deletedAt: null,
          status: BillStatus.UNPAID,
          dueDate: { lt: now },
        },
      }),
    ]);

    const sumAmount = (items: { amount: Prisma.Decimal }[]): number =>
      items.reduce((s, b) => s + Number(b.amount), 0);

    return {
      data: bills.map((b) => this.serialize(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      alerts: {
        dueSoonCount: dueSoonBills.length,
        dueSoonTotal: sumAmount(dueSoonBills),
        overdueCount: overdueBills.length,
        overdueTotal: sumAmount(overdueBills),
      },
    };
  }

  async findOne(id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, deletedAt: null },
    });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    return this.serialize(bill);
  }

  async update(id: string, dto: UpdateBillDto) {
    await this.getOrThrow(id);
    const bill = await this.prisma.bill.update({
      where: { id },
      data: {
        ...(dto.vendorName !== undefined && { vendorName: dto.vendorName }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
    return this.serialize(bill);
  }

  async markAsPaid(id: string, dto: PayBillDto, auditCtx: AuditContext) {
    const bill = await this.getOrThrow(id);
    const before = this.serialize(bill);
    if (bill.status === BillStatus.PAID) {
      throw new BadRequestException('Bill is already paid');
    }

    const updated = await this.prisma.bill.update({
      where: { id },
      data: {
        status: BillStatus.PAID,
        paidAt: new Date(dto.paidAt),
        notes: dto.reference
          ? `${bill.notes ?? ''}\nPaid via ${dto.method}: ${dto.reference}`.trim()
          : bill.notes,
      },
    });

    const serialized = this.serialize(updated);
    this.auditService.log({
      ...auditCtx,
      action: 'bill.paid',
      entityType: 'Bill',
      entityId: id,
      previousValue: before,
      newValue: serialized,
    });

    return serialized;
  }

  async softDelete(id: string): Promise<{ message: string }> {
    const bill = await this.getOrThrow(id);
    if (bill.status === BillStatus.PAID) {
      throw new BadRequestException('Paid bills cannot be deleted');
    }
    await this.prisma.bill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Bill deleted' };
  }

  private async getOrThrow(id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, deletedAt: null },
    });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    return bill;
  }

  private serialize(bill: {
    id: string;
    vendorName: string;
    category: string;
    amount: Prisma.Decimal;
    currency: string;
    dueDate: Date;
    status: BillStatus;
    paidAt: Date | null;
    attachmentUrl: string | null;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const now = new Date();
    const daysUntilDue = Math.ceil(
      (bill.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      ...bill,
      amount: Number(bill.amount),
      daysUntilDue,
      isOverdue:
        bill.status === BillStatus.UNPAID && bill.dueDate < now,
      isDueSoon:
        bill.status === BillStatus.UNPAID &&
        daysUntilDue >= 0 &&
        daysUntilDue <= 3,
    };
  }
}
