import { Injectable } from '@nestjs/common';
import { DesignStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDesignPhaseDto } from './dto/update-design-phase.dto';

@Injectable()
export class DesignService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(softwareProjectId: string, userId: string) {
    const existing = await this.prisma.designPhase.findUnique({
      where: { softwareProjectId },
    });
    if (existing) return existing;

    return this.prisma.designPhase.create({
      data: {
        softwareProjectId,
        status: DesignStatus.IN_PROGRESS,
        createdBy: userId,
      },
    });
  }

  async update(softwareProjectId: string, dto: UpdateDesignPhaseDto) {
    return this.prisma.designPhase.upsert({
      where: { softwareProjectId },
      create: {
        softwareProjectId,
        figmaUrl: dto.figmaUrl,
        notes: dto.notes,
        status: DesignStatus.IN_PROGRESS,
        createdBy: 'system',
      },
      update: { figmaUrl: dto.figmaUrl, notes: dto.notes },
    });
  }

  async skip(softwareProjectId: string) {
    return this.prisma.designPhase.upsert({
      where: { softwareProjectId },
      create: {
        softwareProjectId,
        isSkipped: true,
        status: DesignStatus.SKIPPED,
        createdBy: 'system',
      },
      update: { isSkipped: true, status: DesignStatus.SKIPPED },
    });
  }

  async approve(softwareProjectId: string) {
    return this.prisma.designPhase.update({
      where: { softwareProjectId },
      data: { status: DesignStatus.APPROVED, clientApprovedAt: new Date() },
    });
  }

  async requestChanges(softwareProjectId: string) {
    return this.prisma.designPhase.update({
      where: { softwareProjectId },
      data: { status: DesignStatus.CHANGES_REQUESTED },
    });
  }
}
