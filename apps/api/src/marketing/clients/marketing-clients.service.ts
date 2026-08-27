import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentStatus,
  ProjectPriority,
  ProjectStatus,
  RetainerStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectCodeService } from '../../projects/projects/project-code.service';
import {
  CreateMarketingClientDto,
  UpdateMarketingClientDto,
} from './dto/create-marketing-client.dto';

@Injectable()
export class MarketingClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectCodeService: ProjectCodeService,
  ) {}

  async create(dto: CreateMarketingClientDto, userId: string) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id: dto.retainerId },
      include: { client: { select: { id: true, companyName: true } } },
    });
    if (!retainer) throw new NotFoundException('Retainer contract not found');
    if (retainer.status !== RetainerStatus.ACTIVE) {
      throw new BadRequestException('Retainer must be ACTIVE to link a marketing client');
    }

    // retainerId is no longer @unique in the schema — a retainer can carry
    // several soft-deleted MarketingClient rows over time (see
    // MarketingClient.retainerId) — so this must look for an ACTIVE one
    // specifically, not just any row. findFirst() is soft-delete-aware
    // (deletedAt: null is applied automatically), matching lookup()'s
    // "unlinked" check in retainers.service.ts.
    const existing = await this.prisma.marketingClient.findFirst({
      where: { retainerId: dto.retainerId },
    });
    if (existing) {
      throw new ConflictException('Marketing service already set up for this retainer');
    }

    // Every marketing client gets its own Project in the general Projects
    // module — this is what lets tasks actually be created/assigned for it
    // (a MarketingClient has no task system of its own).
    const projectCode = await this.projectCodeService.generate();
    const clientName = retainer.client.companyName ?? 'Client';

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          projectCode,
          name: `${clientName} — Marketing`,
          clientId: retainer.client.id,
          serviceType: 'marketing',
          status: ProjectStatus.ACTIVE,
          priority: ProjectPriority.MEDIUM,
          managerId: userId,
          startDate: new Date(),
          createdBy: userId,
        },
      });

      // Backfill the client's generic project link only if it doesn't
      // already point somewhere else (mirrors ClientServiceService's
      // GENERAL-branch behavior for the same field).
      await tx.client.updateMany({
        where: { id: retainer.client.id, projectId: null },
        data: { projectId: project.id },
      });

      return tx.marketingClient.create({
        data: {
          retainerId: dto.retainerId,
          clientId: retainer.client.id,
          projectId: project.id,
          platforms: dto.platforms,
          postsPerMonth: dto.postsPerMonth,
          notes: dto.notes,
          createdBy: userId,
        },
        include: {
          client: { select: { companyName: true, contactName: true } },
          retainer: { select: { serviceName: true, status: true } },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.marketingClient.findMany({
      where: { isActive: true },
      include: {
        client: {
          select: { companyName: true, contactName: true, email: true },
        },
        retainer: { select: { serviceName: true, status: true } },
        _count: {
          select: {
            contentItems: {
              where: {
                deletedAt: null,
                status: { notIn: [ContentStatus.CANCELLED] },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const mc = await this.prisma.marketingClient.findUnique({
      where: { id },
      include: {
        client: true,
        retainer: { select: { serviceName: true, status: true, amount: true, currency: true } },
      },
    });
    if (!mc) throw new NotFoundException('Marketing client not found');
    return mc;
  }

  async update(id: string, dto: UpdateMarketingClientDto) {
    await this.findOne(id);
    return this.prisma.marketingClient.update({
      where: { id },
      data: dto,
      include: {
        client: { select: { companyName: true, contactName: true } },
        retainer: { select: { serviceName: true, status: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.marketingClient.delete({ where: { id } });
    return { message: 'Marketing client deleted' };
  }
}
