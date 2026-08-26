import { Injectable, Logger } from '@nestjs/common';
import {
  EmployeeStatus,
  InvoiceStatus,
  PaymentPlanStatus,
  Prisma,
  ReconciliationStatus,
  RetainerStatus,
} from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CashFlowService } from '../reports/cash-flow.service';
import { VenturesService } from '../ventures/ventures.service';
import { FinanceSummaryDto } from './dto/finance-summary.dto';
import { ReserveService } from './reserve/reserve.service';
import { FinanceSummaryMetrics } from '@cdy/shared';
import { DataCutoffService, laterOf } from '../settings/data-cutoff.service';

interface BalanceResult {
  total: Prisma.Decimal | null;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlowService: CashFlowService,
    private readonly venturesService: VenturesService,
    private readonly reserveService: ReserveService,
    private readonly dataCutoffService: DataCutoffService,
  ) {}

  private pctChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Number(((current - previous) / previous * 100).toFixed(1));
  }

  async getSummary(rangeStart?: Date, rangeEnd?: Date): Promise<FinanceSummaryDto> {
    const { enabled: excludeOldDataEnabled, cutoff } = await this.dataCutoffService.getState();
    if (cutoff) {
      rangeStart = rangeStart ? laterOf(rangeStart, cutoff) : undefined;
    }

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
      commissionsPending,
      commissionsPendingValue,
      activePaymentPlans,
      creditNotesIssuedMTD,
      creditNotesValueMTD,
      pendingReconciliations,
      totalMRR,
      activeRetainers,
      retainersUpForRenewal,
      taxOwed,
      blockedProjects,
      venturesMtd,
      totalClients,
      newClientsThisMonth,
      hrMetrics,
      monthlyRevenue,
      monthlyCollected,
      paidCount,
      overdueCount,
      partialCount,
      expensesByCategory,
      recentInvoices,
      topClients,
      pendingLeaveRequests,
      recentIncomeTransactions,
      recentExpenseTransactions,
    ] = await Promise.all([
      this.sumInvoices(currentMonthStart, currentMonthEnd, cutoff),
      this.sumPayments(currentMonthStart, currentMonthEnd, cutoff),
      this.sumExpenses(currentMonthStart, currentMonthEnd, cutoff),
      this.sumInvoices(lastMonthStart, lastMonthEnd, cutoff),
      this.sumPayments(lastMonthStart, lastMonthEnd, cutoff),
      this.sumExpenses(lastMonthStart, lastMonthEnd, cutoff),
      this.sumOutstandingBalance(undefined, cutoff),
      this.sumOverdueBalance(undefined, cutoff),
      this.sumOutstandingBalance(lastMonthEnd, cutoff),
      this.sumOverdueBalance(lastMonthEnd, cutoff),
      this.countInvoicesByStatus('DRAFT', cutoff),
      this.countInvoicesByStatus('SENT', cutoff),
      this.sumBillsPending(),
      this.sumBillsOverdue(),
      this.sumPayments(todayStart, todayEnd, cutoff),
      this.sumExpenses(weekStart, now, cutoff),
      this.sumBillsPending(lastMonthEnd),
      this.sumBillsOverdue(lastMonthEnd),
      this.sumPayments(lastMonthStart, lastMonthEnd, cutoff),
      this.sumExpenses(
        new Date(lastMonthEnd.getTime() - 7 * 24 * 60 * 60 * 1000),
        lastMonthEnd,
        cutoff,
      ),
      this.countPendingCommissions(cutoff),
      this.sumPendingCommissionValue(cutoff),
      this.countActivePaymentPlans(),
      this.countCreditNotesIssuedMTD(currentMonthStart, currentMonthEnd),
      this.sumCreditNotesValueMTD(currentMonthStart, currentMonthEnd),
      this.countPendingReconciliations(),
      this.sumActiveRetainerMRR(cutoff),
      this.countActiveRetainers(),
      this.countRetainersUpForRenewal(),
      this.computeCurrentMonthTaxOwed(currentMonthStart, currentMonthEnd, cutoff),
      this.countBlockedProjects(),
      this.venturesService.getMtdTotals(laterOf(currentMonthStart, cutoff), currentMonthEnd),
      this.prisma.client.count({ where: { deletedAt: null } }),
      this.prisma.client.count({
        where: { deletedAt: null, createdAt: { gte: currentMonthStart } },
      }),
      this.getHrPayrollMetrics(),
      this.getMonthlyRevenueSeries(now, 6, cutoff),
      this.getMonthlyCollectedSeries(now, 6, cutoff),
      this.countInvoicesByStatusExact('PAID', cutoff),
      this.countInvoicesByStatusExact('OVERDUE', cutoff),
      this.countInvoicesByStatusExact('PARTIALLY_PAID', cutoff),
      this.getExpensesByCategory(currentMonthStart, currentMonthEnd, cutoff),
      this.getRecentInvoices(5),
      this.getTopClientsByRevenue(5, cutoff),
      this.getPendingLeaveRequests(),
      this.getRecentIncomeTransactions(10),
      this.getRecentExpenses(10),
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

    const cashFlowAlert = await this.cashFlowService.hasShortfallIn30Days();
    const { totalActiveEmployees, totalMonthlyPayroll } = hrMetrics;
    const reserve = await this.reserveService.getMonthlySummary();

    // ── Chart data for Finance dashboard ──────────────────────────────────────
    const [
      rawIncomeByService,
      rawExpenseByCategory,
      rawPaymentByMethod,
    ] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['serviceType'],
        where: {
          status: InvoiceStatus.PAID,
          paidAt: { gte: laterOf(currentMonthStart, cutoff), lte: currentMonthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: {
          date: { gte: laterOf(currentMonthStart, cutoff), lte: currentMonthEnd },
          deletedAt: null,
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: {
          paidAt: { gte: laterOf(currentMonthStart, cutoff), lte: currentMonthEnd },
          deletedAt: null,
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const totalChartIncome = rawIncomeByService.reduce(
      (s, r) => s + this.toNumber(r._sum.total),
      0,
    );
    const totalChartExpenses = rawExpenseByCategory.reduce(
      (s, r) => s + this.toNumber(r._sum.amount),
      0,
    );
    const totalChartPayments = rawPaymentByMethod.reduce(
      (s, r) => s + this.toNumber(r._sum.amount),
      0,
    );

    const charts = {
      incomeByService: rawIncomeByService.map((r) => ({
        service: r.serviceType ?? 'unknown',
        label: serviceTypeLabel(r.serviceType ?? ''),
        amount: this.toNumber(r._sum.total),
        count: r._count.id,
        percentage:
          totalChartIncome > 0
            ? Number(((this.toNumber(r._sum.total) / totalChartIncome) * 100).toFixed(1))
            : 0,
      })),
      expenseByCategory: rawExpenseByCategory.map((r) => ({
        category: r.category as string,
        amount: this.toNumber(r._sum.amount),
        count: r._count.id,
        percentage:
          totalChartExpenses > 0
            ? Number(((this.toNumber(r._sum.amount) / totalChartExpenses) * 100).toFixed(1))
            : 0,
      })),
      paymentByMethod: rawPaymentByMethod.map((r) => ({
        method: r.method as string,
        label: paymentMethodLabel(r.method as string),
        amount: this.toNumber(r._sum.amount),
        count: r._count.id,
        percentage:
          totalChartPayments > 0
            ? Number(((this.toNumber(r._sum.amount) / totalChartPayments) * 100).toFixed(1))
            : 0,
      })),
      paymentMethodSummary: ALL_PAYMENT_METHODS.map((method) => {
        const inc = rawPaymentByMethod.find((r) => r.method === method);
        const incAmt = this.toNumber(inc?._sum.amount ?? null);
        return {
          method,
          label: paymentMethodLabel(method),
          color: PAYMENT_METHOD_COLORS[method] ?? '#94A3B8',
          income:   { amount: incAmt, count: inc?._count.id ?? 0 },
          expenses: { amount: 0, count: 0 },
          net: incAmt,
        };
      }).filter((m) => m.income.amount > 0 || m.expenses.amount > 0),
      totals: {
        income: totalChartIncome,
        expenses: totalChartExpenses,
        payments: totalChartPayments,
      },
    };

    // ── New finance-improvement fields ────────────────────────────────────────
    const [directIncomeMTDAgg, recentDueBillsList, ...monthlyCompRows] =
      await Promise.all([
        this.prisma.directIncome.aggregate({
          _sum: { amount: true },
          where: { deletedAt: null, date: { gte: laterOf(currentMonthStart, cutoff), lte: currentMonthEnd } },
        }),
        this.prisma.bill.findMany({
          where: {
            deletedAt: null,
            status: 'UNPAID',
            dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
          select: { id: true, vendorName: true, amount: true, currency: true, dueDate: true },
        }),
        ...Array.from({ length: 6 }, (_, i) => {
          const s = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          const e = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 0, 23, 59, 59, 999);
          return Promise.all([
            this.sumPayments(s, e, cutoff),
            this.prisma.directIncome.aggregate({
              _sum: { amount: true },
              where: { deletedAt: null, date: { gte: laterOf(s, cutoff), lte: e } },
            }).then((r) => this.toNumber(r._sum.amount)),
            this.sumExpenses(s, e, cutoff),
            s,
          ] as const);
        }),
      ]);

    const directIncomeMTD = this.toNumber(directIncomeMTDAgg._sum.amount);
    const totalIncome = currentCollected + directIncomeMTD;
    const difference = totalIncome - currentExpenses;

    const recentDueBills = recentDueBillsList.map((b) => ({
      id: b.id,
      vendorName: b.vendorName,
      amount: Number(b.amount),
      currency: b.currency,
      dueDate: b.dueDate.toISOString(),
      daysUntilDue: Math.ceil((b.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const monthlyComparison = (monthlyCompRows as [number, number, number, Date][]).map(
      ([invoiceIncome, directInc, expenses, monthStart]) => ({
        month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        income: Number((invoiceIncome + directInc).toFixed(2)),
        expenses: Number(expenses.toFixed(2)),
        net: Number((invoiceIncome + directInc - expenses).toFixed(2)),
      }),
    );

    // ── Date-range filtered totals (optional) ────────────────────────────────
    let rangeIncome: number | undefined;
    let rangeExpenses: number | undefined;
    let rangeBalance: number | undefined;

    if (rangeStart && rangeEnd) {
      const [rangePayments, rangeDirectIncomeAgg, rangeExp] = await Promise.all([
        this.sumPayments(rangeStart, rangeEnd),
        this.prisma.directIncome.aggregate({
          _sum: { amount: true },
          where: { deletedAt: null, date: { gte: rangeStart, lte: rangeEnd } },
        }),
        this.sumExpenses(rangeStart, rangeEnd),
      ]);
      const rangeDirectInc = this.toNumber(rangeDirectIncomeAgg._sum.amount);
      rangeIncome = Number((rangePayments + rangeDirectInc).toFixed(2));
      rangeExpenses = Number(rangeExp.toFixed(2));
      rangeBalance = Number((rangeIncome - rangeExpenses).toFixed(2));
    }

    this.logger.debug('Finance summary computed');

    return {
      ...currentMetrics,
      totalDraftInvoices,
      totalSentInvoices,
      commissionsPending,
      commissionsPendingValue,
      activePaymentPlans,
      creditNotesIssuedMTD,
      creditNotesValueMTD,
      pendingReconciliations,
      totalMRR,
      activeRetainers,
      retainersUpForRenewal,
      taxOwed,
      blockedProjects,
      totalClients,
      newClientsThisMonth,
      cashFlowAlert,
      ventures: venturesMtd,
      totalActiveEmployees,
      totalMonthlyPayroll,
      previousMonth: previousMetrics,
      revenueTrend: this.pctChange(currentInvoiced, previousInvoiced),
      collectionTrend: this.pctChange(currentCollected, previousCollected),
      outstandingTrend: this.pctChange(outstanding, previousOutstanding),
      collectionRate: currentInvoiced > 0
        ? Number(((currentCollected / currentInvoiced) * 100).toFixed(1))
        : 0,
      monthlyRevenue,
      monthlyCollected,
      paidCount,
      overdueCount,
      partialCount,
      expensesByCategory,
      recentInvoices,
      topClients,
      pendingLeaveRequests,
      reserve,
      charts,
      directIncomeMTD,
      totalIncome,
      difference,
      rangeIncome,
      rangeExpenses,
      rangeBalance,
      recentDueBills,
      monthlyComparison,
      recentIncomeTransactions,
      recentExpenseTransactions,
      meta: {
        excludeOldDataEnabled,
        excludeOldDataCutoff: cutoff ? cutoff.toISOString() : null,
      },
    };
  }

  private currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async countPendingCommissions(cutoff?: Date | null): Promise<number> {
    return this.prisma.commissionRecord.count({
      where: {
        month: this.currentMonthKey(),
        status: 'PENDING',
        createdAt: { gte: cutoff ?? undefined },
      },
    });
  }

  private async sumPendingCommissionValue(cutoff?: Date | null): Promise<number> {
    const result = await this.prisma.commissionRecord.aggregate({
      _sum: { calculatedAmount: true },
      where: {
        month: this.currentMonthKey(),
        status: 'PENDING',
        createdAt: { gte: cutoff ?? undefined },
      },
    });
    return this.toNumber(result._sum.calculatedAmount);
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
    cutoff?: Date | null,
  ): Promise<number> {
    return this.prisma.invoice.count({
      where: { deletedAt: null, status, createdAt: { gte: cutoff ?? undefined } },
    });
  }

  private async sumInvoices(start: Date, end: Date, cutoff?: Date | null): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      _sum: { total: true },
      where: {
        deletedAt: null,
        createdAt: { gte: laterOf(start, cutoff), lte: end },
      },
    });
    return this.toNumber(result._sum.total);
  }

  private async sumPayments(start: Date, end: Date, cutoff?: Date | null): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        deletedAt: null,
        paidAt: { gte: laterOf(start, cutoff), lte: end },
      },
    });
    return this.toNumber(result._sum.amount);
  }

  private async sumExpenses(start: Date, end: Date, cutoff?: Date | null): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        deletedAt: null,
        date: { gte: laterOf(start, cutoff), lte: end },
      },
    });
    return this.toNumber(result._sum.amount);
  }

  private async sumOutstandingBalance(asOf?: Date, cutoff?: Date | null): Promise<number> {
    const asOfClause = asOf
      ? Prisma.sql`AND i."createdAt" <= ${asOf}`
      : Prisma.empty;
    const cutoffClause = cutoff
      ? Prisma.sql`AND i."createdAt" >= ${cutoff}`
      : Prisma.empty;

    const result = await this.prisma.$queryRaw<BalanceResult[]>`
      SELECT COALESCE(SUM(
        GREATEST(
          i.total
            - COALESCE(
                (SELECT SUM(p.amount) FROM "Payment" p
                 WHERE p."invoiceId" = i.id AND p."deletedAt" IS NULL),
                0
              )
            - COALESCE(
                (SELECT SUM(cn.amount) FROM "CreditNote" cn
                 WHERE cn."invoiceId" = i.id
                   AND cn."deletedAt" IS NULL
                   AND cn.status <> 'VOID'),
                0
              ),
          0
        )
      ), 0) AS total
      FROM "Invoice" i
      WHERE i."deletedAt" IS NULL
        AND i.status NOT IN ('PAID', 'WRITTEN_OFF', 'DRAFT')
        ${asOfClause}
        ${cutoffClause}
    `;

    return this.toNumber(result[0]?.total ?? 0);
  }

  private async sumOverdueBalance(asOf?: Date, cutoff?: Date | null): Promise<number> {
    const referenceDate = asOf ?? new Date();
    const asOfCreatedClause = asOf
      ? Prisma.sql`AND i."createdAt" <= ${asOf}`
      : Prisma.empty;
    const cutoffClause = cutoff
      ? Prisma.sql`AND i."createdAt" >= ${cutoff}`
      : Prisma.empty;

    const result = await this.prisma.$queryRaw<BalanceResult[]>`
      SELECT COALESCE(SUM(
        GREATEST(
          i.total
            - COALESCE(
                (SELECT SUM(p.amount) FROM "Payment" p
                 WHERE p."invoiceId" = i.id
                   AND p."deletedAt" IS NULL
                   ${asOf ? Prisma.sql`AND p."paidAt" <= ${asOf}` : Prisma.empty}),
                0
              )
            - COALESCE(
                (SELECT SUM(cn.amount) FROM "CreditNote" cn
                 WHERE cn."invoiceId" = i.id
                   AND cn."deletedAt" IS NULL
                   AND cn.status <> 'VOID'
                   ${asOf ? Prisma.sql`AND cn."issuedAt" <= ${asOf}` : Prisma.empty}),
                0
              ),
          0
        )
      ), 0) AS total
      FROM "Invoice" i
      WHERE i."deletedAt" IS NULL
        AND i.status NOT IN ('PAID', 'WRITTEN_OFF', 'DRAFT')
        AND (i.status = 'OVERDUE' OR i."dueDate" < ${referenceDate})
        ${asOfCreatedClause}
        ${cutoffClause}
    `;

    return this.toNumber(result[0]?.total ?? 0);
  }

  private async countActivePaymentPlans(): Promise<number> {
    return this.prisma.paymentPlan.count({
      where: { status: PaymentPlanStatus.ACTIVE },
    });
  }

  private async countCreditNotesIssuedMTD(
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.prisma.creditNote.count({
      where: {
        deletedAt: null,
        status: { not: 'VOID' },
        issuedAt: { gte: from, lte: to },
      },
    });
  }

  private async sumCreditNotesValueMTD(from: Date, to: Date): Promise<number> {
    const result = await this.prisma.creditNote.aggregate({
      where: {
        deletedAt: null,
        status: { not: 'VOID' },
        issuedAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
    return this.toNumber(result._sum.amount);
  }

  private async countPendingReconciliations(): Promise<number> {
    return this.prisma.bankStatement.count({
      where: { status: ReconciliationStatus.IN_PROGRESS },
    });
  }

  private async sumActiveRetainerMRR(cutoff?: Date | null): Promise<number> {
    const result = await this.prisma.retainerContract.aggregate({
      where: { status: RetainerStatus.ACTIVE, startDate: { gte: cutoff ?? undefined } },
      _sum: { amount: true },
    });
    return this.toNumber(result._sum.amount);
  }

  private async countActiveRetainers(): Promise<number> {
    return this.prisma.retainerContract.count({
      where: { status: RetainerStatus.ACTIVE },
    });
  }

  private async countRetainersUpForRenewal(): Promise<number> {
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return this.prisma.retainerContract.count({
      where: {
        status: RetainerStatus.ACTIVE,
        endDate: { lte: thirtyDaysFromNow, not: null },
      },
    });
  }

  private async computeCurrentMonthTaxOwed(
    from: Date,
    to: Date,
    cutoff?: Date | null,
  ): Promise<number> {
    const taxCollected = await this.prisma.invoice.aggregate({
      where: {
        status: InvoiceStatus.PAID,
        paidAt: { gte: laterOf(from, cutoff), lte: to },
        taxAmount: { gt: 0 },
        deletedAt: null,
      },
      _sum: { taxAmount: true },
    });

    const remittances = await this.prisma.taxPayment.findMany({
      where: {
        periodFrom: { lte: to },
        periodTo: { gte: from },
      },
    });

    const totalCollected = this.toNumber(taxCollected._sum.taxAmount);
    const totalRemitted = remittances.reduce(
      (s, r) => s + Number(r.amount),
      0,
    );

    return Number((totalCollected - totalRemitted).toFixed(2));
  }

  private async countBlockedProjects(): Promise<number> {
    return this.prisma.projectBudget.count({
      where: { isBlocked: true },
    });
  }

  private async getHrPayrollMetrics(): Promise<{
    totalActiveEmployees: number;
    totalMonthlyPayroll: number;
  }> {
    const activeEmployees = await this.prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE, deletedAt: null },
      select: { baseSalary: true },
    });

    const totalMonthlyPayroll = activeEmployees.reduce(
      (sum, e) => sum + Number(e.baseSalary),
      0,
    );

    return {
      totalActiveEmployees: activeEmployees.length,
      totalMonthlyPayroll: Number(totalMonthlyPayroll.toFixed(2)),
    };
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value);
  }

  private async getMonthlyRevenueSeries(
    now: Date,
    months: number,
    cutoff?: Date | null,
  ): Promise<number[]> {
    const series: number[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      series.push(await this.sumInvoices(start, end, cutoff));
    }
    return series;
  }

  private async getMonthlyCollectedSeries(
    now: Date,
    months: number,
    cutoff?: Date | null,
  ): Promise<number[]> {
    const series: number[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      series.push(await this.sumPayments(start, end, cutoff));
    }
    return series;
  }

  private async countInvoicesByStatusExact(status: string, cutoff?: Date | null): Promise<number> {
    return this.prisma.invoice.count({
      where: { deletedAt: null, status: status as InvoiceStatus, createdAt: { gte: cutoff ?? undefined } },
    });
  }

  private async getExpensesByCategory(
    start: Date,
    end: Date,
    cutoff?: Date | null,
  ): Promise<Array<{ category: string; amount: number }>> {
    const rows = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { deletedAt: null, date: { gte: laterOf(start, cutoff), lte: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
    return rows.map((r) => ({
      category: r.category as string,
      amount: this.toNumber(r._sum.amount),
    }));
  }

  private async getRecentInvoices(limit: number): Promise<
    Array<{ invoiceNumber: string; clientName: string; total: number; status: string }>
  > {
    const invoices = await this.prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        invoiceNumber: true,
        total: true,
        status: true,
        client: { select: { companyName: true } },
      },
    });
    return invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client?.companyName ?? '—',
      total: this.toNumber(inv.total),
      status: inv.status as string,
    }));
  }

  private async getTopClientsByRevenue(limit: number, cutoff?: Date | null): Promise<
    Array<{ companyName: string; totalInvoiced: number; totalCollected: number; outstanding: number }>
  > {
    const cutoffJoinClause = cutoff
      ? Prisma.sql`AND i."createdAt" >= ${cutoff}`
      : Prisma.empty;
    const result = await this.prisma.$queryRaw<
      Array<{
        companyName: string;
        totalInvoiced: Prisma.Decimal;
        totalCollected: Prisma.Decimal;
        outstanding: Prisma.Decimal;
      }>
    >`
      SELECT
        c."companyName",
        COALESCE(SUM(i.total), 0) AS "totalInvoiced",
        COALESCE(SUM(
          (SELECT COALESCE(SUM(p.amount), 0) FROM "Payment" p
           WHERE p."invoiceId" = i.id AND p."deletedAt" IS NULL)
        ), 0) AS "totalCollected",
        COALESCE(SUM(
          CASE WHEN i.status NOT IN ('PAID', 'WRITTEN_OFF', 'DRAFT') THEN
            GREATEST(
              i.total
                - COALESCE(
                    (SELECT SUM(p.amount) FROM "Payment" p
                     WHERE p."invoiceId" = i.id AND p."deletedAt" IS NULL), 0)
                - COALESCE(
                    (SELECT SUM(cn.amount) FROM "CreditNote" cn
                     WHERE cn."invoiceId" = i.id
                       AND cn."deletedAt" IS NULL
                       AND cn.status <> 'VOID'), 0),
              0
            )
          ELSE 0 END
        ), 0) AS outstanding
      FROM "Client" c
      LEFT JOIN "Invoice" i ON i."clientId" = c.id AND i."deletedAt" IS NULL ${cutoffJoinClause}
      WHERE c."deletedAt" IS NULL
      GROUP BY c.id, c."companyName"
      ORDER BY "totalInvoiced" DESC
      LIMIT ${limit}
    `;
    return result.map((r) => ({
      companyName: r.companyName,
      totalInvoiced: this.toNumber(r.totalInvoiced),
      totalCollected: this.toNumber(r.totalCollected),
      outstanding: this.toNumber(r.outstanding),
    }));
  }

  private async getRecentIncomeTransactions(limit: number) {
    const [payments, directIncome] = await Promise.all([
      this.prisma.payment.findMany({
        where: { deletedAt: null },
        orderBy: { paidAt: 'desc' },
        take: limit,
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          invoice: {
            select: {
              invoiceNumber: true,
              client: { select: { companyName: true } },
            },
          },
        },
      }),
      this.prisma.directIncome.findMany({
        where: { deletedAt: null },
        orderBy: { date: 'desc' },
        take: limit,
        select: {
          id: true,
          description: true,
          amount: true,
          currency: true,
          paymentMethod: true,
          date: true,
          client: { select: { companyName: true } },
        },
      }),
    ]);

    return [
      ...payments.map((p) => ({
        id: p.id,
        type: 'payment' as const,
        description: p.invoice.invoiceNumber,
        clientName: p.invoice.client?.companyName ?? '—',
        amount: this.toNumber(p.amount),
        method: p.method as string,
        date: p.paidAt.toISOString(),
      })),
      ...directIncome.map((d) => ({
        id: d.id,
        type: 'direct' as const,
        description: d.description,
        clientName: d.client?.companyName ?? '—',
        amount: this.toNumber(d.amount),
        method: d.paymentMethod as string,
        date: d.date.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  private async getRecentExpenses(limit: number) {
    const expenses = await (this.prisma.expense.findMany as (args: unknown) => Promise<Array<Record<string, unknown>>>)({
      where: { deletedAt: null },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        vendorName: true,
        category: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        date: true,
      },
    });
    return expenses.map((e) => ({
      id: e.id as string,
      vendorName: e.vendorName as string,
      category: e.category as string,
      amount: this.toNumber(e.amount as Parameters<typeof this.toNumber>[0]),
      currency: e.currency as string,
      paymentMethod: (e.paymentMethod as string | null) ?? null,
      date: (e.date as Date).toISOString(),
    }));
  }

  private async getPendingLeaveRequests(): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int AS count
      FROM "LeaveRequest"
      WHERE status = 'PENDING'
    `;
    return Number(result[0]?.count ?? 0);
  }
}

function serviceTypeLabel(key: string): string {
  const labels: Record<string, string> = {
    software_dev: 'Software / Website',
    branding: 'Branding',
    social_media: 'Social Media',
    influencer_marketing: 'Influencer Marketing',
    sales_services: 'Sales Services',
    general: 'General',
    historical_import: 'Historical (Import)',
    owner_capital: 'Owner Capital',
    retainer: 'Retainer',
  };
  return labels[key] ?? key;
}

function paymentMethodLabel(key: string): string {
  const labels: Record<string, string> = {
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_MONEY: 'Mobile Money',
    MTN_MOMO: 'MTN MoMo',
    AIRTEL_MONEY: 'Airtel Money',
    CARD: 'Card',
    CASH: 'Cash',
    OTHER: 'Other',
  };
  return labels[key] ?? key;
}

const ALL_PAYMENT_METHODS = [
  'BANK_TRANSFER',
  'MTN_MOMO',
  'AIRTEL_MONEY',
  'CARD',
  'CASH',
  'OTHER',
];

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  BANK_TRANSFER: '#60A5FA',
  MTN_MOMO:      '#FBBF24',
  AIRTEL_MONEY:  '#F87171',
  CARD:          '#A78BFA',
  CASH:          '#4ADE80',
  OTHER:         '#94A3B8',
};
