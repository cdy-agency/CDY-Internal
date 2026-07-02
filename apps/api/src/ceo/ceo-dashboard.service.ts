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

@Injectable()
export class CeoDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getFullSummary() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

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
    ] = await Promise.all([
      // ── Finance ─────────────────────────────────────────────
      this.prisma.invoice.aggregate({
        where: {
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
          createdAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: monthStart, lte: monthEnd }, deletedAt: null },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'PARTIALLY_PAID'] }, deletedAt: null },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'OVERDUE', deletedAt: null },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.expense.aggregate({
        where: { date: { gte: monthStart, lte: monthEnd }, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.retainerContract.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.commissionRecord.count({ where: { status: 'PENDING' } }),

      // 6-month revenue trend
      Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(now, 5 - i);
          return this.prisma.invoice
            .aggregate({
              where: {
                status: { in: ['PAID', 'PARTIALLY_PAID'] },
                paidAt: { gte: startOfMonth(d), lte: endOfMonth(d) },
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
        where: { deletedAt: null },
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
      this.prisma.venture.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          color: true,
          incomeEntries: {
            where: { date: { gte: monthStart, lte: monthEnd }, deletedAt: null },
            select: { amount: true },
          },
          expenseEntries: {
            where: { date: { gte: monthStart, lte: monthEnd }, deletedAt: null },
            select: { ventureAmount: true },
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
          paidAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: {
          paidAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    // Venture summary
    const venturesData = venturesSummary.map((v) => {
      const income = v.incomeEntries.reduce(
        (s, e) => s + Number(e.amount),
        0,
      );
      const expenses = v.expenseEntries.reduce(
        (s, e) => s + Number(e.ventureAmount),
        0,
      );
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

    return {
      generatedAt: now,

      finance: {
        revenueMTD: revMTD,
        revenueLastMonth: revLastMo,
        revenueTrend,
        collectedMTD: Number(collectedMTD._sum.total ?? 0),
        outstandingAR: Number(outstandingAR._sum.total ?? 0),
        overdueAmount: Number(overdueInvoices._sum.total ?? 0),
        overdueCount: overdueInvoices._count.id,
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
            const inc = rawPaymentByMethod.find((r) => r.method === method);
            const incAmt = Number(inc?._sum.amount ?? 0);
            return {
              method,
              label: ceoPaymentLabel(method),
              color: CEO_METHOD_COLORS[method] ?? '#94A3B8',
              income:   { amount: incAmt, count: inc?._count.id ?? 0 },
              expenses: { amount: 0, count: 0 },
              net: incAmt,
            };
          }).filter((m) => m.income.amount > 0),
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
        overdueInvoices: overdueInvoices._count.id,
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
