import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  Lead,
  NotificationType,
  PipelineStage,
  Prisma,
  ProposalStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadScoringService } from './lead-scoring.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { LeadFiltersDto } from './dto/lead-filters.dto';
import { CommissionsService } from '../../commissions/commissions.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CacheService } from '../../cache/cache.service';
import { CrmAuditService } from '../audit/crm-audit.service';
import { CrmSettingsService } from '../settings/crm-settings.service';
import { CrmActor } from '../common/crm-actor.interface';
import { buildCsvRow } from '../common/csv.util';
import { format } from 'date-fns';

const CRM_SUMMARY_CACHE_KEY = 'crm:summary';
const CONVERSION_CACHE_PREFIX = 'crm:conversion:';

const CLOSED_STAGES: PipelineStage[] = [
  PipelineStage.CLOSED_WON,
  PipelineStage.CLOSED_LOST,
];

const ACTIVE_PIPELINE_STAGES: PipelineStage[] = [
  PipelineStage.NEW,
  PipelineStage.CONTACTED,
  PipelineStage.PROPOSAL_SENT,
  PipelineStage.NEGOTIATION,
];

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadScoringService: LeadScoringService,
    private readonly commissionsService: CommissionsService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly notificationsService: NotificationsService,
    private readonly cache: CacheService,
    private readonly crmAuditService: CrmAuditService,
    private readonly crmSettingsService: CrmSettingsService,
  ) {}

  async invalidateSummaryCache(): Promise<void> {
    await this.cache.del(CRM_SUMMARY_CACHE_KEY);
  }

  async invalidateConversionCache(): Promise<void> {
    await this.cache.delByPrefix(CONVERSION_CACHE_PREFIX);
  }

  async create(dto: CreateLeadDto, actor: CrmActor): Promise<Lead> {
    const weights = await this.crmSettingsService.getScoreWeights();
    const qualityScore = this.leadScoringService.calculate({
      source: dto.source,
      estimatedValue: dto.estimatedValue,
      serviceInterest: dto.serviceInterest,
      hasPhone: Boolean(dto.phone),
      hasEmail: Boolean(dto.email),
      weights,
    });

    const lead = await this.prisma.lead.create({
      data: {
        contactName: dto.contactName,
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
        country: dto.country ?? 'RW',
        serviceInterest: dto.serviceInterest,
        source: dto.source,
        estimatedValue: dto.estimatedValue,
        currency: dto.currency ?? 'USD',
        assignedTo: dto.assignedTo,
        notes: dto.notes,
        qualityScore,
        createdBy: actor.userId,
      },
    });

    await this.prisma.pipelineStageHistory.create({
      data: {
        leadId: lead.id,
        fromStage: null,
        toStage: PipelineStage.NEW,
        movedBy: actor.userId,
      },
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'lead.created',
      entityType: 'Lead',
      entityId: lead.id,
      newValue: { companyName: lead.companyName, stage: lead.stage },
      ipAddress: actor.ipAddress,
    });

    await this.invalidateSummaryCache();

    return lead;
  }

  private buildWhereClause(
    filters: LeadFiltersDto,
    userId: string,
    roleKey: string,
  ): Prisma.LeadWhereInput {
    const agentFilter =
      roleKey === 'SALES_AGENT'
        ? { assignedTo: userId }
        : filters.assignedTo
          ? { assignedTo: filters.assignedTo }
          : {};

    const qualityScoreFilter: Prisma.IntNullableFilter = {};
    if (filters.minScore !== undefined) qualityScoreFilter.gte = filters.minScore;
    if (filters.maxScore !== undefined) qualityScoreFilter.lte = filters.maxScore;

    const estimatedValueFilter: Prisma.DecimalNullableFilter = {};
    if (filters.minValue !== undefined) estimatedValueFilter.gte = filters.minValue;
    if (filters.maxValue !== undefined) estimatedValueFilter.lte = filters.maxValue;

    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAtFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAtFilter.lte = end;
    }

    return {
      deletedAt: null,
      ...agentFilter,
      ...(filters.stage && { stage: filters.stage }),
      ...(filters.source && { source: filters.source }),
      ...(filters.serviceInterest && { serviceInterest: filters.serviceInterest }),
      ...(Object.keys(qualityScoreFilter).length > 0 && {
        qualityScore: qualityScoreFilter,
      }),
      ...(Object.keys(estimatedValueFilter).length > 0 && {
        estimatedValue: estimatedValueFilter,
      }),
      ...(Object.keys(createdAtFilter).length > 0 && { createdAt: createdAtFilter }),
      ...(filters.hasOverdueFollowUp === 'true' && {
        stage: { notIn: CLOSED_STAGES },
        activities: {
          some: {
            nextActionDate: { lt: new Date() },
            nextAction: { not: null },
          },
        },
      }),
      ...(filters.search && {
        OR: [
          { contactName: { contains: filters.search, mode: 'insensitive' } },
          { companyName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  async findAll(
    filters: LeadFiltersDto,
    userId: string,
    roleKey: string,
  ) {
    return this.prisma.lead.findMany({
      where: this.buildWhereClause(filters, userId, roleKey),
      include: {
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 1,
        },
        proposals: {
          where: { status: { not: ProposalStatus.REJECTED } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string, roleKey: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        activities: { orderBy: { performedAt: 'desc' } },
        proposals: { orderBy: { createdAt: 'desc' } },
        client: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (roleKey === 'SALES_AGENT' && lead.assignedTo !== userId) {
      throw new NotFoundException('Lead not found');
    }

    const stageHistory = await this.prisma.pipelineStageHistory.findMany({
      where: { leadId: id },
      orderBy: { movedAt: 'desc' },
    });

    const moverIds = [...new Set(stageHistory.map((h) => h.movedBy))];
    const movers =
      moverIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: moverIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const moverMap = new Map(
      movers.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
    );

    const latestWithFollowUp = lead.activities.find(
      (a) => a.nextActionDate && a.nextAction,
    );
    const now = new Date();
    const overdueFollowUp =
      latestWithFollowUp &&
      latestWithFollowUp.nextActionDate &&
      latestWithFollowUp.nextActionDate < now &&
      lead.stage !== PipelineStage.CLOSED_WON &&
      lead.stage !== PipelineStage.CLOSED_LOST
        ? {
            nextAction: latestWithFollowUp.nextAction ?? '',
            nextActionDate: latestWithFollowUp.nextActionDate.toISOString(),
            daysOverdue: Math.floor(
              (now.getTime() - latestWithFollowUp.nextActionDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          }
        : null;

    return {
      ...lead,
      stageHistory: stageHistory.map((h) => ({
        ...h,
        movedByName: moverMap.get(h.movedBy) ?? 'Unknown',
      })),
      overdueFollowUp,
    };
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    userId: string,
    roleKey: string,
    actor?: CrmActor,
  ) {
    const existing = await this.findOne(id, userId, roleKey);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.estimatedValue !== undefined && {
          estimatedValue: dto.estimatedValue,
        }),
      },
    });

    if (actor) {
      this.crmAuditService.log({
        userId: actor.userId,
        userEmail: actor.userEmail,
        action: 'lead.updated',
        entityType: 'Lead',
        entityId: id,
        previousValue: { companyName: existing.companyName },
        newValue: { companyName: lead.companyName },
        ipAddress: actor.ipAddress,
      });
    }

    await this.recalculateScore(id);
    await this.invalidateSummaryCache();
    return lead;
  }

  async softDelete(id: string, userId: string, roleKey: string, actor?: CrmActor) {
    const existing = await this.findOne(id, userId, roleKey);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (actor) {
      this.crmAuditService.log({
        userId: actor.userId,
        userEmail: actor.userEmail,
        action: 'lead.deleted',
        entityType: 'Lead',
        entityId: id,
        previousValue: { companyName: existing.companyName },
        ipAddress: actor.ipAddress,
      });
    }

    await this.invalidateSummaryCache();
    return lead;
  }

  async getPipelineBoard(userId: string, roleKey: string) {
    const agentFilter =
      roleKey === 'SALES_AGENT' ? { assignedTo: userId } : {};

    const leads = await this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: CLOSED_STAGES },
        ...agentFilter,
      },
      include: {
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return ACTIVE_PIPELINE_STAGES.map((stage) => {
      const stageLeads = leads.filter((l) => l.stage === stage);
      return {
        stage,
        leads: stageLeads,
        totalValue: stageLeads.reduce(
          (sum, l) => sum + Number(l.estimatedValue ?? 0),
          0,
        ),
        count: stageLeads.length,
      };
    });
  }

  async moveStage(
    id: string,
    dto: MoveStageDto,
    userId: string,
    roleKey: string,
    actor?: CrmActor,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (roleKey === 'SALES_AGENT' && lead.assignedTo !== userId) {
      throw new NotFoundException('Lead not found');
    }

    if (CLOSED_STAGES.includes(lead.stage)) {
      throw new BadRequestException(
        `Lead is already ${lead.stage.replace('_', ' ').toLowerCase()} and cannot be moved`,
      );
    }

    if (dto.stage === PipelineStage.CLOSED_LOST && !dto.lostReason) {
      throw new BadRequestException(
        'A reason is required when marking a lead as Closed Lost',
      );
    }

    if (dto.stage === PipelineStage.CLOSED_LOST && dto.lostReason) {
      const presets = await this.crmSettingsService.getLostReasons();
      if (
        presets.length > 0 &&
        !presets.includes(dto.lostReason) &&
        dto.lostReason !== 'Other'
      ) {
        this.logger.warn(`Non-preset lost reason used: ${dto.lostReason}`);
      }
    }

    const lastHistory = await this.prisma.pipelineStageHistory.findFirst({
      where: { leadId: id },
      orderBy: { movedAt: 'desc' },
    });

    const daysInPrev = lastHistory
      ? Math.floor(
          (Date.now() - lastHistory.movedAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    const updateData: Prisma.LeadUpdateInput = {
      stage: dto.stage,
      ...(dto.stage === PipelineStage.CLOSED_LOST && {
        lostReason: dto.lostReason,
      }),
      ...(dto.stage === PipelineStage.CLOSED_WON && {
        convertedAt: new Date(),
      }),
    };

    const [updatedLead] = await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id }, data: updateData }),
      this.prisma.pipelineStageHistory.create({
        data: {
          leadId: id,
          fromStage: lead.stage,
          toStage: dto.stage,
          movedBy: userId,
          daysInPrev,
        },
      }),
    ]);

    if (dto.stage === PipelineStage.CLOSED_WON) {
      setImmediate(() => {
        void this.handleDealClosed(updatedLead, userId).catch((err: unknown) => {
          this.logger.error(
            `Deal closed triggers failed for lead ${id}`,
            String(err),
          );
        });
      });
    }

    if (actor) {
      this.crmAuditService.log({
        userId: actor.userId,
        userEmail: actor.userEmail,
        action: 'lead.stage_moved',
        entityType: 'Lead',
        entityId: id,
        previousValue: { stage: lead.stage },
        newValue: { stage: dto.stage, lostReason: dto.lostReason },
        ipAddress: actor.ipAddress,
      });
    }

    await this.invalidateSummaryCache();
    await this.invalidateConversionCache();

    return updatedLead;
  }

  async recalculateScore(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const activityCount = await this.prisma.leadActivity.count({
      where: { leadId },
    });

    const weights = await this.crmSettingsService.getScoreWeights();
    const score = this.leadScoringService.calculate({
      source: lead.source,
      estimatedValue: lead.estimatedValue
        ? Number(lead.estimatedValue)
        : undefined,
      serviceInterest: lead.serviceInterest,
      hasPhone: Boolean(lead.phone),
      hasEmail: Boolean(lead.email),
      activityCount,
      weights,
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { qualityScore: score },
    });
  }

  async findSalesAgents() {
    return this.prisma.user.findMany({
      where: {
        role: { key: 'SALES_AGENT' },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  private async handleDealClosed(lead: Lead, userId: string): Promise<void> {
    let client = await this.prisma.client.findFirst({
      where: {
        OR: [
          { email: lead.email },
          {
            companyName: { equals: lead.companyName, mode: 'insensitive' },
          },
        ],
        deletedAt: null,
      },
    });

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          companyName: lead.companyName,
          contactName: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          country: lead.country,
          assignedTo: lead.assignedTo,
          createdBy: userId,
        },
      });
    }

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { clientId: client.id },
    });

    this.logger.log(`Client created/linked: ${client.id} for lead ${lead.id}`);

    if (lead.assignedTo && lead.estimatedValue) {
      await this.commissionsService.calculate({
        agentId: lead.assignedTo,
        dealId: lead.id,
        dealValue: Number(lead.estimatedValue),
        serviceType: lead.serviceInterest,
      });
      this.logger.log(`Commission triggered for agent ${lead.assignedTo}`);
    }

    if (lead.estimatedValue && Number(lead.estimatedValue) > 0) {
      const invoiceNumber = await this.invoiceNumberService.generate();
      const value = Number(lead.estimatedValue);

      await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          clientId: client.id,
          serviceType: lead.serviceInterest,
          lineItems: [
            {
              description: `${lead.serviceInterest.replace('_', ' ')} services — ${lead.companyName}`,
              quantity: 1,
              unitPrice: value,
              amount: value,
            },
          ],
          subtotal: value,
          taxRate: 0,
          taxAmount: 0,
          total: value,
          currency: lead.currency,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.DRAFT,
          createdBy: userId,
        },
      });
      this.logger.log(`Draft invoice ${invoiceNumber} created for lead ${lead.id}`);
    }

    const estimatedLabel = lead.estimatedValue
      ? `$${Number(lead.estimatedValue).toFixed(2)}`
      : '$0.00';

    await this.notificationsService.createForRole('FINANCE_MANAGER', {
      type: NotificationType.SYSTEM,
      title: `New client — ${client.companyName}`,
      body: `Deal closed by ${lead.assignedTo ? 'sales agent' : 'team'}. Draft invoice created for ${estimatedLabel}. Review and send when ready.`,
      link: '/finance/invoices',
    });

    if (lead.assignedTo) {
      await this.notificationsService.createNotification({
        userId: lead.assignedTo,
        type: NotificationType.SYSTEM,
        title: `Deal closed — ${lead.companyName}`,
        body:
          'Congratulations! Your deal has been marked Closed Won. Commission has been calculated and is pending review.',
        link: '/finance/commissions/my',
      });
    }

    await this.invalidateSummaryCache();
  }

  async bulkAssign(
    leadIds: string[],
    agentId: string,
    actor: CrmActor,
  ): Promise<{ updated: number }> {
    if (leadIds.length > 50) {
      throw new BadRequestException(
        'Cannot bulk assign more than 50 leads at once',
      );
    }

    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
      include: { role: true },
    });
    if (!agent || agent.role.key !== 'SALES_AGENT') {
      throw new BadRequestException('Target user must be a Sales Agent');
    }

    const result = await this.prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        deletedAt: null,
        stage: { notIn: CLOSED_STAGES },
      },
      data: { assignedTo: agentId },
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'lead.bulk_assigned',
      entityType: 'Lead',
      entityId: leadIds.join(','),
      newValue: { agentId, count: result.count },
      ipAddress: actor.ipAddress,
    });

    await this.invalidateSummaryCache();
    return { updated: result.count };
  }

  async bulkMoveStage(
    leadIds: string[],
    stage: PipelineStage,
    actor: CrmActor,
  ): Promise<{ updated: number }> {
    if (leadIds.length > 50) {
      throw new BadRequestException(
        'Cannot bulk move more than 50 leads at once',
      );
    }

    if (CLOSED_STAGES.includes(stage)) {
      throw new BadRequestException(
        'Use individual lead actions to close leads. Bulk close is not permitted.',
      );
    }

    const result = await this.prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        deletedAt: null,
        stage: { notIn: CLOSED_STAGES },
      },
      data: { stage },
    });

    await this.prisma.pipelineStageHistory.createMany({
      data: leadIds.map((leadId) => ({
        leadId,
        toStage: stage,
        movedBy: actor.userId,
      })),
      skipDuplicates: true,
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'lead.bulk_stage_moved',
      entityType: 'Lead',
      entityId: leadIds.join(','),
      newValue: { stage, count: result.count },
      ipAddress: actor.ipAddress,
    });

    await this.invalidateSummaryCache();
    await this.invalidateConversionCache();
    return { updated: result.count };
  }

  async bulkDelete(
    leadIds: string[],
    actor: CrmActor,
  ): Promise<{ deleted: number }> {
    if (leadIds.length > 50) {
      throw new BadRequestException(
        'Cannot bulk delete more than 50 leads at once',
      );
    }

    const result = await this.prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        deletedAt: null,
        stage: { notIn: [PipelineStage.CLOSED_WON] },
      },
      data: { deletedAt: new Date() },
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'lead.deleted',
      entityType: 'Lead',
      entityId: leadIds.join(','),
      newValue: { count: result.count, bulk: true },
      ipAddress: actor.ipAddress,
    });

    await this.invalidateSummaryCache();
    return { deleted: result.count };
  }

  async exportToCsv(
    filters: LeadFiltersDto,
    userId: string,
    roleKey: string,
  ): Promise<string> {
    const leads = await this.prisma.lead.findMany({
      where: this.buildWhereClause(filters, userId, roleKey),
      include: {
        activities: { orderBy: { performedAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const agentIds = [
      ...new Set(leads.map((l) => l.assignedTo).filter(Boolean)),
    ] as string[];
    const agents =
      agentIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: agentIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const agentMap = new Map(
      agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]),
    );

    const headers = [
      'ID',
      'Contact Name',
      'Company Name',
      'Email',
      'Phone',
      'Country',
      'Service Interest',
      'Source',
      'Stage',
      'Estimated Value',
      'Currency',
      'Quality Score',
      'Assigned Agent',
      'Created Date',
      'Last Updated',
      'Last Activity Type',
      'Last Activity Date',
      'Notes',
    ];

    const rows = leads.map((lead) =>
      buildCsvRow([
        lead.id,
        lead.contactName,
        lead.companyName,
        lead.email,
        lead.phone,
        lead.country,
        lead.serviceInterest,
        lead.source,
        lead.stage,
        lead.estimatedValue ? Number(lead.estimatedValue) : '',
        lead.currency,
        lead.qualityScore ?? 0,
        lead.assignedTo ? agentMap.get(lead.assignedTo) ?? lead.assignedTo : '',
        format(lead.createdAt, 'yyyy-MM-dd'),
        format(lead.updatedAt, 'yyyy-MM-dd'),
        lead.activities[0]?.type ?? '',
        lead.activities[0]
          ? format(lead.activities[0].performedAt, 'yyyy-MM-dd')
          : '',
        lead.notes,
      ]),
    );

    return [buildCsvRow(headers), ...rows].join('\n');
  }
}
