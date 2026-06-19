import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInfluencerDto } from './dto/create-influencer.dto';

@Injectable()
export class InfluencersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInfluencerDto, userId: string) {
    return this.prisma.influencer.create({
      data: {
        name: dto.name,
        handle: dto.handle,
        platform: dto.platform,
        otherPlatforms: dto.otherPlatforms ?? [],
        followersCount: dto.followersCount,
        email: dto.email,
        phone: dto.phone,
        location: dto.location,
        category: dto.category,
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  async findAll(filters?: {
    platform?: string;
    category?: string;
    search?: string;
  }) {
    return this.prisma.influencer.findMany({
      where: {
        isActive: true,
        ...(filters?.platform && { platform: filters.platform }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { handle: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        _count: { select: { assignments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.influencer.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                startDate: true,
                status: true,
                client: { select: { companyName: true } },
              },
            },
            deliverables: { select: { id: true } },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, dto: Partial<CreateInfluencerDto>) {
    return this.prisma.influencer.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    return this.prisma.influencer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
