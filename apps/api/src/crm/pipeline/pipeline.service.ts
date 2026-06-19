import { Injectable } from '@nestjs/common';
import { LeadSource, PipelineStage } from '@prisma/client';
import { startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { CacheKeys } from '../../common/cache-keys';
import { LeadsService } from '../leads/leads.service';
import { ConversionFiltersDto } from './dto/conversion-filters.dto';

const CONVERSION_CACHE_PREFIX = 'crm:conversion:';
const CONVERSION_TTL_SECONDS = 3600;

export interface ConversionReportData {
  period: { from: string; to: string };
  funnel: {
    totalCreated: number;
    byStage: Partial<Record<PipelineStage, number>>;
    closedWon: number;
    closedLost: number;
  };
  metrics: {
    conversionRate: number;
    totalRevenue: number;
    avgDealValue: number;
    totalClosed: number;
    avgDaysToClose: number;
  };
  lostReasons: Array<{ reason: string; count: number }>;
  bySource: Array<{
    source: LeadSource;
    count: number;
    revenue: number;
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    dealsWon: number;
    revenue: number;
  }>;
}

@Injectable()
export class PipelineService {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  getBoard(userId: string, roleKey: string) {
    return this.leadsService.getPipelineBoard(userId, roleKey);
  }

  async getConversionReport(
    filters: ConversionFiltersDto,
  ): Promise<ConversionReportData> {
    const from = filters.from
      ? new Date(filters.from)
      : startOfMonth(new Date());
    const to = filters.to ? new Date(filters.to) : new Date();

    const cacheKey = `${CONVERSION_CACHE_PREFIX}${from.toISOString()}:${to.toISOString()}`;
    const cached = await this.cache.get<ConversionReportData>(cacheKey);
    if (cached) {
      return cached;
    }

    const [
      totalCreated,
      byStageRaw,
      closedWon,
      closedLost,
      revenueWon,
      lostReasons,
      bySource,
      agentPerformance,
      closedWonLeads,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { createdAt: { gte: from, lte: to }, deletedAt: null },
      }),
      this.prisma.pipelineStageHistory.groupBy({
        by: ['toStage'],
        where: { movedAt: { gte: from, lte: to } },
        _count: { leadId: true },
      }),
      this.prisma.lead.count({
        where: {
          stage: PipelineStage.CLOSED_WON,
          convertedAt: { gte: from, lte: to },
        },
      }),
      this.prisma.lead.count({
        where: {
          stage: PipelineStage.CLOSED_LOST,
          updatedAt: { gte: from, lte: to },
        },
      }),
      this.prisma.lead.aggregate({
        where: {
          stage: PipelineStage.CLOSED_WON,
          convertedAt: { gte: from, lte: to },
        },
        _sum: { estimatedValue: true },
      }),
      this.prisma.lead.groupBy({
        by: ['lostReason'],
        where: {
          stage: PipelineStage.CLOSED_LOST,
          updatedAt: { gte: from, lte: to },
          lostReason: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: {
          stage: PipelineStage.CLOSED_WON,
          convertedAt: { gte: from, lte: to },
        },
        _count: { id: true },
        _sum: { estimatedValue: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: {
          stage: PipelineStage.CLOSED_WON,
          convertedAt: { gte: from, lte: to },
          assignedTo: { not: null },
        },
        _count: { id: true },
        _sum: { estimatedValue: true },
        orderBy: { _sum: { estimatedValue: 'desc' } },
      }),
      this.prisma.lead.findMany({
        where: {
          stage: PipelineStage.CLOSED_WON,
          convertedAt: { gte: from, lte: to },
        },
        select: { createdAt: true, convertedAt: true },
      }),
    ]);

    const totalClosed = closedWon + closedLost;
    const conversionRate =
      totalClosed > 0
        ? Number(((closedWon / totalClosed) * 100).toFixed(2))
        : 0;

    const totalRevenue = Number(revenueWon._sum.estimatedValue ?? 0);
    const avgDealValue =
      closedWon > 0 ? Number((totalRevenue / closedWon).toFixed(2)) : 0;

    const avgDaysToClose =
      closedWonLeads.length > 0
        ? Math.round(
            closedWonLeads.reduce((sum, lead) => {
              if (!lead.convertedAt) return sum;
              const days =
                (lead.convertedAt.getTime() - lead.createdAt.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / closedWonLeads.length,
          )
        : 0;

    const agentIds = agentPerformance
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

    const report: ConversionReportData = {
      period: { from: from.toISOString(), to: to.toISOString() },
      funnel: {
        totalCreated,
        byStage: Object.fromEntries(
          byStageRaw.map((row) => [row.toStage, row._count.leadId]),
        ),
        closedWon,
        closedLost,
      },
      metrics: {
        conversionRate,
        totalRevenue,
        avgDealValue,
        totalClosed,
        avgDaysToClose,
      },
      lostReasons: lostReasons
        .filter((row) => row.lostReason)
        .map((row) => ({
          reason: row.lostReason as string,
          count: row._count.id,
        })),
      bySource: bySource.map((row) => ({
        source: row.source,
        count: row._count.id,
        revenue: Number(row._sum.estimatedValue ?? 0),
      })),
      agentPerformance: agentPerformance
        .filter((row) => row.assignedTo)
        .map((row) => ({
          agentId: row.assignedTo as string,
          agentName:
            agentNameMap.get(row.assignedTo as string) ?? 'Unknown',
          dealsWon: row._count.id,
          revenue: Number(row._sum.estimatedValue ?? 0),
        })),
    };

    await this.cache.set(cacheKey, report, CONVERSION_TTL_SECONDS);
    return report;
  }

  async invalidateConversionCache(): Promise<void> {
    await this.cache.delByPrefix(CONVERSION_CACHE_PREFIX);
  }
}
