import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
    const venture = await this.prisma.venture.findUnique({ where: { id } });
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

    const [totalIncome, totalExpenses, incomeByCategory, expenseByCategory] =
      await Promise.all([
        this.prisma.ventureIncome.aggregate({
          where: {
            ventureId,
            date: { gte: from, lte: to },
            deletedAt: null,
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.ventureExpense.aggregate({
          where: {
            ventureId,
            date: { gte: from, lte: to },
            deletedAt: null,
          },
          _sum: { ventureAmount: true },
          _count: { id: true },
        }),
        this.prisma.ventureIncome.groupBy({
          by: ['category'],
          where: {
            ventureId,
            date: { gte: from, lte: to },
            deletedAt: null,
          },
          _sum: { amount: true },
        }),
        this.prisma.ventureExpense.groupBy({
          by: ['category'],
          where: {
            ventureId,
            date: { gte: from, lte: to },
            deletedAt: null,
          },
          _sum: { ventureAmount: true },
        }),
      ]);

    const income = Number(totalIncome._sum.amount ?? 0);
    const expenses = Number(totalExpenses._sum.ventureAmount ?? 0);
    const netProfit = income - expenses;
    const margin =
      income > 0 ? Number(((netProfit / income) * 100).toFixed(2)) : 0;

    return {
      ventureId,
      period: { from, to },
      income: {
        total: Number(income.toFixed(2)),
        count: totalIncome._count.id,
        byCategory: incomeByCategory.map((r) => ({
          category: r.category,
          amount: Number(r._sum.amount ?? 0),
        })),
      },
      expenses: {
        total: Number(expenses.toFixed(2)),
        count: totalExpenses._count.id,
        byCategory: expenseByCategory.map((r) => ({
          category: r.category,
          amount: Number(r._sum.ventureAmount ?? 0),
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
      totalExpenses: summaries.reduce((s, v) => s + v.expenses.total, 0),
      totalNetProfit: summaries.reduce((s, v) => s + v.netProfit, 0),
    };

    return { period: { from, to }, totals, ventures: summaries };
  }

  async getMtdTotals(from: Date, to: Date) {
    const [activeCount, incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.venture.count({ where: { isActive: true } }),
      this.prisma.ventureIncome.aggregate({
        where: { date: { gte: from, lte: to }, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.ventureExpense.aggregate({
        where: { date: { gte: from, lte: to }, deletedAt: null },
        _sum: { ventureAmount: true },
      }),
    ]);

    return {
      count: activeCount,
      totalIncomeMTD: Number(incomeAgg._sum.amount ?? 0),
      totalExpensesMTD: Number(expenseAgg._sum.ventureAmount ?? 0),
    };
  }
}
