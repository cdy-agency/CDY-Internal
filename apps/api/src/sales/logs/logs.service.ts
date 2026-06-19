import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDailyLogDto } from './dto/create-log.dto';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDailyLogDto) {
    if (!dto.employeeId) throw new BadRequestException('employeeId is required');
    const agent = await this.prisma.salesAgent.findUnique({
      where: {
        campaignId_employeeId: {
          campaignId: dto.campaignId,
          employeeId: dto.employeeId,
        },
      },
    });
    if (!agent) {
      throw new NotFoundException(
        'This employee is not deployed on this campaign',
      );
    }
    if (!agent.isActive) {
      throw new BadRequestException(
        'This agent is no longer active on this campaign',
      );
    }

    const logDate = new Date(dto.date);
    logDate.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyActivityLog.findUnique({
      where: { agentId_date: { agentId: agent.id, date: logDate } },
    });
    if (existing) {
      throw new ConflictException(
        'A log already exists for this date. Edit the existing log instead.',
      );
    }

    return this.prisma.dailyActivityLog.create({
      data: {
        campaignId: dto.campaignId,
        agentId: agent.id,
        employeeId: dto.employeeId,
        date: logDate,
        visitsCount: dto.visitsCount ?? 0,
        leadsCount: dto.leadsCount ?? 0,
        salesCount: dto.salesCount ?? 0,
        salesAmount: dto.salesAmount,
        notes: dto.notes,
        challenges: dto.challenges,
      },
    });
  }

  async update(logId: string, dto: Partial<CreateDailyLogDto>) {
    const log = await this.prisma.dailyActivityLog.findUnique({
      where: { id: logId },
    });
    if (!log) throw new NotFoundException();

    const daysDiff = Math.floor(
      (Date.now() - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff > 7) {
      throw new BadRequestException(
        'Cannot edit activity logs older than 7 days',
      );
    }

    return this.prisma.dailyActivityLog.update({
      where: { id: logId },
      data: {
        visitsCount: dto.visitsCount,
        leadsCount: dto.leadsCount,
        salesCount: dto.salesCount,
        salesAmount: dto.salesAmount,
        notes: dto.notes,
        challenges: dto.challenges,
      },
    });
  }

  async getForCampaign(campaignId: string, from?: Date, to?: Date) {
    return this.prisma.dailyActivityLog.findMany({
      where: {
        campaignId,
        ...(from && to && { date: { gte: from, lte: to } }),
      },
      orderBy: { date: 'desc' },
    });
  }

  async getMyLogs(employeeId: string, campaignId?: string) {
    return this.prisma.dailyActivityLog.findMany({
      where: {
        employeeId,
        ...(campaignId && { campaignId }),
      },
      orderBy: { date: 'desc' },
    });
  }
}
