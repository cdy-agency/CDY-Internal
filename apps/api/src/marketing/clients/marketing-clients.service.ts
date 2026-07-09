import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, RetainerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMarketingClientDto,
  UpdateMarketingClientDto,
} from './dto/create-marketing-client.dto';

@Injectable()
export class MarketingClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMarketingClientDto, userId: string) {
    const retainer = await this.prisma.retainerContract.findUnique({
      where: { id: dto.retainerId },
      include: { client: { select: { id: true, companyName: true } } },
    });
    if (!retainer) throw new NotFoundException('Retainer contract not found');
    if (retainer.status !== RetainerStatus.ACTIVE) {
      throw new BadRequestException('Retainer must be ACTIVE to link a marketing client');
    }

    const existing = await this.prisma.marketingClient.findUnique({
      where: { retainerId: dto.retainerId },
    });
    if (existing) {
      throw new ConflictException('Marketing service already set up for this retainer');
    }

    return this.prisma.marketingClient.create({
      data: {
        retainerId: dto.retainerId,
        clientId: retainer.client.id,
        projectId: dto.projectId,
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
