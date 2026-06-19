import { Injectable } from '@nestjs/common';
import { LeadSource, PipelineStage, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../common/cache-keys';

const SUMMARY_CACHE_KEY = CacheKeys.CRM_SUMMARY;
const SUMMARY_TTL_SECONDS = CacheTTL.CRM_SUMMARY;

export interface CrmSummaryData {
  totalLeads: number;
  totalLeadsThisMonth: number;
  totalInPipeline: number;
  totalClosedWonThisMonth: number;
  totalClosedLostThisMonth: number;
  totalPipelineValue: number;
  conversionRate: number;
  totalClients: number;
  averageQualityScore: number;
  leadsByStage: Record<PipelineStage, number>;
  leadsBySource: Record<LeadSource, number>;
  topAgents: Array<{
    agentId: string;
    agentName: string;
    closedWon: number;
    totalValue: number;
  }>;
  recentActivities: Array<{
    id: string;
    leadId: string;
    type: string;
    summary: string;
    performedAt: string;
    companyName: string;
    performedByName: string;
  }>;
  overdueFollowUps: Array<{
    leadId: string;
    companyName: string;
    nextAction: string;
    nextActionDate: string;
  }>;
  proposalsSent: number;
  proposalsAccepted: number;
  proposalAcceptanceRate: number;
  leadsWithOverdueFollowUp: number;
  avgDaysToClose: number;
  pipelineValueByStage: Record<PipelineStage, number>;
}

@Injectable()
export class CrmSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getSummary(): Promise<CrmSummaryData> {
    const cached = await this.cache.get<CrmSummaryData>(SUMMARY_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      totalLeadsThisMonth,
      totalInPipeline,
      closedWonThisMonth,
      closedLostThisMonth,
      pipelineValueAgg,
      totalClients,
      scoreAgg,
      leadsByStageRaw,
      leadsBySourceRaw,
      closedWonByAgent,
      recentActivities,
      overdueFollowUps,
      proposalsSentThisMonth,
      proposalsAcceptedThisMonth,
      overdueFollowUpCount,
      closedWonForAvgDays,
      pipelineValueByStageRaw,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { deletedAt: null } }),
      this.prisma.lead.count({
        where: { deletedAt: null, createdAt: { gte: monthStart } },
      }),
      this.prisma.lead.count({
        where: {
          deletedAt: null,
          stage: {
            notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
          },
        },
      }),
      this.prisma.lead.count({
        where: {
          deletedAt: null,
          stage: PipelineStage.CLOSED_WON,
          convertedAt: { gte: monthStart },
        },
      }),
      this.prisma.lead.count({
        where: {
          deletedAt: null,
          stage: PipelineStage.CLOSED_LOST,
          updatedAt: { gte: monthStart },
        },
      }),
      this.prisma.lead.aggregate({
        where: {
          deletedAt: null,
          stage: {
            notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
          },
        },
        _sum: { estimatedValue: true },
      }),
      this.prisma.client.count({ where: { deletedAt: null } }),
      this.prisma.lead.aggregate({
        where: { deletedAt: null },
        _avg: { qualityScore: true },
      }),
      this.prisma.lead.groupBy({
        by: ['stage'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: {
          deletedAt: null,
          stage: PipelineStage.CLOSED_WON,
          assignedTo: { not: null },
        },
        _count: { id: true },
        _sum: { estimatedValue: true },
      }),
      this.prisma.leadActivity.findMany({
        take: 10,
        orderBy: { performedAt: 'desc' },
        include: {
          lead: { select: { companyName: true } },
        },
      }),
      this.prisma.leadActivity.findMany({
        where: {
          nextActionDate: { lt: now },
          nextAction: { not: null },
          lead: { deletedAt: null },
        },
        include: { lead: { select: { id: true, companyName: true } } },
        orderBy: { nextActionDate: 'asc' },
        take: 10,
      }),
      this.prisma.proposal.count({
        where: {
          status: ProposalStatus.SENT,
          sentAt: { gte: monthStart },
        },
      }),
      this.prisma.proposal.count({
        where: {
          status: ProposalStatus.ACCEPTED,
          acceptedAt: { gte: monthStart },
        },
      }),
      this.prisma.leadActivity.count({
        where: {
          nextActionDate: { lt: now },
          nextAction: { not: null },
          lead: {
            deletedAt: null,
            stage: {
              notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
            },
          },
        },
      }),
      this.prisma.lead.findMany({
        where: {
          stage: PipelineStage.CLOSED_WON,
          convertedAt: { gte: monthStart },
        },
        select: { createdAt: true, convertedAt: true },
      }),
      this.prisma.lead.groupBy({
        by: ['stage'],
        where: {
          deletedAt: null,
          stage: {
            notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
          },
        },
        _sum: { estimatedValue: true },
      }),
    ]);

    const agentIds = closedWonByAgent
      .map((row) => row.assignedTo)
      .filter((id): id is string => Boolean(id));

    const agents =
      agentIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: agentIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];

    const agentNameMap = new Map(
      agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]),
    );

    const performerIds = [
      ...new Set(recentActivities.map((a) => a.performedBy)),
    ];
    const performers =
      performerIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: performerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const performerMap = new Map(
      performers.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
    );

    const leadsByStage = Object.values(PipelineStage).reduce(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<PipelineStage, number>,
    );
    for (const row of leadsByStageRaw) {
      leadsByStage[row.stage] = row._count.id;
    }

    const leadsBySource = Object.values(LeadSource).reduce(
      (acc, source) => {
        acc[source] = 0;
        return acc;
      },
      {} as Record<LeadSource, number>,
    );
    for (const row of leadsBySourceRaw) {
      leadsBySource[row.source] = row._count.id;
    }

    const closedTotal = closedWonThisMonth + closedLostThisMonth;
    const conversionRate =
      closedTotal > 0
        ? Math.round((closedWonThisMonth / closedTotal) * 1000) / 10
        : 0;

    const proposalAcceptanceRate =
      proposalsSentThisMonth > 0
        ? Math.round(
            (proposalsAcceptedThisMonth / proposalsSentThisMonth) * 1000,
          ) / 10
        : 0;

    const avgDaysToClose =
      closedWonForAvgDays.length > 0
        ? Math.round(
            closedWonForAvgDays.reduce((sum, lead) => {
              if (!lead.convertedAt) return sum;
              const days =
                (lead.convertedAt.getTime() - lead.createdAt.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / closedWonForAvgDays.length,
          )
        : 0;

    const pipelineValueByStage = Object.values(PipelineStage).reduce(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<PipelineStage, number>,
    );
    for (const row of pipelineValueByStageRaw) {
      pipelineValueByStage[row.stage] = Number(row._sum.estimatedValue ?? 0);
    }

    const summary: CrmSummaryData = {
      totalLeads,
      totalLeadsThisMonth,
      totalInPipeline,
      totalClosedWonThisMonth: closedWonThisMonth,
      totalClosedLostThisMonth: closedLostThisMonth,
      totalPipelineValue: Number(pipelineValueAgg._sum.estimatedValue ?? 0),
      conversionRate,
      totalClients,
      averageQualityScore: Math.round(scoreAgg._avg.qualityScore ?? 0),
      leadsByStage,
      leadsBySource,
      topAgents: closedWonByAgent
        .filter((row) => row.assignedTo)
        .map((row) => ({
          agentId: row.assignedTo as string,
          agentName: agentNameMap.get(row.assignedTo as string) ?? 'Unknown',
          closedWon: row._count.id,
          totalValue: Number(row._sum.estimatedValue ?? 0),
        }))
        .sort((a, b) => b.closedWon - a.closedWon)
        .slice(0, 5),
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        leadId: activity.leadId,
        type: activity.type,
        summary: activity.summary,
        performedAt: activity.performedAt.toISOString(),
        companyName: activity.lead.companyName,
        performedByName:
          performerMap.get(activity.performedBy) ?? 'Unknown',
      })),
      overdueFollowUps: overdueFollowUps.map((activity) => ({
        leadId: activity.lead.id,
        companyName: activity.lead.companyName,
        nextAction: activity.nextAction ?? '',
        nextActionDate: activity.nextActionDate?.toISOString() ?? '',
      })),
      proposalsSent: proposalsSentThisMonth,
      proposalsAccepted: proposalsAcceptedThisMonth,
      proposalAcceptanceRate,
      leadsWithOverdueFollowUp: overdueFollowUpCount,
      avgDaysToClose,
      pipelineValueByStage,
    };

    await this.cache.set(SUMMARY_CACHE_KEY, summary, SUMMARY_TTL_SECONDS);
    return summary;
  }

  async invalidateSummaryCache(): Promise<void> {
    await this.cache.del(SUMMARY_CACHE_KEY);
  }
}
