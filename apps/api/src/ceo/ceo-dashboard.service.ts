import { Injectable } from '@nestjs/common';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { invoiceRemainingBalance } from '../common/invoice-balance.util';
import { DataCutoffService, laterOf } from '../settings/data-cutoff.service';

@Injectable()
export class CeoDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataCutoffService: DataCutoffService,
  ) {}

  private async sumOutstandingForStatuses(
    statuses: Array<'SENT' | 'PARTIALLY_PAID' | 'OVERDUE'>,
    cutoff: Date | null,
  ): Promise<{ total: number; count: number }> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: statuses },
        deletedAt: null,
        createdAt: { gte: cutoff ?? undefined },
      },
      select: {
        total: true,
        payments: { where: { deletedAt: null }, select: { amount: true } },
        creditNotes: {
          where: { deletedAt: null },
          select: { amount: true, status: true },
        },
      },
    });

    let total = 0;
    let count = 0;
    for (const inv of invoices) {
      const remaining = invoiceRemainingBalance({
        total: inv.total,
        payments: inv.payments,
        creditNotes: inv.creditNotes,
      });
      if (remaining > 0.001) {
        total += remaining;
        count += 1;
      }
    }
    return { total: Number(total.toFixed(2)), count };
  }

  async getFullSummary() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const { enabled: excludeOldDataEnabled, cutoff } = await this.dataCutoffService.getState();

    const [
      revenueMTD,
      revenueLastMonth,
      collectedMTD,
      outstandingAR,
      overdueInvoices,
      expensesMTD,
      totalMRR,
      pendingCommissions,
      monthlyRevenueTrend,
      invoicesByStatus,

      totalLeads,
      pipelineValue,
      closedWonMTD,
      conversionRate,
      leadsByStage,
      topAgents,

      totalEmployees,
      activeEmployees,
      onLeaveToday,
      pendingLeaveRequests,
      attendanceToday,
      pendingPerformanceReviews,

      activeProjects,
      overdueTasks,
      blockedTasks,
      recentProjects,

      marketingClients,
      softwareProjects,
      brandingProjects,
      activeCampaigns,
      salesCampaigns,

      venturesSummary,

      pendingBudgetRequests,

      reserveAccount,

      rawIncomeByService,
      rawPaymentByMethod,
      rawDirectIncomeByMethod,
      rawExpenseByMethod,
      rawPaymentByMethodAllTime,
      rawDirectIncomeByMethodAllTime,
      rawExpenseByMethodAllTime,
    ] = await Promise.all([
      // ── Finance ─────────────────────────────────────────────
      this.prisma.invoice.aggregate({
        where: {
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
          createdAt: { gte: laterOf(monthStart, cutoff), lte: monthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
          createdAt: { gte: laterOf(lastMonthStart, cutoff), lte: lastMonthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: laterOf(monthStart, cutoff), lte: monthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.sumOutstandingForStatuses(['SENT', 'PARTIALLY_PAID', 'OVERDUE'], cutoff),
      this.sumOutstandingForStatuses(['OVERDUE'], cutoff),
      this.prisma.expense.aggregate({
        where: { date: { gte: laterOf(monthStart, cutoff), lte: monthEnd }, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.retainerContract.aggregate({
        where: { status: 'ACTIVE', startDate: { gte: cutoff ?? undefined } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.commissionRecord.count({
        where: { status: 'PENDING', createdAt: { gte: cutoff ?? undefined } },
      }),

      // 6-month revenue trend
      Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(now, 5 - i);
          return this.prisma.invoice
            .aggregate({
              where: {
                status: { in: ['PAID', 'PARTIALLY_PAID'] },
                paidAt: { gte: laterOf(startOfMonth(d), cutoff), lte: endOfMonth(d) },
                deletedAt: null,
              },
              _sum: { total: true },
            })
            .then((r) => ({
              month: format(d, 'MMM'),
              value: Number(r._sum.total ?? 0),
            }));
        }),
      ),

      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { deletedAt: null, createdAt: { gte: cutoff ?? undefined } },
        _count: { id: true },
      }),

      // ── CRM ─────────────────────────────────────────────────
      this.prisma.lead.count({
        where: { createdAt: { gte: monthStart }, deletedAt: null },
      }),
      this.prisma.lead.aggregate({
        where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }, deletedAt: null },
        _sum: { estimatedValue: true },
      }),
      this.prisma.lead.count({
        where: { stage: 'CLOSED_WON', convertedAt: { gte: monthStart } },
      }),
      this.prisma.lead
        .count({ where: { stage: 'CLOSED_WON' } })
        .then(async (won) => {
          const lost = await this.prisma.lead.count({ where: { stage: 'CLOSED_LOST' } });
          return won + lost > 0
            ? Number((((won / (won + lost)) * 100).toFixed(1)))
            : 0;
        }),
      this.prisma.lead.groupBy({
        by: ['stage'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: {
          stage: 'CLOSED_WON',
          convertedAt: { gte: monthStart },
          assignedTo: { not: null },
        },
        _count: { id: true },
        _sum: { estimatedValue: true },
        orderBy: { _sum: { estimatedValue: 'desc' } },
        take: 5,
      }),

      // ── HR ──────────────────────────────────────────────────
      this.prisma.employee.count({ where: { deletedAt: null } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.leaveRequest.count({
        where: { status: 'APPROVED', startDate: { lte: now }, endDate: { gte: now } },
      }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: { date: { gte: startOfDay(now), lte: endOfDay(now) } },
        _count: { id: true },
      }),
      this.prisma.performanceReview.count({
        where: { status: { in: ['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_REVIEW'] } },
      }),

      // ── Projects ────────────────────────────────────────────
      this.prisma.project.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.task.count({
        where: { dueDate: { lt: now }, status: { not: 'DONE' }, deletedAt: null },
      }),
      this.prisma.task.count({ where: { status: 'BLOCKED', deletedAt: null } }),
      this.prisma.project.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: {
          id: true,
          name: true,
          client: { select: { companyName: true } },
          _count: {
            select: {
              tasks: { where: { deletedAt: null } },
            },
          },
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
      }),

      // ── Service modules ─────────────────────────────────────
      this.prisma.marketingClient.count({ where: { isActive: true } }),
      this.prisma.softwareProject.count({ where: { isActive: true } }),
      this.prisma.brandingProject.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.influencerCampaign.count({ where: { status: 'ACTIVE' } }),
      this.prisma.salesCampaign.count({ where: { status: 'ACTIVE' } }),

      // ── Ventures ────────────────────────────────────────────
      // Income/expenses are sourced the same way VenturesService.getSummary()
      // computes them (Invoice + DirectIncome for income, Expense for
      // expenses) — NOT the VentureIncome/VentureExpense models, which have
      // their own /ventures/:id/income and /ventures/:id/expenses endpoints
      // but no UI ever calls them, so they always sum to zero.
      this.prisma.venture.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          color: true,
          invoices: {
            where: {
              status: 'PAID',
              paidAt: { gte: laterOf(monthStart, cutoff), lte: monthEnd },
              deletedAt: null,
            },
            select: { total: true },
          },
          directIncome: {
            where: { date: { gte: laterOf(monthStart, cutoff), lte: monthEnd }, deletedAt: null },
            select: { amount: true },
          },
          expenses: {
            where: { date: { gte: laterOf(monthStart, cutoff), lte: monthEnd }, deletedAt: null },
            select: { amount: true, ventureSharePercent: true },
          },
        },
      }),

      // ── CEO pending actions ──────────────────────────────────
      this.prisma.projectBudget.count({ where: { isBlocked: true } }),

      // ── Reserve ──────────────────────────────────────────────
      this.prisma.reserveAccount.findFirst({ select: { balance: true, currency: true } }),

      // ── Finance charts ───────────────────────────────────────
      this.prisma.invoice.groupBy({
        by: ['serviceType'],
        where: {
          status: 'PAID',
          paidAt: { gte: laterOf(monthStart, cutoff), lte: monthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: {
          paidAt: { gte: laterOf(monthStart, cutoff), lte: monthEnd },
          deletedAt: null,
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Income also comes in as Direct Income (no invoice raised) — must be
      // combined with invoice payments above for an accurate "income by
      // payment method" figure, not just the invoice-payment subset of it.
      this.prisma.directIncome.groupBy({
        by: ['paymentMethod'],
        where: { date: { gte: laterOf(monthStart, cutoff), lte: monthEnd }, deletedAt: null },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expense.groupBy({
        by: ['paymentMethod'],
        where: {
          date: { gte: laterOf(monthStart, cutoff), lte: monthEnd },
          deletedAt: null,
          paymentMethod: { not: null },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // ── Cash vs Bank balance — all-time (subject to the cutoff below), not scoped to this month ────
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { deletedAt: null, paidAt: { gte: cutoff ?? undefined } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.directIncome.groupBy({
        by: ['paymentMethod'],
        where: { deletedAt: null, date: { gte: cutoff ?? undefined } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expense.groupBy({
        by: ['paymentMethod'],
        where: { deletedAt: null, paymentMethod: { not: null }, date: { gte: cutoff ?? undefined } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Venture summary
    const venturesData = venturesSummary.map((v) => {
      const invoiceIncome = v.invoices.reduce((s, i) => s + Number(i.total), 0);
      const directIncome = v.directIncome.reduce((s, d) => s + Number(d.amount), 0);
      const income = invoiceIncome + directIncome;
      const expenses = v.expenses.reduce((s, e) => {
        const sharePct = e.ventureSharePercent != null ? Number(e.ventureSharePercent) : 100;
        return s + (Number(e.amount) * sharePct) / 100;
      }, 0);
      return {
        id: v.id,
        name: v.name,
        color: v.color,
        income,
        expenses,
        net: income - expenses,
      };
    });

    const revMTD = Number(revenueMTD._sum.total ?? 0);
    const revLastMo = Number(revenueLastMonth._sum.total ?? 0);
    const revenueTrend =
      revLastMo > 0
        ? Number((((revMTD - revLastMo) / revLastMo) * 100).toFixed(1))
        : 0;

    const totalChartIncome = rawIncomeByService.reduce(
      (s, r) => s + Number(r._sum.total ?? 0),
      0,
    );
    const totalChartPayments = rawPaymentByMethod.reduce(
      (s, r) => s + Number(r._sum.amount ?? 0),
      0,
    );

    type MethodAgg = Map<string, { amount: number; count: number }>;
    function buildIncomeByMethod(
      payments: Array<{ method: string; _sum: { amount: unknown }; _count: { id: number } }>,
      directIncome: Array<{ paymentMethod: string; _sum: { amount: unknown }; _count: { id: number } }>,
    ): MethodAgg {
      // Income by payment method = invoice payments + Direct Income, combined
      // — a payment method's true "money in" figure, not just its invoice-
      // payment subset.
      const map: MethodAgg = new Map();
      for (const r of payments) {
        const prev = map.get(r.method) ?? { amount: 0, count: 0 };
        map.set(r.method, {
          amount: prev.amount + Number(r._sum.amount ?? 0),
          count: prev.count + r._count.id,
        });
      }
      for (const r of directIncome) {
        const prev = map.get(r.paymentMethod) ?? { amount: 0, count: 0 };
        map.set(r.paymentMethod, {
          amount: prev.amount + Number(r._sum.amount ?? 0),
          count: prev.count + r._count.id,
        });
      }
      return map;
    }
    function buildExpensesByMethod(
      expenses: Array<{ paymentMethod: string | null; _sum: { amount: unknown }; _count: { id: number } }>,
    ): MethodAgg {
      const map: MethodAgg = new Map();
      for (const r of expenses) {
        if (!r.paymentMethod) continue;
        map.set(r.paymentMethod, { amount: Number(r._sum.amount ?? 0), count: r._count.id });
      }
      return map;
    }

    const incomeByMethod = buildIncomeByMethod(rawPaymentByMethod, rawDirectIncomeByMethod);
    const expensesByMethod = buildExpensesByMethod(rawExpenseByMethod);

    // CEO-level simplification: every method collapses into either "held as
    // physical Cash" or "sits in a Bank/electronic account". OTHER and
    // expenses/income with no recorded method are excluded rather than
    // guessed into either bucket — showing a bucket without them would be
    // more inaccurate than just leaving that money unclassified.
    const BANK_METHODS = ['BANK_TRANSFER', 'MOBILE_MONEY', 'MTN_MOMO', 'AIRTEL_MONEY', 'CARD'];
    function sumMethods(map: MethodAgg, methods: string[]): number {
      return methods.reduce((s, m) => s + (map.get(m)?.amount ?? 0), 0);
    }

    // Cash vs Bank balance is a running, all-time figure (how much is
    // actually sitting in each place right now) — not reset to "this
    // month", unlike the rest of the dashboard's MTD metrics.
    const incomeByMethodAllTime = buildIncomeByMethod(
      rawPaymentByMethodAllTime,
      rawDirectIncomeByMethodAllTime,
    );
    const expensesByMethodAllTime = buildExpensesByMethod(rawExpenseByMethodAllTime);

    const cashIncome = incomeByMethodAllTime.get('CASH')?.amount ?? 0;
    const cashExpenses = expensesByMethodAllTime.get('CASH')?.amount ?? 0;
    const bankIncome = sumMethods(incomeByMethodAllTime, BANK_METHODS);
    const bankExpenses = sumMethods(expensesByMethodAllTime, BANK_METHODS);

    return {
      generatedAt: now,

      meta: {
        excludeOldDataEnabled,
        excludeOldDataCutoff: cutoff ? cutoff.toISOString() : null,
      },

      finance: {
        revenueMTD: revMTD,
        revenueLastMonth: revLastMo,
        revenueTrend,
        collectedMTD: Number(collectedMTD._sum.total ?? 0),
        outstandingAR: outstandingAR.total,
        overdueAmount: overdueInvoices.total,
        overdueCount: overdueInvoices.count,
        expensesMTD: Number(expensesMTD._sum.amount ?? 0),
        totalMRR: Number(totalMRR._sum.amount ?? 0),
        activeRetainers: totalMRR._count.id,
        pendingCommissions,
        monthlyRevenueTrend,
        invoicesByStatus: Object.fromEntries(
          invoicesByStatus.map((s) => [s.status, s._count.id]),
        ),
        reserve: {
          balance: Number(reserveAccount?.balance ?? 0),
          currency: reserveAccount?.currency ?? 'RWF',
        },
        charts: {
          incomeByService: rawIncomeByService.map((r) => ({
            service: r.serviceType ?? 'unknown',
            label: ceoServiceLabel(r.serviceType ?? ''),
            amount: Number(r._sum.total ?? 0),
            count: r._count.id,
            percentage:
              totalChartIncome > 0
                ? Number(((Number(r._sum.total ?? 0) / totalChartIncome) * 100).toFixed(1))
                : 0,
          })),
          paymentByMethod: rawPaymentByMethod.map((r) => ({
            method: r.method as string,
            label: ceoPaymentLabel(r.method as string),
            amount: Number(r._sum.amount ?? 0),
            count: r._count.id,
            percentage:
              totalChartPayments > 0
                ? Number(((Number(r._sum.amount ?? 0) / totalChartPayments) * 100).toFixed(1))
                : 0,
          })),
          paymentMethodSummary: CEO_ALL_METHODS.map((method) => {
            const inc = incomeByMethod.get(method) ?? { amount: 0, count: 0 };
            const exp = expensesByMethod.get(method) ?? { amount: 0, count: 0 };
            return {
              method,
              label: ceoPaymentLabel(method),
              color: CEO_METHOD_COLORS[method] ?? '#94A3B8',
              income: inc,
              expenses: exp,
              net: inc.amount - exp.amount,
            };
          }).filter((m) => m.income.amount > 0 || m.expenses.amount > 0),
        },
        cashVsBank: {
          cash: { income: cashIncome, expenses: cashExpenses, net: cashIncome - cashExpenses },
          bank: { income: bankIncome, expenses: bankExpenses, net: bankIncome - bankExpenses },
        },
      },

      crm: {
        totalLeadsMTD: totalLeads,
        pipelineValue: Number(pipelineValue._sum.estimatedValue ?? 0),
        closedWonMTD,
        conversionRate,
        leadsByStage: Object.fromEntries(
          leadsByStage.map((s) => [s.stage, s._count.id]),
        ),
        topAgents,
      },

      hr: {
        totalEmployees,
        activeEmployees,
        onLeaveToday,
        pendingLeaveRequests,
        presentToday:
          attendanceToday.find((a) => a.status === 'PRESENT')?._count.id ?? 0,
        pendingPerformanceReviews,
      },

      projects: {
        activeProjects,
        overdueTasks,
        blockedTasks,
        recentProjects,
      },

      services: {
        marketingClients,
        softwareProjects,
        brandingProjects,
        activeCampaigns,
        salesCampaigns,
        activeSubscriptions: 0,
        openTickets: 0,
      },

      ventures: {
        total: venturesData.length,
        totalIncome: venturesData.reduce((s, v) => s + v.income, 0),
        totalExpenses: venturesData.reduce((s, v) => s + v.expenses, 0),
        totalNet: venturesData.reduce((s, v) => s + v.net, 0),
        list: venturesData,
      },

      alerts: {
        pendingCommissions,
        pendingLeaveRequests,
        pendingBudgetRequests,
        overdueInvoices: overdueInvoices.count,
        blockedTasks,
      },
    };
  }
}

function ceoServiceLabel(key: string): string {
  const labels: Record<string, string> = {
    software_dev: 'Software / Website',
    branding: 'Branding',
    social_media: 'Social Media',
    influencer_marketing: 'Influencer Marketing',
    sales_services: 'Sales Services',
    general: 'General',
    retainer: 'Retainer',
    historical_import: 'Historical (Import)',
  };
  return labels[key] ?? key;
}

function ceoPaymentLabel(key: string): string {
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

const CEO_ALL_METHODS = [
  'BANK_TRANSFER',
  'MTN_MOMO',
  'AIRTEL_MONEY',
  'CARD',
  'CASH',
  'OTHER',
];

const CEO_METHOD_COLORS: Record<string, string> = {
  BANK_TRANSFER: '#60A5FA',
  MTN_MOMO:      '#FBBF24',
  AIRTEL_MONEY:  '#F87171',
  CARD:          '#A78BFA',
  CASH:          '#4ADE80',
  OTHER:         '#94A3B8',
};
