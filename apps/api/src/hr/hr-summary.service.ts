import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  EmployeeStatus,
  LeaveStatus,
} from '@prisma/client';
import { addDays, startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const HR_SUMMARY_CACHE_KEY = 'hr:summary';

@Injectable()
export class HrSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getSummary() {
    const cached = await this.cache.get<object>(HR_SUMMARY_CACHE_KEY);
    if (cached) return cached;

    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const in14Days = addDays(today, 14);

    const [
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      newThisMonth,
      byDepartment,
      byStatus,
      pendingLeaveRequests,
      todayAttendance,
      upcomingLeave,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { deletedAt: null } }),
      this.prisma.employee.count({
        where: { deletedAt: null, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: LeaveStatus.APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      this.prisma.employee.count({
        where: { deletedAt: null, createdAt: { gte: monthStart } },
      }),
      this.prisma.employee.groupBy({
        by: ['departmentId'],
        where: { deletedAt: null, status: EmployeeStatus.ACTIVE },
        _count: { id: true },
      }),
      this.prisma.employee.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
      this.prisma.attendanceRecord.findMany({
        where: { date: today },
        select: { status: true, employeeId: true },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          status: LeaveStatus.APPROVED,
          startDate: { gte: today, lte: in14Days },
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
          leaveType: { select: { name: true } },
        },
        orderBy: { startDate: 'asc' },
        take: 10,
      }),
    ]);

    const deptIds = byDepartment
      .map((d) => d.departmentId)
      .filter((id): id is string => id != null);
    const departments =
      deptIds.length > 0
        ? await this.prisma.department.findMany({
            where: { id: { in: deptIds } },
            select: { id: true, name: true },
          })
        : [];
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    const checkedIn = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.PRESENT,
    ).length;
    const onLeaveAtt = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.ON_LEAVE,
    ).length;

    const summary = {
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      newThisMonth,
      byDepartment: byDepartment.map((d) => ({
        department: d.departmentId
          ? (deptMap.get(d.departmentId) ?? 'Unassigned')
          : 'Unassigned',
        count: d._count.id,
      })),
      byStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count.id]),
      ) as Record<EmployeeStatus, number>,
      pendingLeaveRequests,
      attendanceToday: {
        checkedIn,
        notYetCheckedIn: Math.max(0, activeEmployees - checkedIn - onLeaveAtt),
        onLeave: onLeaveAtt,
      },
      upcomingLeave: upcomingLeave.map((l) => ({
        employeeId: l.employee.id,
        employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
        leaveType: l.leaveType.name,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        totalDays: Number(l.totalDays),
      })),
    };

    await this.cache.set(HR_SUMMARY_CACHE_KEY, summary, 120);
    return summary;
  }

  async invalidateSummaryCache(): Promise<void> {
    await this.cache.del(HR_SUMMARY_CACHE_KEY);
  }
}
