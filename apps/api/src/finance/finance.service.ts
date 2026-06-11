import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceSummaryDto } from './dto/finance-summary.dto';
import { FinanceSummaryMetrics } from '@cdy/shared';

interface BalanceResult {
  total: Prisma.Decimal | null;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<FinanceSummaryDto> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      currentInvoiced,
      currentCollected,
      currentExpenses,
      previousInvoiced,
      previousCollected,
      previousExpenses,
      outstanding,
      overdue,
      previousOutstanding,
      previousOverdue,
      totalDraftInvoices,
      totalSentInvoices,
      totalBillsPending,
      totalBillsOverdue,
      paymentsReceivedToday,
      expensesThisWeek,
      previousBillsPending,
      previousBillsOverdue,
      previousPaymentsToday,
      previousExpensesWeek,
    ] = await Promise.all([
      this.sumInvoices(currentMonthStart, currentMonthEnd),
      this.sumPayments(currentMonthStart, currentMonthEnd),
      this.sumExpenses(currentMonthStart, currentMonthEnd),
      this.sumInvoices(lastMonthStart, lastMonthEnd),
      this.sumPayments(lastMonthStart, lastMonthEnd),
      this.sumExpenses(lastMonthStart, lastMonthEnd),
      this.sumOutstandingBalance(),
      this.sumOverdueBalance(),
      this.sumOutstandingBalance(lastMonthEnd),
      this.sumOverdueBalance(lastMonthEnd),
      this.countInvoicesByStatus('DRAFT'),
      this.countInvoicesByStatus('SENT'),
      this.sumBillsPending(),
      this.sumBillsOverdue(),
      this.sumPayments(todayStart, todayEnd),
      this.sumExpenses(weekStart, now),
      this.sumBillsPending(lastMonthEnd),
      this.sumBillsOverdue(lastMonthEnd),
      this.sumPayments(lastMonthStart, lastMonthEnd),
      this.sumExpenses(
        new Date(lastMonthEnd.getTime() - 7 * 24 * 60 * 60 * 1000),
        lastMonthEnd,
      ),
    ]);

    const currentMetrics: FinanceSummaryMetrics = {
      totalInvoiced: currentInvoiced,
      totalCollected: currentCollected,
      outstanding,
      overdue,
      totalExpenses: currentExpenses,
      netCashPosition: currentCollected - currentExpenses,
      totalBillsPending,
      totalBillsOverdue,
      paymentsReceivedToday,
      expensesThisWeek,
    };

    const previousMetrics: FinanceSummaryMetrics = {
      totalInvoiced: previousInvoiced,
      totalCollected: previousCollected,
      outstanding: previousOutstanding,
      overdue: previousOverdue,
      totalExpenses: previousExpenses,
      netCashPosition: previousCollected - previousExpenses,
      totalBillsPending: previousBillsPending,
      totalBillsOverdue: previousBillsOverdue,
      paymentsReceivedToday: previousPaymentsToday,
      expensesThisWeek: previousExpensesWeek,
    };

    this.logger.debug('Finance summary computed');

    return {
      ...currentMetrics,
      totalDraftInvoices,
      totalSentInvoices,
      previousMonth: previousMetrics,
    };
  }

  private async sumBillsPending(asOf?: Date): Promise<number> {
    const result = await this.prisma.bill.aggregate({
      _sum: { amount: true },
      where: {
        deletedAt: null,
        status: 'UNPAID',
        ...(asOf ? { createdAt: { lte: asOf } } : {}),
      },
    });
    return this.toNumber(result._sum.amount);
  }

  private async sumBillsOverdue(asOf?: Date): Promise<number> {
    const referenceDate = asOf ?? new Date();
    const result = await this.prisma.bill.aggregate({
      _sum: { amount: true },
      where: {
        deletedAt: null,
        status: 'UNPAID',
        dueDate: { lt: referenceDate },
        ...(asOf ? { createdAt: { lte: asOf } } : {}),
      },
    });
    return this.toNumber(result._sum.amount);
  }

  private async countInvoicesByStatus(
    status: 'DRAFT' | 'SENT',
  ): Promise<number> {
    return this.prisma.invoice.count({
      where: { deletedAt: null, status },
    });
  }

  private async sumInvoices(start: Date, end: Date): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      _sum: { total: true },
      where: {
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      },
    });
    return this.toNumber(result._sum.total);
  }

  private async sumPayments(start: Date, end: Date): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        deletedAt: null,
        paidAt: { gte: start, lte: end },
      },
    });
    return this.toNumber(result._sum.amount);
  }

  private async sumExpenses(start: Date, end: Date): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        deletedAt: null,
        date: { gte: start, lte: end },
      },
    });
    return this.toNumber(result._sum.amount);
  }

  private async sumOutstandingBalance(asOf?: Date): Promise<number> {
    const asOfClause = asOf
      ? Prisma.sql`AND i."createdAt" <= ${asOf}`
      : Prisma.empty;

    const result = await this.prisma.$queryRaw<BalanceResult[]>`
      SELECT COALESCE(SUM(
        i.total - COALESCE(
          (SELECT SUM(p.amount) FROM "Payment" p
           WHERE p."invoiceId" = i.id AND p."deletedAt" IS NULL),
          0
        )
      ), 0) AS total
      FROM "Invoice" i
      WHERE i."deletedAt" IS NULL
        AND i.status NOT IN ('PAID', 'WRITTEN_OFF', 'DRAFT')
        ${asOfClause}
    `;

    return this.toNumber(result[0]?.total ?? 0);
  }

  private async sumOverdueBalance(asOf?: Date): Promise<number> {
    const referenceDate = asOf ?? new Date();
    const asOfCreatedClause = asOf
      ? Prisma.sql`AND i."createdAt" <= ${asOf}`
      : Prisma.empty;

    const result = await this.prisma.$queryRaw<BalanceResult[]>`
      SELECT COALESCE(SUM(
        i.total - COALESCE(
          (SELECT SUM(p.amount) FROM "Payment" p
           WHERE p."invoiceId" = i.id
             AND p."deletedAt" IS NULL
             ${asOf ? Prisma.sql`AND p."paidAt" <= ${asOf}` : Prisma.empty}),
          0
        )
      ), 0) AS total
      FROM "Invoice" i
      WHERE i."deletedAt" IS NULL
        AND i.status NOT IN ('PAID', 'WRITTEN_OFF', 'DRAFT')
        AND (i.status = 'OVERDUE' OR i."dueDate" < ${referenceDate})
        ${asOfCreatedClause}
    `;

    return this.toNumber(result[0]?.total ?? 0);
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value);
  }
}
