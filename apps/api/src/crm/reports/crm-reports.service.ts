import { Injectable } from '@nestjs/common';
import {
  CommissionStatus,
  LeadSource,
  PipelineStage,
  ProposalStatus,
} from '@prisma/client';
import { format, startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { SalesReportFiltersDto } from './dto/sales-report-filters.dto';

@Injectable()
export class CrmReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async getSalesPerformanceReport(filters: SalesReportFiltersDto) {
    const from = filters.from
      ? new Date(filters.from)
      : startOfMonth(new Date());
    const to = filters.to ? new Date(filters.to) : new Date();
    const monthKey = format(from, 'yyyy-MM');

    // Feature-based: report on every user who can own commissions, so custom
    // "sales agent"-style roles are included rather than only the seeded key.
    const agentIds = await this.rbac.findUserIdsWithFeature(
      'finance.commissions.own',
      'read',
    );
    const agents = await this.prisma.user.findMany({
      where: {
        id: { in: agentIds },
        isActive: true,
        deletedAt: null,
      },
      include: { role: true },
    });

    const agentStats = await Promise.all(
      agents.map(async (agent) => {
        const closedWon = await this.prisma.lead.findMany({
          where: {
            assignedTo: agent.id,
            stage: PipelineStage.CLOSED_WON,
            convertedAt: { gte: from, lte: to },
          },
          select: {
            estimatedValue: true,
            serviceInterest: true,
            source: true,
            convertedAt: true,
          },
        });

        const closedLost = await this.prisma.lead.count({
          where: {
            assignedTo: agent.id,
            stage: PipelineStage.CLOSED_LOST,
            updatedAt: { gte: from, lte: to },
          },
        });

        const activitiesCount = await this.prisma.leadActivity.count({
          where: {
            performedBy: agent.id,
            performedAt: { gte: from, lte: to },
          },
        });

        const proposalsSent = await this.prisma.proposal.count({
          where: {
            createdBy: agent.id,
            status: { not: ProposalStatus.DRAFT },
            sentAt: { gte: from, lte: to },
          },
        });

        const target = await this.prisma.salesTarget.findUnique({
          where: {
            agentId_month: { agentId: agent.id, month: monthKey },
          },
        });

        const commission = await this.prisma.commissionRecord.findMany({
          where: {
            agentId: agent.id,
            month: monthKey,
            status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
          },
          select: { calculatedAmount: true, adjustedAmount: true },
        });

        const totalRevenue = closedWon.reduce(
          (sum, lead) => sum + Number(lead.estimatedValue ?? 0),
          0,
        );
        const totalCommission = commission.reduce(
          (sum, record) =>
            sum + Number(record.adjustedAmount ?? record.calculatedAmount),
          0,
        );
        const conversionRate =
          closedWon.length + closedLost > 0
            ? Number(
                ((closedWon.length / (closedWon.length + closedLost)) * 100).toFixed(
                  2,
                ),
              )
            : 0;

        return {
          agentId: agent.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          email: agent.email,
          performance: {
            dealsWon: closedWon.length,
            dealsLost: closedLost,
            totalRevenue,
            avgDealValue:
              closedWon.length > 0
                ? Number((totalRevenue / closedWon.length).toFixed(2))
                : 0,
            conversionRate,
            activitiesCount,
            proposalsSent,
            totalCommission,
          },
          target: target
            ? {
                revenueTarget: Number(target.revenueTarget),
                dealsTarget: target.dealsTarget,
                revenueProgress:
                  Number(target.revenueTarget) > 0
                    ? Math.round(
                        (totalRevenue / Number(target.revenueTarget)) * 100,
                      )
                    : null,
                dealsProgress:
                  target.dealsTarget > 0
                    ? Math.round((closedWon.length / target.dealsTarget) * 100)
                    : null,
              }
            : null,
          deals: closedWon.map((deal) => ({
            serviceType: deal.serviceInterest,
            value: Number(deal.estimatedValue ?? 0),
            source: deal.source,
            closedAt: deal.convertedAt?.toISOString() ?? null,
          })),
        };
      }),
    );

    agentStats.sort(
      (a, b) => b.performance.totalRevenue - a.performance.totalRevenue,
    );

    const totals = {
      totalRevenue: agentStats.reduce(
        (sum, agent) => sum + agent.performance.totalRevenue,
        0,
      ),
      totalDealsWon: agentStats.reduce(
        (sum, agent) => sum + agent.performance.dealsWon,
        0,
      ),
      totalCommission: agentStats.reduce(
        (sum, agent) => sum + agent.performance.totalCommission,
        0,
      ),
      avgConversionRate:
        agentStats.length > 0
          ? Number(
              (
                agentStats.reduce(
                  (sum, agent) => sum + agent.performance.conversionRate,
                  0,
                ) / agentStats.length
              ).toFixed(2),
            )
          : 0,
    };

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      totals,
      agents: agentStats,
    };
  }

  async getSourceAnalysisReport(filters: SalesReportFiltersDto) {
    const from = filters.from
      ? new Date(filters.from)
      : startOfMonth(new Date());
    const to = filters.to ? new Date(filters.to) : new Date();

    const sources = Object.values(LeadSource);

    const sourceStats = await Promise.all(
      sources.map(async (source) => {
        const created = await this.prisma.lead.count({
          where: {
            source,
            createdAt: { gte: from, lte: to },
            deletedAt: null,
          },
        });

        const won = await this.prisma.lead.aggregate({
          where: {
            source,
            stage: PipelineStage.CLOSED_WON,
            convertedAt: { gte: from, lte: to },
          },
          _count: { id: true },
          _sum: { estimatedValue: true },
        });

        const lost = await this.prisma.lead.count({
          where: {
            source,
            stage: PipelineStage.CLOSED_LOST,
            updatedAt: { gte: from, lte: to },
          },
        });

        const conversionRate =
          won._count.id + lost > 0
            ? Number(((won._count.id / (won._count.id + lost)) * 100).toFixed(2))
            : 0;

        return {
          source,
          totalLeads: created,
          dealsWon: won._count.id,
          dealsLost: lost,
          totalRevenue: Number(won._sum.estimatedValue ?? 0),
          conversionRate,
          avgDealValue:
            won._count.id > 0
              ? Number(
                  (Number(won._sum.estimatedValue ?? 0) / won._count.id).toFixed(
                    2,
                  ),
                )
              : 0,
        };
      }),
    );

    sourceStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return { period: { from: from.toISOString(), to: to.toISOString() }, sources: sourceStats };
  }
}
