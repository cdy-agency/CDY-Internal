import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectCodeService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.project.findFirst({
        where: { projectCode: { startsWith: 'CDY-PRJ-' } },
        orderBy: { projectCode: 'desc' },
      });

      const next = latest
        ? parseInt(latest.projectCode.split('-')[2], 10) + 1
        : 1;

      return `CDY-PRJ-${String(next).padStart(3, '0')}`;
    });
  }
}
