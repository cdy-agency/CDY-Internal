import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { AttendanceFiltersDto } from './dto/attendance-filters.dto';
import { HrSummaryService } from '../hr-summary.service';

@ApiTags('hr-attendance')
@ApiBearerAuth()
@Controller('hr/attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly hrSummaryService: HrSummaryService,
  ) {}

  @Post('check-in')
  @RequirePermission('hr.attendance', 'write')
  @ApiOperation({ summary: 'Check in for today' })
  async checkIn(@CurrentUser() user: JwtPayload) {
    const employee = await this.attendanceService.getEmployeeByUserId(user.sub);
    const data = await this.attendanceService.checkIn(employee.id);
    await this.hrSummaryService.invalidateSummaryCache();
    return { data, message: 'Checked in', statusCode: HttpStatus.OK };
  }

  @Post('check-out')
  @RequirePermission('hr.attendance', 'write')
  @ApiOperation({ summary: 'Check out for today' })
  async checkOut(@CurrentUser() user: JwtPayload) {
    const employee = await this.attendanceService.getEmployeeByUserId(user.sub);
    const data = await this.attendanceService.checkOut(employee.id);
    await this.hrSummaryService.invalidateSummaryCache();
    return { data, message: 'Checked out', statusCode: HttpStatus.OK };
  }

  @Get('me')
  @ApiOperation({ summary: 'Own attendance today and monthly report' })
  async findMy(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
  ) {
    const employee = await this.attendanceService.getEmployeeByUserId(user.sub);
    const monthKey = month ?? new Date().toISOString().slice(0, 7);
    const [today, report] = await Promise.all([
      this.attendanceService.getTodayStatus(employee.id),
      this.attendanceService.getMonthlyReport(employee.id, monthKey),
    ]);
    return {
      data: { today, report },
      message: 'Attendance retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('report')
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'Monthly attendance report for employee' })
  async getReport(
    @Query('employeeId') employeeId: string,
    @Query('month') month: string,
  ) {
    const data = await this.attendanceService.getMonthlyReport(
      employeeId,
      month,
    );
    return { data, message: 'Report retrieved', statusCode: HttpStatus.OK };
  }

  @Get()
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'List attendance records' })
  async findAll(@Query() filters: AttendanceFiltersDto) {
    const data = await this.attendanceService.findAll(filters);
    return { data, message: 'Attendance retrieved', statusCode: HttpStatus.OK };
  }

  @Post('manual')
  @RequirePermission('hr.attendance', 'write')
  @ApiOperation({ summary: 'Manual attendance entry' })
  async manualEntry(
    @Body()
    dto: {
      employeeId: string;
      date: string;
      status: AttendanceStatus;
      notes?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.attendanceService.manualEntry(
      dto.employeeId,
      dto.date,
      dto.status,
      user.sub,
      dto.notes,
    );
    await this.hrSummaryService.invalidateSummaryCache();
    return { data, message: 'Entry recorded', statusCode: HttpStatus.OK };
  }
}
