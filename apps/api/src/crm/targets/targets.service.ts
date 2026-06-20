import { Injectable, NotFoundException } from '@nestjs/common';
import { PipelineStage } from '@prisma/client';
import {
  endOfMonth,
  format,
  parse,
  startOfMonth,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { SetTargetDto } from './dto/set-target.dto';
import { UpdateTargetDto } from './dto/update-target.dto';

function currentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

function parseMonth(month: string): Date {
  return parse(month, 'yyyy-MM', new Date());
}

@Injectable()
export class TargetsService {
  constructor(private readonly prisma: PrismaService) {}

  async setTarget(dto: SetTargetDto, setBy: string) {
    return this.prisma.salesTarget.upsert({
      where: {
        agentId_month: { agentId: dto.agentId, month: dto.month },
      },
      create: {
        agentId: dto.agentId,
        month: dto.month,
        revenueTarget: dto.revenueTarget,
        dealsTarget: dto.dealsTarget,
        currency: dto.currency ?? 'RWF',
        setBy,
      },
      update: {
        revenueTarget: dto.revenueTarget,
        dealsTarget: dto.dealsTarget,
        currency: dto.currency ?? 'RWF',
        setBy,
      },
    });
  }

  async updateTarget(id: string, dto: UpdateTargetDto, setBy: string) {
    const existing = await this.prisma.salesTarget.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Target not found');
    }

    return this.prisma.salesTarget.update({
      where: { id },
      data: {
        ...(dto.revenueTarget !== undefined && {
          revenueTarget: dto.revenueTarget,
        }),
        ...(dto.dealsTarget !== undefined && { dealsTarget: dto.dealsTarget }),
        ...(dto.currency && { currency: dto.currency }),
        setBy,
      },
    });
  }

  async getTarget(agentId: string, month: string) {
    return this.prisma.salesTarget.findUnique({
      where: { agentId_month: { agentId, month } },
    });
  }

  async getMonthlyTargets(month: string) {
    const targets = await this.prisma.salesTarget.findMany({
      where: { month },
    });

    const monthStart = startOfMonth(parseMonth(month));
    const monthEnd = endOfMonth(monthStart);

    const performance = await this.prisma.lead.groupBy({
      by: ['assignedTo'],
      where: {
        stage: PipelineStage.CLOSED_WON,
        convertedAt: { gte: monthStart, lte: monthEnd },
        assignedTo: { not: null },
      },
      _count: { id: true },
      _sum: { estimatedValue: true },
    });

    const perfByAgent = Object.fromEntries(
      performance
        .filter((row) => row.assignedTo)
        .map((row) => [
          row.assignedTo as string,
          {
            dealsWon: row._count.id,
            revenueWon: Number(row._sum.estimatedValue ?? 0),
          },
        ]),
    );

    const agentIds = [
      ...new Set([
        ...targets.map((t) => t.agentId),
        ...Object.keys(perfByAgent),
      ]),
    ];

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

    const commissions = await this.prisma.commissionRecord.findMany({
      where: { month },
      select: {
        agentId: true,
        calculatedAmount: true,
        adjustedAmount: true,
      },
    });

    const commissionByAgent = new Map<string, number>();
    for (const record of commissions) {
      const amount = Number(record.adjustedAmount ?? record.calculatedAmount);
      commissionByAgent.set(
        record.agentId,
        (commissionByAgent.get(record.agentId) ?? 0) + amount,
      );
    }

    const targetAgentIds = new Set(targets.map((t) => t.agentId));
    const allAgentIds = [
      ...new Set([...targetAgentIds, ...Object.keys(perfByAgent)]),
    ];

    return allAgentIds.map((agentId) => {
      const target = targets.find((t) => t.agentId === agentId) ?? null;
      const actual = perfByAgent[agentId] ?? { dealsWon: 0, revenueWon: 0 };
      const revenueTarget = target ? Number(target.revenueTarget) : 0;
      const dealsTarget = target?.dealsTarget ?? 0;

      return {
        ...(target ?? {
          id: null,
          agentId,
          month,
          revenueTarget: 0,
          dealsTarget: 0,
          currency: 'RWF',
          setBy: null,
          createdAt: null,
          updatedAt: null,
        }),
        agentName: agentNameMap.get(agentId) ?? 'Unknown',
        actual,
        revenueProgress:
          revenueTarget > 0
            ? Math.round((actual.revenueWon / revenueTarget) * 100)
            : 0,
        dealsProgress:
          dealsTarget > 0
            ? Math.round((actual.dealsWon / dealsTarget) * 100)
            : 0,
        commissionTotal: commissionByAgent.get(agentId) ?? 0,
      };
    });
  }

  async getAgentDashboard(agentId: string, month: string) {
    const monthDate = parseMonth(month);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const target = await this.getTarget(agentId, month);

    const closedDeals = await this.prisma.lead.findMany({
      where: {
        assignedTo: agentId,
        stage: PipelineStage.CLOSED_WON,
        convertedAt: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        companyName: true,
        estimatedValue: true,
        convertedAt: true,
        serviceInterest: true,
      },
    });

    const revenueWon = closedDeals.reduce(
      (sum, deal) => sum + Number(deal.estimatedValue ?? 0),
      0,
    );

    const openLeads = await this.prisma.lead.count({
      where: {
        assignedTo: agentId,
        stage: {
          notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
        },
        deletedAt: null,
      },
    });

    const pipelineValue = await this.prisma.lead.aggregate({
      where: {
        assignedTo: agentId,
        stage: {
          notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
        },
        deletedAt: null,
      },
      _sum: { estimatedValue: true },
    });

    const commissionRecords = await this.prisma.commissionRecord.findMany({
      where: { agentId, month },
      select: {
        id: true,
        dealId: true,
        dealValue: true,
        ratePercent: true,
        calculatedAmount: true,
        adjustedAmount: true,
        status: true,
      },
    });

    const dealIds = commissionRecords.map((c) => c.dealId);
    const dealLeads =
      dealIds.length > 0
        ? await this.prisma.lead.findMany({
            where: { id: { in: dealIds } },
            select: { id: true, companyName: true },
          })
        : [];
    const dealNameMap = new Map(dealLeads.map((l) => [l.id, l.companyName]));

    const commissionTotal = commissionRecords.reduce(
      (sum, record) =>
        sum + Number(record.adjustedAmount ?? record.calculatedAmount),
      0,
    );

    const commissionApproved = commissionRecords
      .filter((record) => record.status === 'APPROVED')
      .reduce(
        (sum, record) =>
          sum + Number(record.adjustedAmount ?? record.calculatedAmount),
        0,
      );

    const activitiesByType = await this.prisma.leadActivity.groupBy({
      by: ['type'],
      where: {
        performedBy: agentId,
        performedAt: { gte: monthStart, lte: monthEnd },
      },
      _count: { id: true },
    });

    const activities = activitiesByType.reduce(
      (sum, row) => sum + row._count.id,
      0,
    );

    const overdueFollowUps = await this.prisma.leadActivity.count({
      where: {
        lead: {
          assignedTo: agentId,
          stage: {
            notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
          },
          deletedAt: null,
        },
        nextActionDate: { lt: new Date() },
        nextAction: { not: null },
      },
    });

    const overdueItems = await this.prisma.leadActivity.findMany({
      where: {
        lead: {
          assignedTo: agentId,
          stage: {
            notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
          },
          deletedAt: null,
        },
        nextActionDate: { lt: new Date() },
        nextAction: { not: null },
      },
      include: {
        lead: { select: { id: true, companyName: true } },
      },
      orderBy: { nextActionDate: 'asc' },
      take: 10,
      distinct: ['leadId'],
    });

    return {
      month,
      target: target ?? null,
      performance: {
        revenueWon,
        dealsWon: closedDeals.length,
        revenueProgress: target
          ? Math.round(
              (revenueWon / Number(target.revenueTarget)) * 100,
            )
          : null,
        dealsProgress: target
          ? Math.round((closedDeals.length / target.dealsTarget) * 100)
          : null,
      },
      closedDeals,
      pipeline: {
        openLeads,
        pipelineValue: Number(pipelineValue._sum.estimatedValue ?? 0),
      },
      commission: {
        total: commissionTotal,
        approved: commissionApproved,
        pending: commissionTotal - commissionApproved,
        records: commissionRecords.map((record) => ({
          ...record,
          dealValue: Number(record.dealValue),
          ratePercent: Number(record.ratePercent),
          calculatedAmount: Number(record.calculatedAmount),
          adjustedAmount: record.adjustedAmount
            ? Number(record.adjustedAmount)
            : null,
          companyName: dealNameMap.get(record.dealId) ?? 'Unknown',
        })),
      },
      activities,
      activitiesByType: Object.fromEntries(
        activitiesByType.map((row) => [row.type, row._count.id]),
      ),
      overdueFollowUps,
      overdueItems: overdueItems.map((item) => ({
        leadId: item.lead.id,
        companyName: item.lead.companyName,
        nextAction: item.nextAction ?? '',
        nextActionDate: item.nextActionDate?.toISOString() ?? '',
      })),
    };
  }

  resolveMonth(month?: string): string {
    return month ?? currentMonth();
  }
}
