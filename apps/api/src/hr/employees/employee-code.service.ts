import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmployeeCodeService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.employee.findFirst({
        where: { employeeCode: { startsWith: 'CDY-EMP-' } },
        orderBy: { employeeCode: 'desc' },
      });

      const nextNum = latest
        ? parseInt(latest.employeeCode.split('-')[2], 10) + 1
        : 1;

      return `CDY-EMP-${String(nextNum).padStart(3, '0')}`;
    });
  }
}
