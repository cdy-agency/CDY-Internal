import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SalesCampaignStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeployAgentDto } from './dto/deploy-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async deploy(campaignId: string, dto: DeployAgentDto) {
    const campaign = await this.prisma.salesCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== SalesCampaignStatus.ACTIVE) {
      throw new BadRequestException(
        'Can only deploy agents to active campaigns',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found in HR records');

    const existing = await this.prisma.salesAgent.findUnique({
      where: {
        campaignId_employeeId: { campaignId, employeeId: dto.employeeId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'This employee is already deployed on this campaign',
      );
    }

    return this.prisma.salesAgent.create({
      data: {
        campaignId,
        employeeId: dto.employeeId,
        territory: dto.territory,
        visitTarget: dto.visitTarget,
        leadTarget: dto.leadTarget,
        salesTarget: dto.salesTarget,
      },
      include: { campaign: { select: { name: true } } },
    });
  }

  async remove(agentId: string) {
    const logCount = await this.prisma.dailyActivityLog.count({
      where: { agentId },
    });

    if (logCount > 0) {
      return this.prisma.salesAgent.update({
        where: { id: agentId },
        data: { isActive: false },
      });
    }

    return this.prisma.salesAgent.delete({ where: { id: agentId } });
  }

  async getAgentPerformance(agentId: string, from?: Date, to?: Date) {
    const agent = await this.prisma.salesAgent.findUnique({
      where: { id: agentId },
      include: { campaign: { select: { name: true } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const logs = await this.prisma.dailyActivityLog.findMany({
      where: {
        agentId,
        ...(from && to && { date: { gte: from, lte: to } }),
      },
      orderBy: { date: 'desc' },
    });

    const totals = logs.reduce(
      (acc, log) => ({
        visits: acc.visits + log.visitsCount,
        leads: acc.leads + log.leadsCount,
        sales: acc.sales + log.salesCount,
        amount: acc.amount + Number(log.salesAmount ?? 0),
      }),
      { visits: 0, leads: 0, sales: 0, amount: 0 },
    );

    const daysLogged = logs.length;

    return {
      agent,
      totals,
      daysLogged,
      avgVisitsPerDay:
        daysLogged > 0
          ? Number((totals.visits / daysLogged).toFixed(1))
          : 0,
      avgLeadsPerDay:
        daysLogged > 0
          ? Number((totals.leads / daysLogged).toFixed(1))
          : 0,
      logs,
    };
  }
}
