import { Injectable, NotFoundException } from '@nestjs/common';
import { DocStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequirementDocDto } from './dto/create-requirement-doc.dto';

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    softwareProjectId: string,
    dto: CreateRequirementDocDto,
    userId: string,
  ) {
    const latest = await this.prisma.requirementDoc.findFirst({
      where: { softwareProjectId },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;

    return this.prisma.requirementDoc.create({
      data: {
        softwareProjectId,
        title: dto.title,
        content: dto.content,
        fileUrl: dto.fileUrl,
        notes: dto.notes,
        version,
        status: DocStatus.DRAFT,
        createdBy: userId,
      },
    });
  }

  async findByProject(softwareProjectId: string) {
    return this.prisma.requirementDoc.findMany({
      where: { softwareProjectId },
      orderBy: { version: 'desc' },
    });
  }

  async sendToClient(id: string) {
    const doc = await this.prisma.requirementDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Requirement document not found');

    return this.prisma.requirementDoc.update({
      where: { id },
      data: { status: DocStatus.SENT, sentToClientAt: new Date() },
    });
  }

  async markSigned(id: string) {
    const doc = await this.prisma.requirementDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Requirement document not found');

    return this.prisma.requirementDoc.update({
      where: { id },
      data: { status: DocStatus.SIGNED, clientSignedAt: new Date() },
    });
  }

  async markRevised(id: string) {
    const doc = await this.prisma.requirementDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Requirement document not found');

    return this.prisma.requirementDoc.update({
      where: { id },
      data: { status: DocStatus.REVISED },
    });
  }
}
