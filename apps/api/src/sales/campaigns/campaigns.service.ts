import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SalesCampaignStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateSalesCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateSalesCampaignDto, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found in CRM');

    return this.prisma.salesCampaign.create({
      data: {
        clientId: dto.clientId,
        projectId: dto.projectId,
        name: dto.name,
        productService: dto.productService,
        territory: dto.territory,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        visitTarget: dto.visitTarget,
        leadTarget: dto.leadTarget,
        salesTarget: dto.salesTarget,
        notes: dto.notes,
        status: SalesCampaignStatus.ACTIVE,
        createdBy: userId,
      },
      include: { client: { select: { companyName: true } } },
    });
  }

  async findAll() {
    return this.prisma.salesCampaign.findMany({
      where: { status: { not: SalesCampaignStatus.CANCELLED } },
      include: {
        client: { select: { companyName: true } },
        _count: { select: { agents: true, dailyLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.salesCampaign.findUnique({
      where: { id },
      include: {
        client: true,
        agents: {
          where: { isActive: true },
          include: {
            dailyLogs: {
              orderBy: { date: 'desc' },
              take: 7,
            },
          },
        },
        weeklyReports: { orderBy: { weekNumber: 'desc' } },
      },
    });
    if (!campaign) throw new NotFoundException();
    return campaign;
  }

  async update(id: string, data: { status?: SalesCampaignStatus; notes?: string }) {
    return this.prisma.salesCampaign.update({ where: { id }, data });
  }

  async complete(id: string, userId: string) {
    const campaign = await this.findOne(id);
    if (campaign.status === SalesCampaignStatus.COMPLETED) {
      throw new BadRequestException('Campaign is already completed');
    }

    const updated = await this.prisma.salesCampaign.update({
      where: { id },
      data: { status: SalesCampaignStatus.COMPLETED, completedAt: new Date() },
    });

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: 'SYSTEM',
      title: `Sales campaign completed — ${campaign.name}`,
      body: `${campaign.client.companyName} field sales campaign is complete. Review for final invoice.`,
      link: `/sales/${id}`,
    });

    return updated;
  }

  async getCampaignStats(id: string) {
    const [totals, byAgent] = await Promise.all([
      this.prisma.dailyActivityLog.aggregate({
        where: { campaignId: id },
        _sum: {
          visitsCount: true,
          leadsCount: true,
          salesCount: true,
          salesAmount: true,
        },
        _count: { id: true },
      }),
      this.prisma.dailyActivityLog.groupBy({
        by: ['employeeId'],
        where: { campaignId: id },
        _sum: {
          visitsCount: true,
          leadsCount: true,
          salesCount: true,
        },
      }),
    ]);

    return { totals, byAgent };
  }
}
