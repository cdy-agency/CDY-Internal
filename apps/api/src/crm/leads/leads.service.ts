import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientService as ClientServiceEnum,
  ClientSource,
  ClientType,
  Lead,
  NotificationType,
  PipelineStage,
  Prisma,
  ProposalStatus,
  RetainerStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { LeadScoringService } from './lead-scoring.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { LeadFiltersDto } from './dto/lead-filters.dto';
import { CommissionsService } from '../../commissions/commissions.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CacheService } from '../../cache/cache.service';
import { CrmAuditService } from '../audit/crm-audit.service';
import { CrmSettingsService } from '../settings/crm-settings.service';
import { ClientServiceService } from '../clients/client-service.service';
import { getClientDisplayName } from '../clients/client.utils';
import { CrmActor } from '../common/crm-actor.interface';
import {
  CRM_EXCLUDED_ASSIGNEE_ROLES,
  findCrmAssignableUsers,
} from '../common/crm-assignees.util';
import { buildCsvRow } from '../common/csv.util';
import { format } from 'date-fns';
import { CacheKeys } from '../../common/cache-keys';

const CRM_SUMMARY_CACHE_KEY = CacheKeys.CRM_SUMMARY;
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

  private static readonly SERVICE_MAP: Record<string, ClientServiceEnum> = {
    software_dev: ClientServiceEnum.SOFTWARE_DEV,
    website: ClientServiceEnum.SOFTWARE_DEV,
    branding: ClientServiceEnum.BRANDING,
    social_media: ClientServiceEnum.SOCIAL_MEDIA,
    influencer_marketing: ClientServiceEnum.INFLUENCER_MARKETING,
    sales_services: ClientServiceEnum.SALES_SERVICES,
    general: ClientServiceEnum.GENERAL,
    marketing: ClientServiceEnum.SOCIAL_MEDIA,
    consulting: ClientServiceEnum.GENERAL,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly leadScoringService: LeadScoringService,
    private readonly commissionsService: CommissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly cache: CacheService,
    private readonly crmAuditService: CrmAuditService,
    private readonly crmSettingsService: CrmSettingsService,
    private readonly clientServiceService: ClientServiceService,
  ) {}

  /**
   * Feature-based scoping: a user sees every agent's records when their role
   * grants `crm.all` (read), otherwise only records assigned to them. This
   * replaces the previous `roleKey === 'SALES_AGENT'` check so behaviour is
   * driven purely by permissions and works for any (including custom) role.
   */
  async canViewAllCrm(userId: string): Promise<boolean> {
    return this.rbac.can(userId, 'crm.all', 'read');
  }

  async invalidateSummaryCache(): Promise<void> {
    await this.cache.del(CRM_SUMMARY_CACHE_KEY);
  }

  async invalidateConversionCache(): Promise<void> {
    await this.cache.delByPrefix(CONVERSION_CACHE_PREFIX);
  }

  async create(dto: CreateLeadDto, actor: CrmActor): Promise<Lead> {
    const assigneeId = dto.assignedTo ?? actor.userId;
    await this.assertAssignableUser(assigneeId);
    await this.assertEmailIsNotAnActiveClient(dto.email);

    const createdAt = this.resolveCreatedAt(dto.createdAt);

    const weights = await this.crmSettingsService.getScoreWeights();
    const qualityScore = this.leadScoringService.calculate({
      source: dto.source,
      estimatedValue: dto.estimatedValue,
      serviceInterest: dto.serviceInterest ?? '',
      hasPhone: Boolean(dto.phone),
      hasEmail: Boolean(dto.email),
      weights,
    });

    const lead = await this.prisma.lead.create({
      data: {
        leadType: dto.leadType ?? ClientType.COMPANY,
        contactName: dto.contactName,
        companyName: dto.companyName ?? null,
        email: dto.email,
        phone: dto.phone,
        country: dto.country ?? 'RW',
        serviceInterest: dto.serviceInterest ?? '',
        ventureId: dto.ventureId ?? null,
        source: dto.source,
        estimatedValue: dto.estimatedValue,
        currency: dto.currency ?? 'RWF',
        // Default to the creator when left unassigned — otherwise a user
        // without crm.all read who creates their own lead immediately loses
        // access to it (buildWhereClause scopes them to assignedTo: userId,
        // which a null assignedTo never matches) and no commission can ever
        // be calculated when it closes.
        assignedTo: assigneeId,
        notes: dto.notes,
        qualityScore,
        createdBy: actor.userId,
        createdAt,
      },
    });

    await this.prisma.pipelineStageHistory.create({
      data: {
        leadId: lead.id,
        fromStage: null,
        toStage: PipelineStage.NEW,
        movedBy: actor.userId,
        movedAt: createdAt,
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
    canViewAll: boolean,
  ): Prisma.LeadWhereInput {
    const agentFilter = !canViewAll
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
      ...(filters.createdBy && { createdBy: filters.createdBy }),
      ...(filters.stage && { stage: filters.stage }),
      ...(filters.source && { source: filters.source }),
      ...(filters.serviceInterest && { serviceInterest: filters.serviceInterest }),
      ...(filters.leadType && { leadType: filters.leadType }),
      ...(filters.leadKind === 'venture' && { ventureId: { not: null } }),
      ...(filters.leadKind === 'service' && { ventureId: null }),
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

  private async resolveUserNames(
    userIds: Array<string | null | undefined>,
  ): Promise<Map<string, string>> {
    const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  }

  private resolveLeadOrderBy(
    filters: LeadFiltersDto,
  ): Prisma.LeadOrderByWithRelationInput[] {
    const direction = filters.sortOrder === 'asc' ? 'asc' : 'desc';
    switch (filters.sortBy) {
      case 'createdAt':
        return [{ createdAt: direction }];
      case 'convertedAt':
        return [{ convertedAt: direction }, { createdAt: 'desc' }];
      case 'estimatedValue':
        return [{ estimatedValue: direction }, { createdAt: 'desc' }];
      case 'companyName':
        return [{ companyName: direction }, { contactName: direction }];
      case 'updatedAt':
      default:
        return [{ updatedAt: direction === 'asc' ? 'asc' : 'desc' }];
    }
  }

  async findAll(filters: LeadFiltersDto, userId: string) {
    const canViewAll = await this.canViewAllCrm(userId);
    const leads = await this.prisma.lead.findMany({
      where: this.buildWhereClause(filters, userId, canViewAll),
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
        venture: { select: { id: true, name: true } },
      },
      orderBy: this.resolveLeadOrderBy(filters),
    });

    const nameMap = await this.resolveUserNames(
      leads.flatMap((l) => [l.assignedTo, l.createdBy]),
    );

    return leads.map((lead) => ({
      ...lead,
      assignedToName: lead.assignedTo
        ? nameMap.get(lead.assignedTo) ?? null
        : null,
      createdByName: nameMap.get(lead.createdBy) ?? null,
      ventureName: lead.venture?.name ?? null,
    }));
  }

  async findOne(id: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        activities: { orderBy: { performedAt: 'desc' } },
        proposals: { orderBy: { createdAt: 'desc' } },
        client: true,
        venture: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const canViewAll = await this.canViewAllCrm(userId);
    if (!canViewAll && lead.assignedTo !== userId) {
      throw new NotFoundException('Lead not found');
    }

    const stageHistory = await this.prisma.pipelineStageHistory.findMany({
      where: { leadId: id },
      orderBy: { movedAt: 'desc' },
    });

    const nameMap = await this.resolveUserNames([
      lead.assignedTo,
      lead.createdBy,
      ...stageHistory.map((h) => h.movedBy),
      ...lead.activities.map((a) => a.performedBy),
    ]);

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
      assignedToName: lead.assignedTo
        ? nameMap.get(lead.assignedTo) ?? null
        : null,
      createdByName: nameMap.get(lead.createdBy) ?? null,
      ventureName: lead.venture?.name ?? null,
      activities: lead.activities.map((a) => ({
        ...a,
        performedByName: nameMap.get(a.performedBy) ?? 'Unknown',
      })),
      stageHistory: stageHistory.map((h) => ({
        ...h,
        movedByName: nameMap.get(h.movedBy) ?? 'Unknown',
      })),
      overdueFollowUp,
    };
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    userId: string,
    actor?: CrmActor,
  ) {
    const existing = await this.findOne(id, userId);

    if (dto.assignedTo) {
      await this.assertAssignableUser(dto.assignedTo);
    }

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

  async softDelete(id: string, userId: string, actor?: CrmActor) {
    const existing = await this.findOne(id, userId);
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

  async getPipelineBoard(userId: string, filters: LeadFiltersDto = {}) {
    const canViewAll = await this.canViewAllCrm(userId);
    // Pipeline always shows open stages only — ignore stage filter from UI.
    const { stage: _ignoredStage, ...rest } = filters;
    const where = this.buildWhereClause(rest, userId, canViewAll);

    const leads = await this.prisma.lead.findMany({
      where: {
        ...where,
        stage: { notIn: CLOSED_STAGES },
      },
      include: {
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: this.resolveLeadOrderBy(filters),
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
    actor?: CrmActor,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const canViewAll = await this.canViewAllCrm(userId);
    if (!canViewAll && lead.assignedTo !== userId) {
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

    if (dto.stage === PipelineStage.CLOSED_WON && !dto.wonOutcome) {
      throw new BadRequestException(
        'Please choose whether to create an invoice or a retainer for this deal',
      );
    }

    if (dto.stage === PipelineStage.CLOSED_WON && !dto.finalValue) {
      throw new BadRequestException(
        'Please enter the final deal value before closing this lead as won',
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

    const isClosing =
      dto.stage === PipelineStage.CLOSED_WON ||
      dto.stage === PipelineStage.CLOSED_LOST;

    // A closed deal cannot use the email address of an active client. For a
    // won deal, validate any correction entered in the close-deal form.
    await this.assertEmailIsNotAnActiveClient(dto.email ?? lead.email);

    const updateData: Prisma.LeadUpdateInput = {
      stage: dto.stage,
      // convertedAt is the close timestamp for both won and lost deals
      ...(isClosing && { convertedAt: new Date() }),
      ...(dto.stage === PipelineStage.CLOSED_LOST && {
        lostReason: dto.lostReason,
      }),
      ...(dto.stage === PipelineStage.CLOSED_WON && {
        // Overwrite the (possibly stale) original estimate with the
        // confirmed final value entered at close time — this is what
        // handleDealClosed() uses for the invoice/retainer amount and
        // commission calculation below.
        estimatedValue: dto.finalValue,
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
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
        void this.handleDealClosed(updatedLead, userId, dto.wonOutcome ?? 'invoice').catch((err: unknown) => {
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
    return findCrmAssignableUsers(this.prisma);
  }

  async findOverdueLeads(userId: string) {
    const canViewAll = await this.canViewAllCrm(userId);
    const now = new Date();

    const activities = await this.prisma.leadActivity.findMany({
      where: {
        nextActionDate: { lt: now },
        nextAction: { not: null },
        lead: {
          deletedAt: null,
          stage: { notIn: CLOSED_STAGES },
          ...(!canViewAll ? { assignedTo: userId } : {}),
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
            stage: true,
            estimatedValue: true,
            currency: true,
            assignedTo: true,
            qualityScore: true,
            createdAt: true,
          },
        },
      },
      orderBy: { nextActionDate: 'asc' },
    });

    // One row per lead — keep the oldest overdue follow-up
    const byLead = new Map<string, (typeof activities)[number]>();
    for (const activity of activities) {
      const existing = byLead.get(activity.leadId);
      if (
        !existing ||
        (activity.nextActionDate &&
          existing.nextActionDate &&
          activity.nextActionDate < existing.nextActionDate)
      ) {
        byLead.set(activity.leadId, activity);
      }
    }

    const rows = [...byLead.values()];
    const nameMap = await this.resolveUserNames(
      rows.map((r) => r.lead.assignedTo),
    );

    return rows
      .sort(
        (a, b) =>
          (a.nextActionDate?.getTime() ?? 0) -
          (b.nextActionDate?.getTime() ?? 0),
      )
      .map((activity) => {
        const due = activity.nextActionDate ?? now;
        return {
          leadId: activity.lead.id,
          companyName:
            activity.lead.companyName ?? activity.lead.contactName,
          contactName: activity.lead.contactName,
          email: activity.lead.email,
          stage: activity.lead.stage,
          estimatedValue: activity.lead.estimatedValue
            ? Number(activity.lead.estimatedValue)
            : null,
          currency: activity.lead.currency,
          qualityScore: activity.lead.qualityScore,
          assignedTo: activity.lead.assignedTo,
          assignedToName: activity.lead.assignedTo
            ? nameMap.get(activity.lead.assignedTo) ?? null
            : null,
          nextAction: activity.nextAction ?? '',
          nextActionDate: due.toISOString(),
          daysOverdue: Math.max(
            0,
            Math.floor(
              (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
            ),
          ),
          createdAt: activity.lead.createdAt.toISOString(),
        };
      });
  }

  private async assertAssignableUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: { select: { key: true } } },
    });
    if (!user || CRM_EXCLUDED_ASSIGNEE_ROLES.has(user.role.key)) {
      throw new BadRequestException(
        'Lead can only be assigned to a non-IT user',
      );
    }
  }

  private async assertEmailIsNotAnActiveClient(email: string): Promise<void> {
    const existingClient = await this.prisma.client.findFirst({
      where: {
        email: { equals: email.trim(), mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingClient) {
      throw new ConflictException(
        'This email address already belongs to an existing client',
      );
    }
  }

  private resolveCreatedAt(value?: string): Date {
    if (!value) return new Date();

    // Date-only (YYYY-MM-DD) → local noon so the calendar day is stable across TZ.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnly
      ? new Date(
          Number(dateOnly[1]),
          Number(dateOnly[2]) - 1,
          Number(dateOnly[3]),
          12,
          0,
          0,
        )
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid created date');
    }
    if (date.getTime() > Date.now()) {
      throw new BadRequestException('Created date cannot be in the future');
    }
    return date;
  }

  /**
   * Finds an existing Client to reuse when closing a deal, instead of
   * always creating a new one. Deliberately conservative: a false match
   * silently merges two unrelated deals into one client record (and, for
   * venture-tagged leads, overwrites which venture that client belongs to).
   *
   * - Email is the only signal trusted on its own — it's the closest thing
   *   to a unique identifier a lead/client has.
   * - Company name is only trusted for COMPANY-type leads (an INDIVIDUAL
   *   lead's companyName is a display fallback of contactName, not a real
   *   company name — matching on it would merge unrelated people who
   *   happen to share a name), and only when corroborated by a matching
   *   phone number, since company names alone are not unique (two
   *   unrelated businesses can both be called "City Motors").
   */
  private async findExistingClientForLead(lead: Lead) {
    const byEmail = await this.prisma.client.findFirst({
      where: { email: { equals: lead.email, mode: 'insensitive' }, deletedAt: null },
    });
    if (byEmail) return byEmail;

    if (lead.leadType === ClientType.COMPANY && lead.companyName && lead.phone) {
      return this.prisma.client.findFirst({
        where: {
          companyName: { equals: lead.companyName, mode: 'insensitive' },
          phone: lead.phone,
          deletedAt: null,
        },
      });
    }

    return null;
  }

  private async handleDealClosed(
    lead: Lead,
    userId: string,
    wonOutcome: 'invoice' | 'retainer',
  ): Promise<void> {
    let client = await this.findExistingClientForLead(lead);

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          clientType: lead.leadType,
          // For individuals, use contactName as the display name when no companyName
          companyName: lead.companyName ?? lead.contactName,
          contactName: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          country: lead.country,
          assignedTo: lead.assignedTo,
          source: ClientSource.PIPELINE,
          leadId: lead.id,
          createdBy: userId,
        },
      });
    } else {
      // An existing client matched this lead — carry over any contact-info
      // corrections made in the close-deal step (email is left alone since
      // it's part of the match key used above).
      client = await this.prisma.client.update({
        where: { id: client.id },
        data: {
          companyName: lead.companyName ?? client.companyName,
          contactName: lead.contactName ?? client.contactName,
          phone: lead.phone ?? client.phone,
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
        serviceType: lead.serviceInterest || 'general',
      });
      this.logger.log(`Commission triggered for agent ${lead.assignedTo}`);
    }

    if (wonOutcome === 'retainer') {
      // User chose to create a retainer — build a draft RetainerContract
      const now = new Date();
      const nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await this.prisma.retainerContract.create({
        data: {
          clientId: client.id,
          ventureId: lead.ventureId ?? null,
          serviceName: lead.serviceInterest || 'Retainer Service',
          amount: lead.estimatedValue ?? 0,
          currency: lead.currency ?? 'USD',
          billingDayOfMonth: 1,
          startDate: now,
          nextBillingDate,
          status: RetainerStatus.DRAFT,
          createdBy: userId,
        },
      });
      this.logger.log(`Draft retainer created for client ${client.id}`);

      // Update client service info
      await this.prisma.client.update({
        where: { id: client.id },
        data: {
          ...(lead.ventureId ? { ventureId: lead.ventureId } : {}),
          serviceValue: lead.estimatedValue,
          serviceCurrency: lead.currency ?? 'USD',
        },
      });
    } else if (lead.ventureId) {
      // Venture-based invoice lead
      await this.prisma.client.update({
        where: { id: client.id },
        data: {
          ventureId: lead.ventureId,
          serviceValue: lead.estimatedValue,
          serviceCurrency: lead.currency ?? 'USD',
        },
      });

      await this.clientServiceService.setupClientService(
        client.id,
        ClientServiceEnum.GENERAL,
        lead.estimatedValue ? Number(lead.estimatedValue) : null,
        lead.currency ?? 'USD',
        userId,
        {
          clientName: getClientDisplayName(client),
          leadId: lead.id,
          ventureId: lead.ventureId,
        },
      );
    } else {
      // Service-based invoice lead
      const clientService =
        LeadsService.SERVICE_MAP[lead.serviceInterest?.toLowerCase() ?? ''] ??
        ClientServiceEnum.GENERAL;

      await this.prisma.client.update({
        where: { id: client.id },
        data: {
          primaryService: clientService,
          serviceValue: lead.estimatedValue,
          serviceCurrency: lead.currency ?? 'USD',
        },
      });

      await this.clientServiceService.setupClientService(
        client.id,
        clientService,
        lead.estimatedValue ? Number(lead.estimatedValue) : null,
        lead.currency ?? 'USD',
        userId,
        { clientName: getClientDisplayName(client), leadId: lead.id },
      );
    }

    if (lead.assignedTo) {
      await this.notificationsService.createNotification({
        userId: lead.assignedTo,
        type: NotificationType.SYSTEM,
        title: `Deal closed — ${lead.companyName ?? lead.contactName}`,
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

    await this.assertAssignableUser(agentId);

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

  async exportToCsv(filters: LeadFiltersDto, userId: string): Promise<string> {
    const canViewAll = await this.canViewAllCrm(userId);
    const leads = await this.prisma.lead.findMany({
      where: this.buildWhereClause(filters, userId, canViewAll),
      include: {
        activities: { orderBy: { performedAt: 'desc' }, take: 1 },
      },
      orderBy: this.resolveLeadOrderBy(filters),
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
        lead.companyName ?? '',
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
