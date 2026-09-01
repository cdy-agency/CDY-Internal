import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  CommissionRule,
  CommissionRecord,
  CommissionStatus,
  Prisma,
} from '@prisma/client';
import { format } from 'date-fns';
import { Role } from '@cdy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionRuleDto, UpdateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { CalculateCommissionDto } from './dto/calculate-commission.dto';
import { ReviewCommissionDto } from './dto/review-commission.dto';
import { CommissionFiltersDto } from './dto/commission-filters.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';
import { NotificationType } from '@prisma/client';
import { findCrmAssignableUsers } from '../crm/common/crm-assignees.util';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async findSalesAgents() {
    return findCrmAssignableUsers(this.prisma);
  }

  async createRule(dto: CreateCommissionRuleDto, createdBy: string) {
    const rule = await this.prisma.commissionRule.create({
      data: {
        agentId: dto.agentId,
        serviceType: dto.serviceType ?? null,
        ratePercent: dto.ratePercent,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdBy,
      },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return this.serializeRule(rule);
  }

  async findAllRules() {
    const rules = await this.prisma.commissionRule.findMany({
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ agentId: 'asc' }, { effectiveFrom: 'desc' }],
    });

    const grouped = new Map<
      string,
      {
        agentId: string;
        agentName: string;
        rules: ReturnType<CommissionsService['serializeRule']>[];
      }
    >();

    for (const rule of rules) {
      const serialized = this.serializeRule(rule);
      const agentName = rule.agent
        ? `${rule.agent.firstName} ${rule.agent.lastName}`
        : rule.agentId;

      const existing = grouped.get(rule.agentId);
      if (existing) {
        existing.rules.push(serialized);
      } else {
        grouped.set(rule.agentId, {
          agentId: rule.agentId,
          agentName,
          rules: [serialized],
        });
      }
    }

    return Array.from(grouped.values());
  }

  async deactivateRule(
    id: string,
    userId: string,
    auditCtx?: AuditContext,
  ) {
    const rule = await this.prisma.commissionRule.findUnique({
      where: { id },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!rule) throw new NotFoundException('Commission rule not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (rule.effectiveTo && rule.effectiveTo <= today) {
      throw new BadRequestException('Rule is already deactivated');
    }

    const updated = await this.prisma.commissionRule.update({
      where: { id },
      data: { effectiveTo: today },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const serialized = this.serializeRule(updated);

    if (auditCtx) {
      this.auditService.log({
        ...auditCtx,
        action: 'commission_rule.deactivated',
        entityType: 'CommissionRule',
        entityId: id,
        newValue: serialized,
      });
    } else {
      this.auditService.log({
        userId,
        userEmail: '',
        action: 'commission_rule.deactivated',
        entityType: 'CommissionRule',
        entityId: id,
        newValue: serialized,
      });
    }

    return serialized;
  }

  async updateRule(id: string, dto: UpdateCommissionRuleDto) {
    const existing = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission rule not found');

    const rule = await this.prisma.commissionRule.update({
      where: { id },
      data: {
        ...(dto.ratePercent !== undefined ? { ratePercent: dto.ratePercent } : {}),
        ...(dto.effectiveTo !== undefined
          ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }
          : {}),
      },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return this.serializeRule(rule);
  }

  private async getRateForAgent(
    agentId: string,
    serviceType: string,
    date: Date,
  ): Promise<CommissionRule | null> {
    const rules = await this.prisma.commissionRule.findMany({
      where: {
        agentId,
        OR: [{ serviceType }, { serviceType: null }],
        effectiveFrom: { lte: date },
        AND: [
          {
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          },
        ],
      },
      orderBy: [{ effectiveFrom: 'desc' }],
    });

    const specific = rules.find((r) => r.serviceType === serviceType);
    if (specific) return specific;

    const catchAll = rules.find((r) => r.serviceType === null);
    return catchAll ?? null;
  }

  async calculate(dto: CalculateCommissionDto, auditCtx?: AuditContext) {
    const rule = await this.getRateForAgent(
      dto.agentId,
      dto.serviceType,
      new Date(),
    );

    if (!rule) {
      this.logger.warn(
        `No commission rule for agent ${dto.agentId} service ${dto.serviceType}`,
      );
      return null;
    }

    const existing = await this.prisma.commissionRecord.findUnique({
      where: { dealId: dto.dealId },
    });

    if (existing) {
      this.logger.warn(`Commission already exists for deal ${dto.dealId}`);
      return this.serializeRecord(existing);
    }

    const month = format(new Date(), 'yyyy-MM');
    const calculatedAmount = Number(
      ((dto.dealValue * Number(rule.ratePercent)) / 100).toFixed(2),
    );

    const commission = await this.prisma.commissionRecord.create({
      data: {
        agentId: dto.agentId,
        dealId: dto.dealId,
        dealValue: dto.dealValue,
        serviceType: dto.serviceType,
        ratePercent: rule.ratePercent,
        calculatedAmount,
        month,
        status: CommissionStatus.PENDING,
      },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { key: true } },
          },
        },
      },
    });

    this.logger.log(
      `Commission created: agent=${dto.agentId} deal=${dto.dealId} amount=${calculatedAmount}`,
    );

    const serialized = this.serializeRecord(commission);
    if (auditCtx) {
      this.auditService.log({
        ...auditCtx,
        action: 'commission.calculated',
        entityType: 'Commission',
        entityId: commission.id,
        newValue: serialized,
      });
    }

    return serialized;
  }

  async findAll(filters: CommissionFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.CommissionRecordWhereInput = {
      month: filters.month,
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [records, total, summary] = await Promise.all([
      this.prisma.commissionRecord.findMany({
        where,
        include: {
          agent: {
            select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { key: true } },
          },
          },
        },
        orderBy: [{ agentId: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.commissionRecord.count({ where }),
      this.getMonthSummary(filters.month),
    ]);

    const dealLeads =
      records.length > 0
        ? await this.prisma.lead.findMany({
            where: { id: { in: records.map((record) => record.dealId) } },
            select: { id: true, companyName: true, contactName: true },
          })
        : [];
    const dealNameById = new Map(
      dealLeads.map((lead) => [
        lead.id,
        lead.companyName ?? lead.contactName,
      ]),
    );

    return {
      data: records.map((record) =>
        this.serializeRecord(record, dealNameById.get(record.dealId) ?? null),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary,
    };
  }

  async findMyCommissions(agentId: string, filters: CommissionFiltersDto) {
    return this.findAll({ ...filters, agentId });
  }

  async findOne(id: string) {
    const record = await this.prisma.commissionRecord.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { key: true } },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Commission not found');
    return this.serializeRecord(record);
  }

  async review(
    id: string,
    dto: ReviewCommissionDto,
    reviewerId: string,
    auditCtx: AuditContext,
  ) {
    const commission = await this.prisma.commissionRecord.findUnique({
      where: { id },
    });

    if (!commission) throw new NotFoundException('Commission not found');

    if (commission.status !== CommissionStatus.PENDING) {
      throw new BadRequestException(
        `Commission is already ${commission.status.toLowerCase()} and cannot be reviewed again`,
      );
    }

    if (dto.status === CommissionStatus.APPROVED) {
      if (dto.adjustedAmount !== undefined && !dto.adjustmentReason) {
        throw new BadRequestException(
          'adjustmentReason is required when adjusting the commission amount',
        );
      }

      const updated = await this.prisma.commissionRecord.update({
        where: { id },
        data: {
          status: CommissionStatus.APPROVED,
          adjustedAmount: dto.adjustedAmount ?? null,
          adjustmentReason: dto.adjustmentReason ?? null,
          approvedBy: reviewerId,
          approvedAt: new Date(),
        },
        include: {
          agent: {
            select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { key: true } },
          },
          },
        },
      });
      const serialized = this.serializeRecord(updated);
      const finalAmount = serialized.finalAmount;

      this.notificationsService.createNotificationAsync({
        userId: commission.agentId,
        type: NotificationType.COMMISSION_APPROVED,
        title: `Commission approved — $${finalAmount.toFixed(2)}`,
        body: `Your commission for deal ${commission.dealId} has been approved${commission.adjustedAmount ? ` (adjusted from $${Number(commission.calculatedAmount).toFixed(2)})` : ''}.`,
        link: '/finance/commissions/my',
      });

      this.auditService.log({
        ...auditCtx,
        action: 'commission.approved',
        entityType: 'Commission',
        entityId: id,
        newValue: serialized,
      });

      return serialized;
    }

    if (!dto.rejectionReason) {
      throw new BadRequestException(
        'rejectionReason is required when rejecting a commission',
      );
    }

    const updated = await this.prisma.commissionRecord.update({
      where: { id },
      data: {
        status: CommissionStatus.REJECTED,
        rejectedBy: reviewerId,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { key: true } },
          },
        },
      },
    });
    const serialized = this.serializeRecord(updated);

    this.notificationsService.createNotificationAsync({
      userId: commission.agentId,
      type: NotificationType.COMMISSION_REJECTED,
      title: `Commission rejected — ${commission.dealId}`,
      body: `Your commission for deal ${commission.dealId} was rejected. Reason: ${dto.rejectionReason}`,
      link: '/finance/commissions/my',
    });

    this.auditService.log({
      ...auditCtx,
      action: 'commission.rejected',
      entityType: 'Commission',
      entityId: id,
      newValue: serialized,
    });

    return serialized;
  }

  async approveAll(month: string, reviewerId: string) {
    const pending = await this.prisma.commissionRecord.findMany({
      where: { month, status: CommissionStatus.PENDING },
    });

    if (pending.length === 0) {
      return { approved: 0, totalValue: 0 };
    }

    await this.prisma.commissionRecord.updateMany({
      where: { month, status: CommissionStatus.PENDING },
      data: {
        status: CommissionStatus.APPROVED,
        approvedBy: reviewerId,
        approvedAt: new Date(),
      },
    });

    const totalValue = pending.reduce(
      (s, c) => s + Number(c.calculatedAmount),
      0,
    );

    this.logger.log(`Approved ${pending.length} commissions for ${month}`);

    return { approved: pending.length, totalValue };
  }

  async getMySummary(agentId: string, month: string) {
    const commissions = await this.prisma.commissionRecord.findMany({
      where: { agentId, month },
      orderBy: { createdAt: 'desc' },
    });

    const dealsCount = commissions.length;
    const totalDealValue = commissions.reduce(
      (s, c) => s + Number(c.dealValue),
      0,
    );
    const pendingCommission = commissions
      .filter((c) => c.status === CommissionStatus.PENDING)
      .reduce((s, c) => s + Number(c.calculatedAmount), 0);
    const approvedCommission = commissions
      .filter((c) => c.status === CommissionStatus.APPROVED)
      .reduce(
        (s, c) =>
          s + Number(c.adjustedAmount ?? c.calculatedAmount),
        0,
      );
    const totalCommission = commissions
      .filter(
        (c) =>
          c.status === CommissionStatus.PENDING ||
          c.status === CommissionStatus.APPROVED,
      )
      .reduce((s, c) => s + Number(c.calculatedAmount), 0);

    return {
      month,
      dealsCount,
      totalDealValue,
      totalCommission,
      approvedCommission,
      pendingCommission,
      commissions: commissions.map((c) => this.serializeRecord(c)),
    };
  }

  async getPayrollSummary(month: string) {
    const records = await this.prisma.commissionRecord.findMany({
      where: { month, status: CommissionStatus.APPROVED },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { agentId: 'asc' },
    });

    const agentMap = new Map<
      string,
      {
        agentId: string;
        agentName: string;
        totalCommission: number;
        commissionCount: number;
        commissions: ReturnType<CommissionsService['serializeRecord']>[];
      }
    >();

    for (const record of records) {
      const key = record.agentId;
      const amount = Number(record.adjustedAmount ?? record.calculatedAmount);
      const existing = agentMap.get(key);
      const serialized = this.serializeRecord(record);

      if (existing) {
        existing.totalCommission += amount;
        existing.commissionCount += 1;
        existing.commissions.push(serialized);
      } else {
        agentMap.set(key, {
          agentId: key,
          agentName: `${record.agent.firstName} ${record.agent.lastName}`,
          totalCommission: amount,
          commissionCount: 1,
          commissions: [serialized],
        });
      }
    }

    return { agents: Array.from(agentMap.values()) };
  }

  async assertAgentAccess(requestingAgentId: string, targetAgentId: string) {
    if (requestingAgentId !== targetAgentId) {
      throw new ForbiddenException('You can only access your own commissions');
    }
  }

  private async getMonthSummary(month: string) {
    const [pending, approved, rejected, pendingAgg, approvedAgg] =
      await Promise.all([
        this.prisma.commissionRecord.count({
          where: { month, status: CommissionStatus.PENDING },
        }),
        this.prisma.commissionRecord.count({
          where: { month, status: CommissionStatus.APPROVED },
        }),
        this.prisma.commissionRecord.count({
          where: { month, status: CommissionStatus.REJECTED },
        }),
        this.prisma.commissionRecord.aggregate({
          _sum: { calculatedAmount: true },
          where: { month, status: CommissionStatus.PENDING },
        }),
        this.prisma.commissionRecord.aggregate({
          _sum: { calculatedAmount: true },
          where: { month, status: CommissionStatus.APPROVED },
        }),
      ]);

    return {
      pending,
      approved,
      rejected,
      pendingValue: Number(pendingAgg._sum.calculatedAmount ?? 0),
      approvedValue: Number(approvedAgg._sum.calculatedAmount ?? 0),
    };
  }

  private serializeRule(
    rule: CommissionRule & {
      agent?: { id: string; firstName: string; lastName: string; email: string };
    },
  ) {
    return {
      id: rule.id,
      agentId: rule.agentId,
      serviceType: rule.serviceType,
      ratePercent: Number(rule.ratePercent),
      effectiveFrom: rule.effectiveFrom.toISOString(),
      effectiveTo: rule.effectiveTo?.toISOString() ?? null,
      createdBy: rule.createdBy,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
      agent: rule.agent,
    };
  }

  private serializeRecord(
    record: CommissionRecord & {
      agent?: {
        id: string;
        firstName: string;
        lastName: string;
        role?: { key: string };
      };
    },
    dealName: string | null = null,
  ) {
    const agent =
      'agent' in record && record.agent
        ? {
            id: record.agent.id,
            firstName: record.agent.firstName,
            lastName: record.agent.lastName,
            roleKey: record.agent.role?.key ?? Role.SALES_AGENT,
          }
        : undefined;

    return {
      id: record.id,
      agentId: record.agentId,
      dealId: record.dealId,
      dealName,
      dealValue: Number(record.dealValue),
      serviceType: record.serviceType,
      ratePercent: Number(record.ratePercent),
      calculatedAmount: Number(record.calculatedAmount),
      adjustedAmount:
        record.adjustedAmount !== null
          ? Number(record.adjustedAmount)
          : null,
      adjustmentReason: record.adjustmentReason,
      month: record.month,
      status: record.status,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt?.toISOString() ?? null,
      rejectedBy: record.rejectedBy,
      rejectedAt: record.rejectedAt?.toISOString() ?? null,
      rejectionReason: record.rejectionReason,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      agent,
      finalAmount: Number(record.adjustedAmount ?? record.calculatedAmount),
    };
  }
}
