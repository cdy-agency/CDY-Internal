import { Injectable, Logger } from '@nestjs/common';
import {
  ExpenseCategory,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  parse,
} from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { PlReportFiltersDto } from './dto/pl-report-filters.dto';
import { AgeingReportFiltersDto } from './dto/ageing-report-filters.dto';
import { ExpenseReportFiltersDto } from './dto/expense-report-filters.dto';

export interface PlPeriodData {
  totalRevenue: number;
  revenueByServiceType: { serviceType: string; amount: number }[];
  totalCOGS: number;
  cogsByCategory: { category: ExpenseCategory; amount: number }[];
  grossProfit: number;
  grossMargin: number;
  totalOpex: number;
  opexByCategory: { category: ExpenseCategory; amount: number }[];
  netProfit: number;
  netMargin: number;
}

export interface PlReportResult {
  period: { from: string; to: string };
  revenue: {
    total: number;
    byServiceType: { serviceType: string; amount: number }[];
  };
  costOfServices: {
    total: number;
    byCategory: { category: ExpenseCategory; amount: number }[];
  };
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    total: number;
    byCategory: { category: ExpenseCategory; amount: number }[];
  };
  netProfit: number;
  netMargin: number;
  previousPeriod: PlPeriodData;
}

interface AgeingInvoiceRow {
  id: string;
  invoiceNumber: string;
  clientId: string;
  total: number;
  remaining: number;
  dueDate: Date;
  daysOverdue: number;
  status: InvoiceStatus;
}

export interface AgeingBucket {
  count: number;
  total: number;
  invoices: AgeingInvoiceRow[];
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfitAndLoss(filters: PlReportFiltersDto): Promise<PlReportResult> {
    const from = filters.from
      ? new Date(filters.from)
      : startOfMonth(new Date());
    const to = filters.to ? new Date(filters.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const duration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - duration);
    const prevTo = new Date(from.getTime() - 1);
    prevTo.setHours(23, 59, 59, 999);

    const ventureId = filters.ventureId;

    let current: PlPeriodData;
    let previous: PlPeriodData;

    if (ventureId && ventureId !== 'all') {
      current = await this.computeVenturePlPeriod(from, to, ventureId);
      previous = await this.computeVenturePlPeriod(prevFrom, prevTo, ventureId);
    } else if (ventureId === 'all') {
      current = await this.computeCombinedPlPeriod(
        from,
        to,
        filters.serviceType,
      );
      previous = await this.computeCombinedPlPeriod(
        prevFrom,
        prevTo,
        filters.serviceType,
      );
    } else {
      current = await this.computePlPeriod(from, to, filters.serviceType);
      previous = await this.computePlPeriod(
        prevFrom,
        prevTo,
        filters.serviceType,
      );
    }

    this.logger.debug(
      `P&L report computed for ${from.toISOString()} – ${to.toISOString()}`,
    );

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      revenue: {
        total: current.totalRevenue,
        byServiceType: current.revenueByServiceType,
      },
      costOfServices: {
        total: current.totalCOGS,
        byCategory: current.cogsByCategory,
      },
      grossProfit: current.grossProfit,
      grossMargin: current.grossMargin,
      operatingExpenses: {
        total: current.totalOpex,
        byCategory: current.opexByCategory,
      },
      netProfit: current.netProfit,
      netMargin: current.netMargin,
      previousPeriod: previous,
    };
  }

  private async computePlPeriod(
    from: Date,
    to: Date,
    serviceType?: string,
  ): Promise<PlPeriodData> {
    const revenueWhere: Prisma.InvoiceWhereInput = {
      status: InvoiceStatus.PAID,
      paidAt: { gte: from, lte: to },
      deletedAt: null,
      ...(serviceType && serviceType !== 'all'
        ? { serviceType }
        : {}),
    };

    const [revenueRaw, cogsRaw, opexRaw] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['serviceType'],
        where: revenueWhere,
        _sum: { total: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: {
          projectId: { not: null },
          date: { gte: from, lte: to },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: {
          projectId: null,
          date: { gte: from, lte: to },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
    ]);

    const revenueByServiceType = revenueRaw.map((r) => ({
      serviceType: r.serviceType ?? 'general',
      amount: this.toNumber(r._sum?.total),
    }));
    const cogsByCategory = cogsRaw.map((r) => ({
      category: r.category,
      amount: this.toNumber(r._sum.amount),
    }));
    const opexByCategory = opexRaw.map((r) => ({
      category: r.category,
      amount: this.toNumber(r._sum.amount),
    }));

    const totalRevenue = revenueByServiceType.reduce((s, r) => s + r.amount, 0);
    const totalCOGS = cogsByCategory.reduce((s, r) => s + r.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin =
      totalRevenue > 0
        ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    const totalOpex = opexByCategory.reduce((s, r) => s + r.amount, 0);
    const netProfit = grossProfit - totalOpex;
    const netMargin =
      totalRevenue > 0
        ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return {
      totalRevenue,
      revenueByServiceType,
      totalCOGS,
      cogsByCategory,
      grossProfit,
      grossMargin,
      totalOpex,
      opexByCategory,
      netProfit,
      netMargin,
    };
  }

  private async computeVenturePlPeriod(
    from: Date,
    to: Date,
    ventureId: string,
  ): Promise<PlPeriodData> {
    const [invoiceRaw, expenseRows] = await Promise.all([
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
        select: { category: true, amount: true, ventureSharePercent: true },
      }),
    ]);

    const revenueByServiceType = invoiceRaw.map((r) => ({
      serviceType: r.serviceType ?? 'general',
      amount: this.toNumber(r._sum.total),
    }));

    const opexByCat = new Map<ExpenseCategory, number>();
    for (const e of expenseRows) {
      const raw = this.toNumber(e.amount);
      const sharePct = e.ventureSharePercent != null ? this.toNumber(e.ventureSharePercent) : 100;
      opexByCat.set(e.category, (opexByCat.get(e.category) ?? 0) + (raw * sharePct) / 100);
    }
    const opexByCategory = Array.from(opexByCat.entries()).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }));

    const totalRevenue = revenueByServiceType.reduce((s, r) => s + r.amount, 0);
    const totalOpex = opexByCategory.reduce((s, r) => s + r.amount, 0);
    const grossProfit = totalRevenue;
    const grossMargin =
      totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
    const netProfit = grossProfit - totalOpex;
    const netMargin =
      totalRevenue > 0
        ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return {
      totalRevenue,
      revenueByServiceType,
      totalCOGS: 0,
      cogsByCategory: [],
      grossProfit,
      grossMargin,
      totalOpex,
      opexByCategory,
      netProfit,
      netMargin,
    };
  }

  private async computeAllVenturesPlPeriod(
    from: Date,
    to: Date,
  ): Promise<PlPeriodData> {
    const [invoiceRaw, expenseRows] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['serviceType'],
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
        select: { category: true, amount: true, ventureSharePercent: true },
      }),
    ]);

    const revenueByServiceType = invoiceRaw.map((r) => ({
      serviceType: r.serviceType ?? 'general',
      amount: this.toNumber(r._sum.total),
    }));

    const opexByCat = new Map<ExpenseCategory, number>();
    for (const e of expenseRows) {
      const raw = this.toNumber(e.amount);
      const sharePct = e.ventureSharePercent != null ? this.toNumber(e.ventureSharePercent) : 100;
      opexByCat.set(e.category, (opexByCat.get(e.category) ?? 0) + (raw * sharePct) / 100);
    }
    const opexByCategory = Array.from(opexByCat.entries()).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }));

    const totalRevenue = revenueByServiceType.reduce((s, r) => s + r.amount, 0);
    const totalOpex = opexByCategory.reduce((s, r) => s + r.amount, 0);
    const grossProfit = totalRevenue;
    const grossMargin =
      totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
    const netProfit = grossProfit - totalOpex;
    const netMargin =
      totalRevenue > 0
        ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return {
      totalRevenue,
      revenueByServiceType,
      totalCOGS: 0,
      cogsByCategory: [],
      grossProfit,
      grossMargin,
      totalOpex,
      opexByCategory,
      netProfit,
      netMargin,
    };
  }

  private mergePlPeriods(a: PlPeriodData, b: PlPeriodData): PlPeriodData {
    const revenueMap = new Map<string, number>();
    for (const r of [...a.revenueByServiceType, ...b.revenueByServiceType]) {
      revenueMap.set(r.serviceType, (revenueMap.get(r.serviceType) ?? 0) + r.amount);
    }
    const revenueByServiceType = Array.from(revenueMap.entries()).map(
      ([serviceType, amount]) => ({ serviceType, amount }),
    );

    const cogsMap = new Map<ExpenseCategory, number>();
    for (const r of [...a.cogsByCategory, ...b.cogsByCategory]) {
      cogsMap.set(r.category, (cogsMap.get(r.category) ?? 0) + r.amount);
    }
    const cogsByCategory = Array.from(cogsMap.entries()).map(
      ([category, amount]) => ({ category, amount }),
    );

    const opexMap = new Map<ExpenseCategory, number>();
    for (const r of [...a.opexByCategory, ...b.opexByCategory]) {
      opexMap.set(r.category, (opexMap.get(r.category) ?? 0) + r.amount);
    }
    const opexByCategory = Array.from(opexMap.entries()).map(
      ([category, amount]) => ({ category, amount }),
    );

    const totalRevenue = revenueByServiceType.reduce((s, r) => s + r.amount, 0);
    const totalCOGS = cogsByCategory.reduce((s, r) => s + r.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin =
      totalRevenue > 0
        ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
        : 0;
    const totalOpex = opexByCategory.reduce((s, r) => s + r.amount, 0);
    const netProfit = grossProfit - totalOpex;
    const netMargin =
      totalRevenue > 0
        ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return {
      totalRevenue,
      revenueByServiceType,
      totalCOGS,
      cogsByCategory,
      grossProfit,
      grossMargin,
      totalOpex,
      opexByCategory,
      netProfit,
      netMargin,
    };
  }

  private async computeCombinedPlPeriod(
    from: Date,
    to: Date,
    serviceType?: string,
  ): Promise<PlPeriodData> {
    const [cdy, ventures] = await Promise.all([
      this.computePlPeriod(from, to, serviceType),
      this.computeAllVenturesPlPeriod(from, to),
    ]);
    return this.mergePlPeriods(cdy, ventures);
  }

  async getInvoiceAgeing(filters: AgeingReportFiltersDto) {
    const now = new Date();

    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: [
            InvoiceStatus.SENT,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE,
          ],
        },
        deletedAt: null,
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
      },
      include: {
        payments: {
          where: { deletedAt: null },
          select: { amount: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const invoicesWithBalance = unpaidInvoices.map((inv) => {
      const paid = inv.payments.reduce(
        (s, p) => s + this.toNumber(p.amount),
        0,
      );
      const remaining = this.toNumber(inv.total) - paid;
      const daysOverdue = Math.floor(
        (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { ...inv, remaining, daysOverdue };
    });

    const buckets = {
      current: invoicesWithBalance.filter((i) => i.daysOverdue <= 0),
      days1_30: invoicesWithBalance.filter(
        (i) => i.daysOverdue >= 1 && i.daysOverdue <= 30,
      ),
      days31_60: invoicesWithBalance.filter(
        (i) => i.daysOverdue >= 31 && i.daysOverdue <= 60,
      ),
      days61_90: invoicesWithBalance.filter(
        (i) => i.daysOverdue >= 61 && i.daysOverdue <= 90,
      ),
      days90plus: invoicesWithBalance.filter((i) => i.daysOverdue > 90),
    };

    const summariseBucket = (
      invoices: typeof invoicesWithBalance,
    ): AgeingBucket => ({
      count: invoices.length,
      total: Number(
        invoices.reduce((s, i) => s + i.remaining, 0).toFixed(2),
      ),
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        clientId: i.clientId,
        total: this.toNumber(i.total),
        remaining: i.remaining,
        dueDate: i.dueDate,
        daysOverdue: i.daysOverdue,
        status: i.status,
      })),
    });

    const totalOutstanding = invoicesWithBalance.reduce(
      (s, i) => s + i.remaining,
      0,
    );

    this.logger.debug(
      `Ageing report: ${invoicesWithBalance.length} invoices, outstanding ${totalOutstanding}`,
    );

    return {
      asOf: now.toISOString(),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      buckets: {
        current: summariseBucket(buckets.current),
        days1_30: summariseBucket(buckets.days1_30),
        days31_60: summariseBucket(buckets.days31_60),
        days61_90: summariseBucket(buckets.days61_90),
        days90plus: summariseBucket(buckets.days90plus),
      },
    };
  }

  async getExpenseSummary(filters: ExpenseReportFiltersDto) {
    const monthDate = filters.month
      ? parse(filters.month, 'yyyy-MM', new Date())
      : new Date();

    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);
    to.setHours(23, 59, 59, 999);

    const prevFrom = startOfMonth(subMonths(monthDate, 1));
    const prevTo = endOfMonth(subMonths(monthDate, 1));
    prevTo.setHours(23, 59, 59, 999);

    const categoryFilter = filters.category
      ? { category: filters.category }
      : {};

    const [currentRaw, prevRaw, expensesList, totalCurrentAgg, totalPrevAgg] =
      await Promise.all([
        this.prisma.expense.groupBy({
          by: ['category'],
          where: {
            date: { gte: from, lte: to },
            deletedAt: null,
            ...categoryFilter,
          },
          _sum: { amount: true },
          _count: { id: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
        this.prisma.expense.groupBy({
          by: ['category'],
          where: {
            date: { gte: prevFrom, lte: prevTo },
            deletedAt: null,
          },
          _sum: { amount: true },
        }),
        this.prisma.expense.findMany({
          where: {
            date: { gte: from, lte: to },
            deletedAt: null,
            ...categoryFilter,
          },
          orderBy: { date: 'desc' },
        }),
        this.prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: from, lte: to },
            deletedAt: null,
            ...categoryFilter,
          },
        }),
        this.prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: prevFrom, lte: prevTo },
            deletedAt: null,
          },
        }),
      ]);

    const prevByCategory = Object.fromEntries(
      prevRaw.map((r) => [r.category, this.toNumber(r._sum.amount)]),
    ) as Record<ExpenseCategory, number>;

    const totalCurrent = this.toNumber(totalCurrentAgg._sum.amount);
    const totalPrev = this.toNumber(totalPrevAgg._sum.amount);
    const momChange =
      totalPrev > 0
        ? Number((((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(2))
        : 0;

    this.logger.debug(`Expense summary for ${format(monthDate, 'yyyy-MM')}`);

    return {
      month: format(monthDate, 'MMMM yyyy'),
      monthKey: format(monthDate, 'yyyy-MM'),
      period: { from: from.toISOString(), to: to.toISOString() },
      totalAmount: Number(totalCurrent.toFixed(2)),
      previousMonthTotal: Number(totalPrev.toFixed(2)),
      momChangePercent: momChange,
      byCategory: currentRaw.map((r) => {
        const amount = this.toNumber(r._sum.amount);
        const previousAmount = prevByCategory[r.category] ?? 0;
        return {
          category: r.category,
          amount,
          count: r._count.id,
          previousAmount,
          changePercent:
            previousAmount > 0
              ? Number(
                  (((amount - previousAmount) / previousAmount) * 100).toFixed(
                    2,
                  ),
                )
              : amount > 0
                ? 100
                : 0,
        };
      }),
      expenses: expensesList.map((e) => ({
        id: e.id,
        vendorName: e.vendorName,
        category: e.category,
        amount: this.toNumber(e.amount),
        currency: e.currency,
        date: e.date.toISOString(),
        projectId: e.projectId,
        receiptUrl: e.receiptUrl,
      })),
    };
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }
}
