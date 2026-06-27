import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentureDto } from './dto/create-venture.dto';

export interface VentureCategorySummary {
  category: string;
  amount: number;
}

export interface VenturePeriodSummary {
  ventureId: string;
  period: { from: Date; to: Date };
  income: {
    total: number;
    count: number;
    byCategory: VentureCategorySummary[];
  };
  expenses: {
    total: number;
    ventureTotal: number;
    count: number;
    byCategory: VentureCategorySummary[];
  };
  netProfit: number;
  margin: number;
}

@Injectable()
export class VenturesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVentureDto, userId: string) {
    return this.prisma.venture.create({
      data: { ...dto, createdBy: userId },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.venture.findMany({
      where: { ...(!includeInactive && { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const venture = await this.prisma.venture.findUnique({
      where: { id },
      include: {
        clients: {
          where: { deletedAt: null },
          select: {
            id: true,
            companyName: true,
            contactName: true,
            clientType: true,
            email: true,
            primaryService: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!venture) {
      throw new NotFoundException('Venture not found');
    }
    return venture;
  }

  async update(id: string, dto: Partial<CreateVentureDto>) {
    await this.findOne(id);
    return this.prisma.venture.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.venture.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getSummary(
    ventureId: string,
    from: Date,
    to: Date,
  ): Promise<VenturePeriodSummary> {
    await this.findOne(ventureId);

    const [invoiceAgg, invoiceByCategory, expenseRows] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          ventureId,
          status: InvoiceStatus.PAID,
          paidAt: { gte: from, lte: to },
          deletedAt: null,
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['serviceType'],
        where: {
          ventureId,
          status: InvoiceStatus.PAID,
          paidAt: { gte: from, lte: to },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.prisma.expense.findMany({
        where: {
          ventureId,
          date: { gte: from, lte: to },
          deletedAt: null,
        },
        select: {
          amount: true,
          ventureSharePercent: true,
          category: true,
        },
      }),
    ]);

    const income = Number(invoiceAgg._sum.total ?? 0);
    const incomeCount = invoiceAgg._count.id;

    let expenseTotal = 0;
    let ventureExpenseTotal = 0;
    const expenseByCat: Record<string, number> = {};

    for (const e of expenseRows) {
      const raw = Number(e.amount);
      const sharePct = e.ventureSharePercent != null ? Number(e.ventureSharePercent) : 100;
      const ventureAmount = (raw * sharePct) / 100;
      expenseTotal += raw;
      ventureExpenseTotal += ventureAmount;
      const cat = String(e.category);
      expenseByCat[cat] = (expenseByCat[cat] ?? 0) + ventureAmount;
    }

    const netProfit = income - ventureExpenseTotal;
    const margin = income > 0 ? Number(((netProfit / income) * 100).toFixed(2)) : 0;

    return {
      ventureId,
      period: { from, to },
      income: {
        total: Number(income.toFixed(2)),
        count: incomeCount,
        byCategory: invoiceByCategory.map((r) => ({
          category: r.serviceType,
          amount: Number(r._sum.total ?? 0),
        })),
      },
      expenses: {
        total: Number(expenseTotal.toFixed(2)),
        ventureTotal: Number(ventureExpenseTotal.toFixed(2)),
        count: expenseRows.length,
        byCategory: Object.entries(expenseByCat).map(([category, amount]) => ({
          category,
          amount: Number(amount.toFixed(2)),
        })),
      },
      netProfit: Number(netProfit.toFixed(2)),
      margin,
    };
  }

  async getAllVenturesSummary(from: Date, to: Date) {
    const ventures = await this.prisma.venture.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const summaries = await Promise.all(
      ventures.map((v) =>
        this.getSummary(v.id, from, to).then((s) => ({
          venture: { id: v.id, name: v.name, color: v.color },
          ...s,
        })),
      ),
    );

    const totals = {
      totalIncome: summaries.reduce((s, v) => s + v.income.total, 0),
      totalExpenses: summaries.reduce((s, v) => s + v.expenses.ventureTotal, 0),
      totalNetProfit: summaries.reduce((s, v) => s + v.netProfit, 0),
    };

    return { period: { from, to }, totals, ventures: summaries };
  }

  async getMtdTotals(from: Date, to: Date) {
    const [activeCount, invoiceAgg, expenseRows] = await Promise.all([
      this.prisma.venture.count({ where: { isActive: true } }),
      this.prisma.invoice.aggregate({
        where: {
          ventureId: { not: null },
          status: InvoiceStatus.PAID,
          paidAt: { gte: from, lte: to },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.prisma.expense.findMany({
        where: {
          ventureId: { not: null },
          date: { gte: from, lte: to },
          deletedAt: null,
        },
        select: { amount: true, ventureSharePercent: true },
      }),
    ]);

    let totalExpensesMTD = 0;
    for (const e of expenseRows) {
      const raw = Number(e.amount);
      const sharePct = e.ventureSharePercent != null ? Number(e.ventureSharePercent) : 100;
      totalExpensesMTD += (raw * sharePct) / 100;
    }

    return {
      count: activeCount,
      totalIncomeMTD: Number(invoiceAgg._sum.total ?? 0),
      totalExpensesMTD: Number(totalExpensesMTD.toFixed(2)),
    };
  }
}
