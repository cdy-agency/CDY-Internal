import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BrandingStatus, ScopeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';
import { CreateBrandingProjectDto } from './dto/create-branding-project.dto';
import { CreateScopeItemDto } from './dto/create-scope-item.dto';

@Injectable()
export class BrandingProjectsService {
  private readonly logger = new Logger(BrandingProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  async create(dto: CreateBrandingProjectDto, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found in CRM');

    const totalCost = dto.totalCost ? parseFloat(dto.totalCost) : null;
    const currency = dto.currency ?? 'RWF';

    const project = await this.prisma.brandingProject.create({
      data: {
        clientId: dto.clientId,
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        notes: dto.notes,
        status: BrandingStatus.IN_PROGRESS,
        totalCost: totalCost ?? undefined,
        currency,
        createdBy: userId,
        ...(dto.scopeItems?.length && {
          scopeItems: {
            create: dto.scopeItems.map((item, index) => ({
              title: item.title,
              description: item.description,
              supplierId: item.supplierId,
              order: item.order ?? index,
              status: ScopeStatus.IN_PROGRESS,
            })),
          },
        }),
      },
      include: {
        client: { select: { companyName: true } },
        scopeItems: { orderBy: { order: 'asc' } },
      },
    });

    if (totalCost && totalCost > 0) {
      setImmediate(() => {
        this.createDraftInvoice(project.id, dto.clientId, project.name, totalCost, currency, userId)
          .catch((err: unknown) => this.logger.error('Auto-invoice failed for branding project', err));
      });
    }

    return project;
  }

  private async createDraftInvoice(
    projectId: string,
    clientId: string,
    projectName: string,
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
        projectId,
        status: 'DRAFT',
        lineItems: [{ description: projectName, quantity: 1, unitPrice: totalCost, amount: totalCost }],
        subtotal: totalCost,
        taxRate: 0,
        taxAmount: 0,
        total: totalCost,
        currency,
        dueDate,
        creditTermsDays: 30,
        serviceType: 'branding',
        createdBy: userId,
      },
    });

    await this.prisma.brandingProject.update({
      where: { id: projectId },
      data: { invoiceId: invoice.id },
    });

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: 'SYSTEM',
      title: `Draft invoice created — ${projectName}`,
      body: `A DRAFT invoice for ${projectName} has been created. Please review.`,
      link: `/finance/invoices/${invoice.id}`,
    });
  }

  async findAll() {
    return this.prisma.brandingProject.findMany({
      where: { status: { not: BrandingStatus.CANCELLED } },
      include: {
        client: { select: { companyName: true } },
        scopeItems: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.brandingProject.findUnique({
      where: { id },
      include: {
        client: true,
        scopeItems: {
          include: {
            supplier: true,
            submissions: { orderBy: { version: 'desc' } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException();
    return project;
  }

  async addScopeItem(projectId: string, dto: CreateScopeItemDto) {
    const project = await this.prisma.brandingProject.findUnique({
      where: { id: projectId },
      include: { scopeItems: true },
    });
    if (!project) throw new NotFoundException();

    if (project.status === BrandingStatus.DELIVERED) {
      throw new BadRequestException(
        'Cannot add scope items to a delivered project',
      );
    }

    const maxOrder = project.scopeItems.reduce(
      (max, item) => Math.max(max, item.order),
      -1,
    );

    return this.prisma.brandingScopeItem.create({
      data: {
        brandingProjectId: projectId,
        title: dto.title,
        description: dto.description,
        supplierId: dto.supplierId,
        order: maxOrder + 1,
        status: ScopeStatus.IN_PROGRESS,
      },
    });
  }

  async markDelivered(id: string, userId: string) {
    const project = await this.findOne(id);

    if (project.status === BrandingStatus.DELIVERED) {
      throw new BadRequestException('Project is already delivered');
    }

    const unapproved = project.scopeItems.filter(
      (item) =>
        item.status !== ScopeStatus.APPROVED &&
        item.status !== ScopeStatus.DELIVERED,
    );

    const updated = await this.prisma.brandingProject.update({
      where: { id },
      data: {
        status: BrandingStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });

    await this.prisma.brandingScopeItem.updateMany({
      where: { brandingProjectId: id, status: ScopeStatus.APPROVED },
      data: { status: ScopeStatus.DELIVERED, deliveredAt: new Date() },
    });

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: 'SYSTEM',
      title: `Branding project delivered — ${project.name}`,
      body: `${project.client.companyName} branding project has been marked as delivered. Review for final invoice.`,
      link: `/branding/${id}`,
    });

    return {
      project: updated,
      warning:
        unapproved.length > 0
          ? `${unapproved.length} scope item${unapproved.length > 1 ? 's were' : ' was'} not yet approved at delivery`
          : null,
    };
  }
}
