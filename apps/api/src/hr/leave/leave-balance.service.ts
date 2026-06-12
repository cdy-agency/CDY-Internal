import { Injectable } from '@nestjs/common';
import { LeaveStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async initialiseForEmployee(employeeId: string): Promise<void> {
    const currentYear = new Date().getFullYear();
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { isActive: true },
    });

    await this.prisma.leaveBalance.createMany({
      data: leaveTypes.map((lt) => ({
        employeeId,
        leaveTypeId: lt.id,
        year: currentYear,
        entitled: lt.defaultDaysPerYear,
        used: 0,
        pending: 0,
        remaining: lt.defaultDaysPerYear,
        carryOver: 0,
      })),
      skipDuplicates: true,
    });
  }

  async getBalances(employeeId: string, year: number) {
    return this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
      orderBy: { leaveType: { name: 'asc' } },
    });
  }

  async recalculate(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<void> {
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year + 1}-01-01`);

    const approved = await this.prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: LeaveStatus.APPROVED,
        startDate: { gte: yearStart, lt: yearEnd },
      },
      _sum: { totalDays: true },
    });

    const pending = await this.prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: LeaveStatus.PENDING,
        startDate: { gte: yearStart, lt: yearEnd },
      },
      _sum: { totalDays: true },
    });

    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
    });

    if (!balance) return;

    const usedDays = Number(approved._sum.totalDays ?? 0);
    const pendingDays = Number(pending._sum.totalDays ?? 0);
    const remaining =
      Number(balance.entitled) +
      Number(balance.carryOver) -
      usedDays -
      pendingDays;

    await this.prisma.leaveBalance.update({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
      data: {
        used: usedDays,
        pending: pendingDays,
        remaining: Math.max(0, remaining),
      },
    });
  }
}
