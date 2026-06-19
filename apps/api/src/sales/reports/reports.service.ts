import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateWeeklyReportDto } from './dto/generate-weekly-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateWeeklyReport(
    campaignId: string,
    dto: GenerateWeeklyReportDto,
    userId: string,
  ) {
    const weekStart = new Date(dto.weekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const existing = await this.prisma.weeklyReport.findUnique({
      where: {
        campaignId_weekNumber: { campaignId, weekNumber: dto.weekNumber },
      },
    });

    if (existing) {
      return this.prisma.weeklyReport.update({
        where: { id: existing.id },
        data: {
          highlights: dto.highlights,
          challenges: dto.challenges,
          nextWeekPlan: dto.nextWeekPlan,
          generatedAt: new Date(),
          generatedBy: userId,
        },
      });
    }

    const [weeklyTotals, activeAgentsGroup] = await Promise.all([
      this.prisma.dailyActivityLog.aggregate({
        where: { campaignId, date: { gte: weekStart, lte: weekEnd } },
        _sum: {
          visitsCount: true,
          leadsCount: true,
          salesCount: true,
          salesAmount: true,
        },
      }),
      this.prisma.dailyActivityLog.groupBy({
        by: ['employeeId'],
        where: { campaignId, date: { gte: weekStart, lte: weekEnd } },
      }),
    ]);

    return this.prisma.weeklyReport.create({
      data: {
        campaignId,
        weekStart,
        weekEnd,
        weekNumber: dto.weekNumber,
        totalVisits: weeklyTotals._sum.visitsCount ?? 0,
        totalLeads: weeklyTotals._sum.leadsCount ?? 0,
        totalSales: weeklyTotals._sum.salesCount ?? 0,
        totalSalesAmount: weeklyTotals._sum.salesAmount,
        activeAgents: activeAgentsGroup.length,
        highlights: dto.highlights,
        challenges: dto.challenges,
        nextWeekPlan: dto.nextWeekPlan,
        generatedBy: userId,
      },
    });
  }

  async getReports(campaignId: string) {
    return this.prisma.weeklyReport.findMany({
      where: { campaignId },
      orderBy: { weekNumber: 'desc' },
    });
  }

  async getClientReport(campaignId: string, weekNumber?: number) {
    const campaign = await this.prisma.salesCampaign.findUnique({
      where: { id: campaignId },
      include: { client: { select: { companyName: true } } },
    });
    if (!campaign) throw new NotFoundException();

    const reports = await this.prisma.weeklyReport.findMany({
      where: {
        campaignId,
        ...(weekNumber && { weekNumber }),
      },
      orderBy: { weekNumber: 'desc' },
    });

    const campaignTotals = await this.prisma.dailyActivityLog.aggregate({
      where: { campaignId },
      _sum: {
        visitsCount: true,
        leadsCount: true,
        salesCount: true,
        salesAmount: true,
      },
    });

    return {
      campaign: {
        name: campaign.name,
        client: campaign.client.companyName,
        productService: campaign.productService,
        territory: campaign.territory,
        startDate: campaign.startDate,
        targets: {
          visits: campaign.visitTarget,
          leads: campaign.leadTarget,
          sales: campaign.salesTarget,
        },
      },
      campaignTotals: {
        visits: campaignTotals._sum.visitsCount ?? 0,
        leads: campaignTotals._sum.leadsCount ?? 0,
        sales: campaignTotals._sum.salesCount ?? 0,
        amount: Number(campaignTotals._sum.salesAmount ?? 0),
      },
      weeklyReports: reports,
    };
  }
}
