import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMarketingClientDto,
  UpdateMarketingClientDto,
} from './dto/create-marketing-client.dto';

@Injectable()
export class MarketingClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMarketingClientDto, userId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found in CRM');

    const existing = await this.prisma.marketingClient.findUnique({
      where: { clientId: dto.clientId },
    });
    if (existing)
      throw new ConflictException(
        'Marketing service already set up for this client',
      );

    return this.prisma.marketingClient.create({
      data: { ...dto, createdBy: userId },
      include: {
        client: { select: { companyName: true, contactName: true } },
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
      include: { client: true },
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
      },
    });
  }
}
