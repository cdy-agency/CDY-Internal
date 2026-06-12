import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SetHourlyRateDto, UpdateHourlyRateDto } from '../approvals/approval.dto';

@Injectable()
export class HourlyRateService {
  constructor(private readonly prisma: PrismaService) {}

  async setRate(dto: SetHourlyRateDto, userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const rate = await this.prisma.hourlyRate.upsert({
      where: { employeeId: dto.employeeId },
      create: {
        employeeId: dto.employeeId,
        ratePerHour: dto.ratePerHour,
        currency: dto.currency ?? 'USD',
        createdBy: userId,
      },
      update: {
        ratePerHour: dto.ratePerHour,
        currency: dto.currency ?? 'USD',
        effectiveFrom: new Date(),
      },
    });

    return this.serializeRate(rate, employee.firstName, employee.lastName);
  }

  async updateRate(
    employeeId: string,
    dto: UpdateHourlyRateDto,
    userId: string,
  ) {
    return this.setRate({ employeeId, ...dto }, userId);
  }

  async getAllRates() {
    const rates = await this.prisma.hourlyRate.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const employeeIds = rates.map((r) => r.employeeId);
    const employees =
      employeeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const empMap = new Map(employees.map((e) => [e.id, e]));

    return rates.map((rate) => {
      const emp = empMap.get(rate.employeeId);
      return this.serializeRate(
        rate,
        emp?.firstName ?? 'Unknown',
        emp?.lastName ?? '',
      );
    });
  }

  async getRate(employeeId: string): Promise<number> {
    const rate = await this.prisma.hourlyRate.findUnique({
      where: { employeeId },
    });

    if (rate) return Number(rate.ratePerHour);

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (employee) {
      return Number((Number(employee.baseSalary) / 22 / 8).toFixed(2));
    }

    return 0;
  }

  async getTeamRates(employeeIds: string[]): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    await Promise.all(
      employeeIds.map(async (id) => {
        rates[id] = await this.getRate(id);
      }),
    );
    return rates;
  }

  private serializeRate(
    rate: {
      id: string;
      employeeId: string;
      ratePerHour: { toString(): string } | number;
      currency: string;
      effectiveFrom: Date;
      createdAt: Date;
      updatedAt: Date;
    },
    firstName: string,
    lastName: string,
  ) {
    return {
      id: rate.id,
      employeeId: rate.employeeId,
      employeeName: `${firstName} ${lastName}`.trim(),
      ratePerHour: Number(rate.ratePerHour),
      currency: rate.currency,
      effectiveFrom: rate.effectiveFrom.toISOString(),
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    };
  }
}
