import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { LeadsService } from '../leads/leads.service';
import { CrmAuditService } from '../audit/crm-audit.service';
import { CrmActor } from '../common/crm-actor.interface';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly crmAuditService: CrmAuditService,
  ) {}

  async create(
    leadId: string,
    dto: CreateActivityDto,
    userId: string,
    roleKey: string,
    actor: CrmActor,
  ) {
    await this.leadsService.findOne(leadId, userId, roleKey);

    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: dto.type,
        summary: dto.summary,
        outcome: dto.outcome,
        nextAction: dto.nextAction,
        nextActionDate: dto.nextActionDate
          ? new Date(dto.nextActionDate)
          : undefined,
        duration: dto.duration,
        performedBy: userId,
        performedAt: dto.performedAt
          ? new Date(dto.performedAt)
          : new Date(),
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { updatedAt: new Date() },
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'activity.logged',
      entityType: 'Activity',
      entityId: activity.id,
      newValue: {
        leadId,
        type: dto.type,
        summary: dto.summary,
      },
      ipAddress: actor.ipAddress,
    });

    await this.leadsService.recalculateScore(leadId);
    await this.leadsService.invalidateSummaryCache();

    return activity;
  }

  async findAll(leadId: string, userId: string, roleKey: string) {
    await this.leadsService.findOne(leadId, userId, roleKey);

    return this.prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { performedAt: 'desc' },
    });
  }

  async remove(
    leadId: string,
    activityId: string,
    userId: string,
    roleKey: string,
  ) {
    await this.leadsService.findOne(leadId, userId, roleKey);

    const activity = await this.prisma.leadActivity.findFirst({
      where: { id: activityId, leadId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    await this.prisma.leadActivity.delete({ where: { id: activityId } });
    await this.leadsService.recalculateScore(leadId);
    await this.leadsService.invalidateSummaryCache();

    return { deleted: true };
  }
}
