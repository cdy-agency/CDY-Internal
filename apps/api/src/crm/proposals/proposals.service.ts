import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  PipelineStage,
  Prisma,
  ProposalStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { ProposalFiltersDto } from './dto/proposal-filters.dto';
import { LeadsService } from '../leads/leads.service';
import { CrmAuditService } from '../audit/crm-audit.service';
import { CrmActor } from '../common/crm-actor.interface';

const TERMINAL_STATUSES: ProposalStatus[] = [
  ProposalStatus.ACCEPTED,
  ProposalStatus.REJECTED,
];

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly notificationsService: NotificationsService,
    private readonly crmAuditService: CrmAuditService,
  ) {}

  async create(
    leadId: string,
    dto: CreateProposalDto,
    userId: string,
    actor: CrmActor,
  ) {
    await this.leadsService.findOne(leadId, userId);

    const proposal = await this.prisma.proposal.create({
      data: {
        leadId,
        title: dto.title,
        serviceType: dto.serviceType,
        estimatedValue: dto.estimatedValue,
        currency: dto.currency ?? 'RWF',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'proposal.created',
      entityType: 'Proposal',
      entityId: proposal.id,
      newValue: {
        leadId,
        title: dto.title,
        estimatedValue: dto.estimatedValue,
      },
      ipAddress: actor.ipAddress,
    });

    await this.leadsService.invalidateSummaryCache();

    return proposal;
  }

  async findAll(leadId: string, userId: string) {
    await this.leadsService.findOne(leadId, userId);

    return this.prisma.proposal.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllGlobal(filters: ProposalFiltersDto, userId: string) {
    const canViewAll = await this.leadsService.canViewAllCrm(userId);
    const agentFilter = !canViewAll
      ? { lead: { assignedTo: userId } }
      : filters.assignedTo
        ? { lead: { assignedTo: filters.assignedTo } }
        : {};

    return this.prisma.proposal.findMany({
      where: {
        ...agentFilter,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            {
              lead: {
                companyName: { contains: filters.search, mode: 'insensitive' },
              },
            },
          ],
        }),
      },
      include: {
        lead: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            assignedTo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    leadId: string,
    proposalId: string,
    dto: UpdateProposalDto,
    userId: string,
  ) {
    await this.leadsService.findOne(leadId, userId);

    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, leadId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        ...dto,
        ...(dto.estimatedValue !== undefined && {
          estimatedValue: dto.estimatedValue,
        }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
        ...(dto.status === ProposalStatus.REJECTED && {
          rejectedAt: new Date(),
        }),
        ...(dto.status === ProposalStatus.ACCEPTED && {
          acceptedAt: new Date(),
        }),
      },
    });
  }

  async updateStatus(
    leadId: string,
    proposalId: string,
    dto: UpdateProposalStatusDto,
    userId: string,
    actor: CrmActor,
  ) {
    await this.leadsService.findOne(leadId, userId);

    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, leadId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const status = dto.status;
    const now = new Date();
    const updateData: Prisma.ProposalUpdateInput = { status };

    switch (status) {
      case ProposalStatus.SENT:
        if (TERMINAL_STATUSES.includes(proposal.status)) {
          throw new BadRequestException(
            `Proposal is already ${proposal.status}`,
          );
        }
        updateData.sentAt = now;
        await this.autoMoveLeadStage(leadId, userId, [
          PipelineStage.NEW,
          PipelineStage.CONTACTED,
        ], PipelineStage.PROPOSAL_SENT);
        break;

      case ProposalStatus.ACCEPTED:
        updateData.acceptedAt = now;
        await this.autoMoveLeadStage(leadId, userId, [
          PipelineStage.NEW,
          PipelineStage.CONTACTED,
          PipelineStage.PROPOSAL_SENT,
        ], PipelineStage.NEGOTIATION);
        break;

      case ProposalStatus.REJECTED:
        if (!dto.rejectionReason) {
          throw new BadRequestException(
            'rejectionReason required when rejecting a proposal',
          );
        }
        updateData.rejectedAt = now;
        updateData.rejectionReason = dto.rejectionReason;
        break;

      case ProposalStatus.EXPIRED:
        updateData.rejectedAt = now;
        break;

      default:
        break;
    }

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'proposal.status_updated',
      entityType: 'Proposal',
      entityId: proposalId,
      previousValue: { status: proposal.status },
      newValue: { status, rejectionReason: dto.rejectionReason },
      ipAddress: actor.ipAddress,
    });

    const proposalLead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { assignedTo: true, companyName: true },
    });

    if (proposalLead?.assignedTo) {
      if (status === ProposalStatus.ACCEPTED) {
        await this.notificationsService.createNotification({
          userId: proposalLead.assignedTo,
          type: NotificationType.SYSTEM,
          title: `Proposal accepted — ${proposalLead.companyName}`,
          body: `Your proposal "${proposal.title}" has been accepted. Move the deal to Closed Won when ready.`,
          link: `/crm/leads/${leadId}`,
        });
      }
      if (status === ProposalStatus.REJECTED) {
        await this.notificationsService.createNotification({
          userId: proposalLead.assignedTo,
          type: NotificationType.SYSTEM,
          title: `Proposal rejected — ${proposalLead.companyName}`,
          body: `Proposal "${proposal.title}" was rejected. Reason: ${dto.rejectionReason}`,
          link: `/crm/leads/${leadId}`,
        });
      }
    }

    await this.leadsService.invalidateSummaryCache();
    await this.leadsService.invalidateConversionCache();

    return updated;
  }

  async send(
    leadId: string,
    proposalId: string,
    userId: string,
    actor: CrmActor,
  ) {
    return this.updateStatus(
      leadId,
      proposalId,
      { status: ProposalStatus.SENT },
      userId,
      actor,
    );
  }

  async remove(
    leadId: string,
    proposalId: string,
    userId: string,
    actor: CrmActor,
  ): Promise<{ message: string }> {
    await this.leadsService.findOne(leadId, userId);

    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, leadId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    await this.prisma.proposal.delete({ where: { id: proposalId } });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'proposal.deleted',
      entityType: 'Proposal',
      entityId: proposalId,
      previousValue: {
        leadId,
        title: proposal.title,
        estimatedValue: Number(proposal.estimatedValue),
      },
      ipAddress: actor.ipAddress,
    });

    await this.leadsService.invalidateSummaryCache();

    return { message: 'Proposal deleted' };
  }

  private async autoMoveLeadStage(
    leadId: string,
    userId: string,
    fromStages: PipelineStage[],
    toStage: PipelineStage,
  ): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !fromStages.includes(lead.stage)) {
      return;
    }

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { stage: toStage },
    });

    await this.prisma.pipelineStageHistory.create({
      data: {
        leadId,
        fromStage: lead.stage,
        toStage,
        movedBy: userId,
      },
    });
  }
}
