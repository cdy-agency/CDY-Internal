import { Injectable, Logger } from '@nestjs/common';
import {
  BrandingStatus,
  CampaignStatus,
  ClientService,
  InvoiceStatus,
  ProjectPriority,
  ProjectStatus,
  RetainerStatus,
  SalesCampaignStatus,
  SoftwarePhase,
  SoftwareProjectType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';

interface SetupContext {
  clientName: string;
  leadId?: string;
  managerId?: string;
  ventureId?: string;
}

@Injectable()
export class ClientServiceService {
  private readonly logger = new Logger(ClientServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  async setupClientService(
    clientId: string,
    service: ClientService,
    serviceValue: number | null,
    currency: string,
    userId: string,
    context: SetupContext,
  ): Promise<void> {
    setImmediate(() => {
      void this.run(clientId, service, serviceValue, currency, userId, context).catch(
        (err: unknown) => {
          this.logger.error(
            `Failed to auto-create service for client ${clientId}`,
            String(err),
          );
        },
      );
    });
  }

  private async run(
    clientId: string,
    service: ClientService,
    serviceValue: number | null,
    currency: string,
    userId: string,
    ctx: SetupContext,
  ): Promise<void> {
    switch (service) {
      case ClientService.SOFTWARE_DEV:
        await this.createSoftwareProject(clientId, serviceValue, currency, userId, ctx);
        break;
      case ClientService.BRANDING:
        await this.createBrandingProject(clientId, serviceValue, currency, userId, ctx);
        break;
      case ClientService.SOCIAL_MEDIA:
        await this.createDraftRetainer(clientId, serviceValue, currency, userId, ctx);
        break;
      case ClientService.INFLUENCER_MARKETING:
        await this.createInfluencerCampaign(clientId, serviceValue, currency, userId, ctx);
        break;
      case ClientService.SALES_SERVICES:
        await this.createSalesCampaign(clientId, serviceValue, currency, userId, ctx);
        break;
      case ClientService.GENERAL:
        await this.createGeneralProject(clientId, serviceValue, currency, userId, ctx);
        break;
    }
  }

  // ── SOFTWARE DEV ──────────────────────────────────────────────────────────

  private async createSoftwareProject(
    clientId: string,
    serviceValue: number | null,
    currency: string,
    userId: string,
    ctx: SetupContext,
  ): Promise<void> {
    const project = await this.prisma.softwareProject.create({
      data: {
        clientId,
        name: `${ctx.clientName} — Software Project`,
        projectType: SoftwareProjectType.WEBSITE,
        phase: SoftwarePhase.REQUIREMENTS,
        totalCost: serviceValue ?? undefined,
        currency,
        startDate: new Date(),
        isActive: true,
        createdBy: userId,
      },
    });

    await this.prisma.client.update({
      where: { id: clientId },
      data: { softwareProjectId: project.id },
    });

    if (serviceValue && serviceValue > 0) {
      await this.createDraftInvoice({
        clientId,
        serviceType: 'software_dev',
        description: `${ctx.clientName} — Software Development`,
        amount: serviceValue,
        currency,
        notes: 'Auto-created from client registration. Linked to software project.',
        userId,
        ventureId: ctx.ventureId,
      });
    }

    void this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `Software project created — ${ctx.clientName}`,
      body: `New software project set up for ${ctx.clientName}. Requirements phase started.`,
      link: `/software/${project.id}`,
    });
  }

  // ── BRANDING ─────────────────────────────────────────────────────────────

  private async createBrandingProject(
    clientId: string,
    serviceValue: number | null,
    currency: string,
    userId: string,
    ctx: SetupContext,
  ): Promise<void> {
    const project = await this.prisma.brandingProject.create({
      data: {
        clientId,
        name: `${ctx.clientName} — Brand Identity`,
        status: BrandingStatus.IN_PROGRESS,
        totalCost: serviceValue ?? undefined,
        currency,
        createdBy: userId,
      },
    });

    await this.prisma.client.update({
      where: { id: clientId },
      data: { brandingProjectId: project.id },
    });

    if (serviceValue && serviceValue > 0) {
      await this.createDraftInvoice({
        clientId,
        serviceType: 'branding',
        description: `${ctx.clientName} — Branding Services`,
        amount: serviceValue,
        currency,
        notes: 'Auto-created from client registration. Linked to branding project.',
        userId,
        ventureId: ctx.ventureId,
      });
    }

    void this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `Branding project created — ${ctx.clientName}`,
      body: `New branding project set up for ${ctx.clientName}.`,
      link: `/branding/${project.id}`,
    });
  }

  // ── SOCIAL MEDIA — draft retainer, Finance Manager must activate ──────────

  private async createDraftRetainer(
    clientId: string,
    serviceValue: number | null,
    currency: string,
    userId: string,
    ctx: SetupContext,
  ): Promise<void> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const retainer = await this.prisma.retainerContract.create({
      data: {
        clientId,
        serviceName: `${ctx.clientName} — Social Media Management`,
        description:
          'Auto-created from client registration. Review monthly amount and activate when ready.',
        amount: serviceValue ?? 0,
        currency,
        billingDayOfMonth: 1,
        startDate: now,
        nextBillingDate: nextMonth,
        status: RetainerStatus.DRAFT,
        createdBy: userId,
      },
    });

    void this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: 'SYSTEM',
      title: `New retainer needs review — ${ctx.clientName}`,
      body:
        `A draft Social Media retainer has been created for ${ctx.clientName}` +
        (serviceValue ? ` for ${currency} ${serviceValue.toLocaleString()}/month` : '') +
        '. Review the amount and activate it to start billing.',
      link: `/finance/retainers/${retainer.id}`,
    });

    void this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `Set up marketing client — ${ctx.clientName}`,
      body:
        `${ctx.clientName} signed for Social Media Marketing. A draft retainer has been created. ` +
        'Once Finance activates it, set up the marketing client at /marketing.',
      link: `/finance/retainers/${retainer.id}`,
    });
  }

  // ── INFLUENCER MARKETING ──────────────────────────────────────────────────

  private async createInfluencerCampaign(
    clientId: string,
    serviceValue: number | null,
    currency: string,
    userId: string,
    ctx: SetupContext,
  ): Promise<void> {
    const campaign = await this.prisma.influencerCampaign.create({
      data: {
        clientId,
        name: `${ctx.clientName} — Influencer Campaign`,
        platforms: [],
        totalCost: serviceValue ?? undefined,
        currency,
        startDate: new Date(),
        status: CampaignStatus.ACTIVE,
        createdBy: userId,
      },
    });

    await this.prisma.client.update({
      where: { id: clientId },
      data: { influencerCampaignId: campaign.id },
    });

    if (serviceValue && serviceValue > 0) {
      await this.createDraftInvoice({
        clientId,
        serviceType: 'influencer_marketing',
        description: `${ctx.clientName} — Influencer Marketing Campaign`,
        amount: serviceValue,
        currency,
        notes: 'Auto-created from client registration. Linked to influencer campaign.',
        userId,
        ventureId: ctx.ventureId,
      });
    }

    void this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `Influencer campaign created — ${ctx.clientName}`,
      body: `New influencer campaign set up for ${ctx.clientName}. Add influencers and deliverables.`,
      link: `/influencer/${campaign.id}`,
    });
  }

  // ── SALES SERVICES ────────────────────────────────────────────────────────

  private async createSalesCampaign(
    clientId: string,
    serviceValue: number | null,
    currency: string,
    userId: string,
    ctx: SetupContext,
  ): Promise<void> {
    const campaign = await this.prisma.salesCampaign.create({
      data: {
        clientId,
        name: `${ctx.clientName} — Field Sales Campaign`,
        productService: 'To be defined',
        totalCost: serviceValue ?? undefined,
        currency,
        startDate: new Date(),
        status: SalesCampaignStatus.ACTIVE,
        createdBy: userId,
      },
    });

    await this.prisma.client.update({
      where: { id: clientId },
      data: { salesCampaignId: campaign.id },
    });

    if (serviceValue && serviceValue > 0) {
      await this.createDraftInvoice({
        clientId,
        serviceType: 'sales_services',
        description: `${ctx.clientName} — Field Sales Services`,
        amount: serviceValue,
        currency,
        notes: 'Auto-created from client registration. Linked to sales campaign.',
        userId,
        ventureId: ctx.ventureId,
      });
    }

    void this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `Sales campaign created — ${ctx.clientName}`,
      body: `New field sales campaign set up for ${ctx.clientName}. Deploy agents to start.`,
      link: `/sales/${campaign.id}`,
    });
  }

  // ── GENERAL PROJECT ───────────────────────────────────────────────────────

  private async createGeneralProject(
    clientId: string,
    serviceValue: number | null,
    currency: string,
    userId: string,
    ctx: SetupContext,
  ): Promise<void> {
    const projectCode = await this.generateProjectCode();

    const project = await this.prisma.project.create({
      data: {
        projectCode,
        name: `${ctx.clientName} — Project`,
        clientId,
        serviceType: 'general',
        status: ProjectStatus.ACTIVE,
        priority: ProjectPriority.MEDIUM,
        managerId: ctx.managerId ?? userId,
        startDate: new Date(),
        totalCost: serviceValue ?? undefined,
        currency,
        createdBy: userId,
      },
    });

    await this.prisma.client.update({
      where: { id: clientId },
      data: { projectId: project.id },
    });

    if (serviceValue && serviceValue > 0) {
      await this.createDraftInvoice({
        clientId,
        serviceType: 'general',
        description: `${ctx.clientName} — Project`,
        amount: serviceValue,
        currency,
        notes: 'Auto-created from client registration.',
        userId,
        ventureId: ctx.ventureId,
      });
    }

    void this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `New project created — ${ctx.clientName}`,
      body: `Project ${projectCode} set up for ${ctx.clientName}.`,
      link: `/projects/${project.id}`,
    });
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private async createDraftInvoice(data: {
    clientId: string;
    serviceType: string;
    description: string;
    amount: number;
    currency: string;
    notes: string;
    userId: string;
    ventureId?: string;
  }): Promise<void> {
    const invoiceNumber = await this.invoiceNumberService.generate();
    await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: data.clientId,
        ventureId: data.ventureId ?? null,
        serviceType: data.serviceType,
        lineItems: [
          {
            description: data.description,
            quantity: 1,
            unitPrice: data.amount,
            amount: data.amount,
          },
        ],
        subtotal: data.amount,
        taxRate: 0,
        taxAmount: 0,
        total: data.amount,
        currency: data.currency,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: InvoiceStatus.DRAFT,
        notes: data.notes,
        createdBy: data.userId,
      },
    });
  }

  private async generateProjectCode(): Promise<string> {
    const count = await this.prisma.project.count();
    return `CDY-PRJ-${String(count + 1).padStart(3, '0')}`;
  }
}
