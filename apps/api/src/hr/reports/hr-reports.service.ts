import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  EmployeeStatus,
} from '@prisma/client';
import {
  startOfMonth,
  startOfYear,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { HrReportFiltersDto } from './dto/hr-report-filters.dto';

interface EmployeeAttendanceSummary {
  employeeId: string;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  totalHours: number;
}

@Injectable()
export class HrReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHeadcountReport(_filters: HrReportFiltersDto) {
    const employees = await this.prisma.employee.findMany({
      where: { deletedAt: null },
      include: { department: true },
    });

    const byDepartment = employees.reduce<Record<string, number>>((acc, e) => {
      const dept = e.department?.name ?? 'Unassigned';
      acc[dept] = (acc[dept] ?? 0) + 1;
      return acc;
    }, {});

    const byStatus = employees.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {});

    const byType = employees.reduce<Record<string, number>>((acc, e) => {
      acc[e.employmentType] = (acc[e.employmentType] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total: employees.length,
      active: byStatus[EmployeeStatus.ACTIVE] ?? 0,
      byDepartment,
      byStatus,
      byEmploymentType: byType,
    };
  }

  async getTurnoverReport(filters: HrReportFiltersDto) {
    const from = filters.from ? new Date(filters.from) : startOfYear(new Date());
    const to = filters.to ? new Date(filters.to) : new Date();

    const newHires = await this.prisma.employee.count({
      where: { startDate: { gte: from, lte: to }, deletedAt: null },
    });

    const terminations = await this.prisma.employee.count({
      where: {
        status: { in: [EmployeeStatus.TERMINATED, EmployeeStatus.RESIGNED] },
        endDate: { gte: from, lte: to },
      },
    });

    const avgHeadcount = await this.prisma.employee.count({
      where: { status: EmployeeStatus.ACTIVE, deletedAt: null },
    });

    const turnoverRate =
      avgHeadcount > 0
        ? Number(((terminations / avgHeadcount) * 100).toFixed(2))
        : 0;

    const terminated = await this.prisma.employee.findMany({
      where: {
        status: { in: [EmployeeStatus.TERMINATED, EmployeeStatus.RESIGNED] },
        endDate: { gte: from, lte: to },
      },
      include: { department: true },
      orderBy: { endDate: 'desc' },
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      newHires,
      terminations,
      turnoverRate,
      avgHeadcount,
      terminated: terminated.map((e) => ({
        name: `${e.firstName} ${e.lastName}`,
        department: e.department?.name ?? null,
        endDate: e.endDate?.toISOString() ?? null,
        status: e.status,
      })),
    };
  }

  async getLeaveUtilisationReport(year: number) {
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { isActive: true, defaultDaysPerYear: { gt: 0 } },
    });

    const balances = await this.prisma.leaveBalance.findMany({
      where: { year },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
        leaveType: true,
      },
    });

    const byType = leaveTypes.map((lt) => {
      const typeBalances = balances.filter((b) => b.leaveTypeId === lt.id);
      const totalEntitled = typeBalances.reduce(
        (s, b) => s + Number(b.entitled),
        0,
      );
      const totalUsed = typeBalances.reduce((s, b) => s + Number(b.used), 0);
      const utilisationRate =
        totalEntitled > 0
          ? Number(((totalUsed / totalEntitled) * 100).toFixed(2))
          : 0;

      return {
        leaveType: lt.name,
        employees: typeBalances.length,
        totalEntitled,
        totalUsed,
        utilisationRate,
        avgUsedPerEmployee:
          typeBalances.length > 0
            ? Number((totalUsed / typeBalances.length).toFixed(2))
            : 0,
      };
    });

    return {
      year,
      byType,
      balances: balances.map((b) => ({
        employeeName: `${b.employee.firstName} ${b.employee.lastName}`,
        leaveType: b.leaveType.name,
        entitled: Number(b.entitled),
        used: Number(b.used),
        remaining: Number(b.remaining),
      })),
    };
  }

  async getAttendanceSummary(filters: HrReportFiltersDto) {
    const from = filters.from ? new Date(filters.from) : startOfMonth(new Date());
    const to = filters.to ? new Date(filters.to) : new Date();

    const records = await this.prisma.attendanceRecord.groupBy({
      by: ['employeeId', 'status'],
      where: { date: { gte: from, lte: to } },
      _count: { id: true },
      _sum: { workingHours: true },
    });

    const byEmployee = records.reduce<Record<string, EmployeeAttendanceSummary>>(
      (acc, r) => {
        if (!acc[r.employeeId]) {
          acc[r.employeeId] = {
            employeeId: r.employeeId,
            present: 0,
            absent: 0,
            halfDay: 0,
            onLeave: 0,
            totalHours: 0,
          };
        }
        const emp = acc[r.employeeId];
        const count = r._count.id;
        switch (r.status) {
          case AttendanceStatus.PRESENT:
            emp.present += count;
            break;
          case AttendanceStatus.ABSENT:
            emp.absent += count;
            break;
          case AttendanceStatus.HALF_DAY:
            emp.halfDay += count;
            break;
          case AttendanceStatus.ON_LEAVE:
            emp.onLeave += count;
            break;
          default:
            break;
        }
        emp.totalHours += Number(r._sum.workingHours ?? 0);
        return acc;
      },
      {},
    );

    const employeeIds = Object.keys(byEmployee);
    const employees =
      employeeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const nameMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]),
    );

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: Object.values(byEmployee).map((s) => ({
        ...s,
        employeeName: nameMap.get(s.employeeId) ?? 'Unknown',
      })),
    };
  }

  async getProductivityStub() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const [todayRecords, weekRecords, activeCount] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { date: today },
        select: { status: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: weekStart, lte: weekEnd } },
        select: { employeeId: true, workingHours: true, checkInAt: true },
      }),
      this.prisma.employee.count({
        where: { status: EmployeeStatus.ACTIVE, deletedAt: null },
      }),
    ]);

    const present = todayRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    const absent = todayRecords.filter(
      (r) => r.status === AttendanceStatus.ABSENT,
    ).length;
    const onLeave = todayRecords.filter(
      (r) => r.status === AttendanceStatus.ON_LEAVE,
    ).length;

    const employeesWithCheckIn = new Set(
      weekRecords.filter((r) => r.checkInAt).map((r) => r.employeeId),
    );
    const totalHours = weekRecords.reduce(
      (s, r) => s + Number(r.workingHours ?? 0),
      0,
    );
    const daysWithRecords = Math.max(
      1,
      Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );

    return {
      teamAttendanceToday: {
        present,
        absent,
        onLeave,
        total: activeCount,
      },
      avgWorkingHoursThisWeek: Number(
        (totalHours / Math.max(activeCount, 1) / daysWithRecords).toFixed(2),
      ),
      employeesWithNoActivityThisWeek: Math.max(
        0,
        activeCount - employeesWithCheckIn.size,
      ),
      tasksCompletedThisWeek: null as number | null,
      openTasksCount: null as number | null,
      note: 'Full productivity data available after Projects module is deployed',
    };
  }
}
