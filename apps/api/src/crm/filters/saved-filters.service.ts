import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SavedFiltersService {
  constructor(private readonly prisma: PrismaService) {}

  async save(
    userId: string,
    module: string,
    name: string,
    filters: Record<string, unknown>,
  ) {
    return this.prisma.savedFilter.create({
      data: {
        userId,
        module,
        name,
        filters: filters as Prisma.InputJsonValue,
      },
    });
  }

  async findMy(userId: string, module: string) {
    return this.prisma.savedFilter.findMany({
      where: { userId, module },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, userId: string) {
    const filter = await this.prisma.savedFilter.findUnique({ where: { id } });
    if (!filter || filter.userId !== userId) {
      throw new ForbiddenException('Cannot delete this filter');
    }
    return this.prisma.savedFilter.delete({ where: { id } });
  }
}
