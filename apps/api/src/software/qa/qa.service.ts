import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BugSeverity, BugStatus, QaStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBugDto } from './dto/create-bug.dto';

@Injectable()
export class QaService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(softwareProjectId: string, userId: string) {
    const existing = await this.prisma.qaPhase.findUnique({
      where: { softwareProjectId },
      include: { bugs: { orderBy: { severity: 'asc' } } },
    });
    if (existing) return existing;

    return this.prisma.qaPhase.create({
      data: {
        softwareProjectId,
        status: QaStatus.IN_PROGRESS,
        startedAt: new Date(),
        createdBy: userId,
      },
      include: { bugs: true },
    });
  }

  async skip(softwareProjectId: string) {
    return this.prisma.qaPhase.upsert({
      where: { softwareProjectId },
      create: {
        softwareProjectId,
        isSkipped: true,
        status: QaStatus.SKIPPED,
        createdBy: 'system',
      },
      update: { isSkipped: true, status: QaStatus.SKIPPED },
    });
  }

  async logBug(
    softwareProjectId: string,
    dto: CreateBugDto,
    userId: string,
  ) {
    const qa = await this.getOrCreate(softwareProjectId, userId);

    return this.prisma.bug.create({
      data: {
        qaPhaseId: qa.id,
        title: dto.title,
        description: dto.description,
        severity: dto.severity ?? BugSeverity.MEDIUM,
        assigneeId: dto.assigneeId,
        status: BugStatus.OPEN,
        createdBy: userId,
      },
    });
  }

  async updateBugStatus(bugId: string, status: BugStatus) {
    const bug = await this.prisma.bug.findUnique({ where: { id: bugId } });
    if (!bug) throw new NotFoundException('Bug not found');

    return this.prisma.bug.update({
      where: { id: bugId },
      data: {
        status,
        ...(status === BugStatus.RESOLVED && { resolvedAt: new Date() }),
      },
    });
  }

  async complete(softwareProjectId: string) {
    const qa = await this.prisma.qaPhase.findUnique({
      where: { softwareProjectId },
      include: { bugs: true },
    });
    if (!qa) throw new NotFoundException('QA phase not found');

    const openCritical = qa.bugs.filter(
      (b) =>
        b.severity === BugSeverity.CRITICAL && b.status !== BugStatus.RESOLVED,
    );
    if (openCritical.length > 0) {
      throw new BadRequestException(
        `${openCritical.length} CRITICAL bug${openCritical.length > 1 ? 's' : ''} must be resolved before QA can be marked complete`,
      );
    }

    return this.prisma.qaPhase.update({
      where: { softwareProjectId },
      data: { status: QaStatus.COMPLETED, completedAt: new Date() },
    });
  }
}
