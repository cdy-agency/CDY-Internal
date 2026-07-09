import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SalesCampaignStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';
import { CreateSalesCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  async create(dto: CreateSalesCampaignDto, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found in CRM');

    const totalCost = dto.totalCost ? parseFloat(dto.totalCost) : null;
    const currency = dto.currency ?? 'RWF';

    const campaign = await this.prisma.salesCampaign.create({
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
        totalCost: totalCost ?? undefined,
        currency,
        notes: dto.notes,
        status: SalesCampaignStatus.ACTIVE,
        createdBy: userId,
      },
      include: { client: { select: { companyName: true } } },
    });

    if (totalCost && totalCost > 0) {
      setImmediate(() => {
        this.createDraftInvoice(campaign.id, dto.clientId, campaign.name, totalCost, currency, userId)
          .catch((err: unknown) => this.logger.error('Auto-invoice failed for sales campaign', err));
      });
    }

    return campaign;
  }

  private async createDraftInvoice(
    campaignId: string,
    clientId: string,
    campaignName: string,
    totalCost: number,
    currency: string,
    userId: string,
  ): Promise<void> {
    const invoiceNumber = await this.invoiceNumberService.generate();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        status: 'DRAFT',
        lineItems: [{ description: campaignName, quantity: 1, unitPrice: totalCost, amount: totalCost }],
        subtotal: totalCost,
        taxRate: 0,
        taxAmount: 0,
        total: totalCost,
        currency,
        dueDate,
        creditTermsDays: 30,
        serviceType: 'sales',
        createdBy: userId,
      },
    });

    await this.prisma.salesCampaign.update({
      where: { id: campaignId },
      data: { invoiceId: invoice.id },
    });

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: 'SYSTEM',
      title: `Draft invoice created — ${campaignName}`,
      body: `A DRAFT invoice for sales campaign "${campaignName}" has been created. Please review.`,
      link: `/finance/invoices/${invoice.id}`,
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

  async remove(id: string) {
    const campaign = await this.prisma.salesCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    await this.prisma.salesCampaign.delete({ where: { id } });
    return { message: 'Campaign deleted' };
  }
}
