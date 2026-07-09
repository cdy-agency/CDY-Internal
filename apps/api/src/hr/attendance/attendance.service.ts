import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import {
  endOfMonth,
  parse,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceFiltersDto } from './dto/attendance-filters.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(employeeId: string): Promise<unknown> {
    const today = startOfDay(new Date());

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing?.checkInAt) {
      throw new BadRequestException('Already checked in today');
    }

    if (existing) {
      return this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkInAt: new Date(), status: AttendanceStatus.PRESENT },
      });
    }

    return this.prisma.attendanceRecord.create({
      data: {
        employeeId,
        date: today,
        checkInAt: new Date(),
        status: AttendanceStatus.PRESENT,
      },
    });
  }

  async checkOut(employeeId: string): Promise<unknown> {
    const today = startOfDay(new Date());

    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!record?.checkInAt) {
      throw new BadRequestException('No check-in found for today');
    }

    if (record.checkOutAt) {
      throw new BadRequestException('Already checked out today');
    }

    const checkOut = new Date();
    const workingHours = Number(
      (
        (checkOut.getTime() - record.checkInAt.getTime()) /
        (1000 * 60 * 60)
      ).toFixed(2),
    );

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOutAt: checkOut,
        workingHours,
        status:
          workingHours >= 4
            ? AttendanceStatus.PRESENT
            : AttendanceStatus.HALF_DAY,
      },
    });
  }

  async getTodayStatus(employeeId: string) {
    const today = startOfDay(new Date());
    return this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
  }

  async getMonthlyReport(employeeId: string, month: string) {
    const monthDate = parse(month, 'yyyy-MM', new Date());
    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });

    const excludedStatuses: AttendanceStatus[] = [
      AttendanceStatus.WEEKEND,
      AttendanceStatus.PUBLIC_HOLIDAY,
    ];

    const summary = {
      totalWorkingDays: records.filter(
        (r) => !excludedStatuses.includes(r.status),
      ).length,
      present: records.filter((r) => r.status === AttendanceStatus.PRESENT)
        .length,
      absent: records.filter((r) => r.status === AttendanceStatus.ABSENT)
        .length,
      halfDay: records.filter((r) => r.status === AttendanceStatus.HALF_DAY)
        .length,
      onLeave: records.filter((r) => r.status === AttendanceStatus.ON_LEAVE)
        .length,
      totalHours: records.reduce(
        (s, r) => s + Number(r.workingHours ?? 0),
        0,
      ),
    };

    return { month, employeeId, summary, records };
  }

  async findAll(filters: AttendanceFiltersDto) {
    const dateFilter = filters.date
      ? { date: startOfDay(new Date(filters.date)) }
      : filters.month
        ? {
            date: {
              gte: startOfMonth(parse(filters.month, 'yyyy-MM', new Date())),
              lte: endOfMonth(parse(filters.month, 'yyyy-MM', new Date())),
            },
          }
        : { date: startOfDay(new Date()) };

    return this.prisma.attendanceRecord.findMany({
      where: {
        ...dateFilter,
        ...(filters.employeeId && { employeeId: filters.employeeId }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            departmentId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async manualEntry(
    employeeId: string,
    date: string,
    status: AttendanceStatus,
    recordedBy: string,
    notes?: string,
  ) {
    const day = startOfDay(new Date(date));
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: day } },
    });

    if (existing) {
      return this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status, notes, recordedBy },
      });
    }

    return this.prisma.attendanceRecord.create({
      data: {
        employeeId,
        date: day,
        status,
        notes,
        recordedBy,
      },
    });
  }

  async remove(id: string) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Attendance record not found');

    await this.prisma.attendanceRecord.delete({ where: { id } });
    return { message: 'Attendance record deleted' };
  }

  async getEmployeeByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) throw new NotFoundException('Employee record not found');
    return employee;
  }
}
