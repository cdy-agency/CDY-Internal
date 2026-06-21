import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CampaignStatus, DeliverableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  async create(dto: CreateCampaignDto, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found in CRM');

    const totalCost = dto.totalCost ? parseFloat(dto.totalCost) : null;
    const currency = dto.currency ?? 'RWF';

    const campaign = await this.prisma.influencerCampaign.create({
      data: {
        clientId: dto.clientId,
        projectId: dto.projectId,
        name: dto.name,
        brief: dto.brief,
        platforms: dto.platforms,
        budget: dto.budget ? dto.budget : undefined,
        currency,
        totalCost: totalCost ?? undefined,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
        status: CampaignStatus.ACTIVE,
        createdBy: userId,
      },
      include: { client: { select: { companyName: true } } },
    });

    if (totalCost && totalCost > 0) {
      setImmediate(() => {
        this.createDraftInvoice(campaign.id, dto.clientId, campaign.name, totalCost, currency, userId)
          .catch((err: unknown) => this.logger.error('Auto-invoice failed for influencer campaign', err));
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
        serviceType: 'influencer',
        createdBy: userId,
      },
    });

    await this.prisma.influencerCampaign.update({
      where: { id: campaignId },
      data: { invoiceId: invoice.id },
    });

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: 'SYSTEM',
      title: `Draft invoice created — ${campaignName}`,
      body: `A DRAFT invoice for influencer campaign "${campaignName}" has been created. Please review.`,
      link: `/finance/invoices/${invoice.id}`,
    });
  }

  async findAll() {
    return this.prisma.influencerCampaign.findMany({
      where: { status: { not: CampaignStatus.CANCELLED } },
      include: {
        client: { select: { companyName: true } },
        influencers: {
          select: {
            id: true,
            isPaid: true,
            agreedFee: true,
            deliverables: { select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.influencerCampaign.findUnique({
      where: { id },
      include: {
        client: true,
        influencers: {
          include: {
            influencer: true,
            deliverables: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException();
    return campaign;
  }

  async complete(id: string, userId: string) {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Campaign is already completed');
    }

    const allDeliverables = campaign.influencers.flatMap(
      (i) => i.deliverables,
    );
    const unverified = allDeliverables.filter(
      (d) =>
        d.status === DeliverableStatus.PENDING ||
        d.status === DeliverableStatus.SUBMITTED,
    );

    const unpaid = campaign.influencers.filter(
      (i) => !i.isPaid && i.agreedFee,
    );

    const updated = await this.prisma.influencerCampaign.update({
      where: { id },
      data: {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: 'SYSTEM',
      title: `Campaign completed — ${campaign.name}`,
      body: `${campaign.client.companyName} influencer campaign is complete.${
        unpaid.length > 0
          ? ` ${unpaid.length} influencer${unpaid.length > 1 ? 's' : ''} still unpaid.`
          : ''
      }`,
      link: `/influencer/${id}`,
    });

    return {
      campaign: updated,
      warnings: [
        ...(unverified.length > 0
          ? [
              `${unverified.length} deliverable${unverified.length > 1 ? 's' : ''} not yet verified`,
            ]
          : []),
        ...(unpaid.length > 0
          ? [
              `${unpaid.length} influencer${unpaid.length > 1 ? 's' : ''} not yet paid`,
            ]
          : []),
      ],
    };
  }

  async update(
    id: string,
    data: { status?: CampaignStatus; notes?: string },
  ) {
    return this.prisma.influencerCampaign.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }
}
