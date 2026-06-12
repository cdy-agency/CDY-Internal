import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../../common/audit/build-audit-context';
import { LeaveService } from './leave.service';
import { LeaveBalanceService } from './leave-balance.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { LeaveFiltersDto } from './dto/leave-filters.dto';
import { HrSummaryService } from '../hr-summary.service';

@ApiTags('hr-leave')
@ApiBearerAuth()
@Controller('hr')
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly attendanceService: AttendanceService,
    private readonly hrSummaryService: HrSummaryService,
  ) {}

  @Get('summary')
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'HR dashboard summary' })
  async getSummary() {
    const data = await this.hrSummaryService.getSummary();
    return { data, message: 'Summary retrieved', statusCode: HttpStatus.OK };
  }

  @Get('leave-types')
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'List leave types' })
  async findLeaveTypes() {
    const data = await this.leaveService.findLeaveTypes();
    return { data, message: 'Leave types retrieved', statusCode: HttpStatus.OK };
  }

  @Post('leave-types')
  @RequirePermission('hr.settings', 'write')
  @ApiOperation({ summary: 'Create leave type' })
  async createLeaveType(
    @Body()
    dto: {
      name: string;
      code: string;
      defaultDaysPerYear: number;
      isPaid: boolean;
      requiresApproval: boolean;
      requiresDocument: boolean;
    },
  ) {
    const data = await this.leaveService.createLeaveType(dto);
    return { data, message: 'Leave type created', statusCode: HttpStatus.CREATED };
  }

  @Patch('leave-types/:id')
  @RequirePermission('hr.settings', 'write')
  @ApiOperation({ summary: 'Update leave type' })
  async updateLeaveType(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      name: string;
      defaultDaysPerYear: number;
      isPaid: boolean;
      requiresApproval: boolean;
      requiresDocument: boolean;
      isActive: boolean;
    }>,
  ) {
    const data = await this.leaveService.updateLeaveType(id, dto);
    return { data, message: 'Leave type updated', statusCode: HttpStatus.OK };
  }

  @Post('leave')
  @RequirePermission('hr.attendance', 'write')
  @ApiOperation({ summary: 'Submit leave request' })
  async submitRequest(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const employee = await this.attendanceService.getEmployeeByUserId(user.sub);
    const data = await this.leaveService.submitRequest(
      employee.id,
      dto,
      user.sub,
    );
    await this.hrSummaryService.invalidateSummaryCache();
    return { data, message: 'Leave request submitted', statusCode: HttpStatus.CREATED };
  }

  @Get('leave/my')
  @ApiOperation({ summary: 'Own leave requests' })
  async findMyRequests(@CurrentUser() user: JwtPayload) {
    const employee = await this.attendanceService.getEmployeeByUserId(user.sub);
    const data = await this.leaveService.findMyRequests(employee.id);
    return { data, message: 'Requests retrieved', statusCode: HttpStatus.OK };
  }

  @Get('leave-balances/me')
  @ApiOperation({ summary: 'Own leave balances' })
  async findMyBalances(@CurrentUser() user: JwtPayload) {
    const employee = await this.attendanceService.getEmployeeByUserId(user.sub);
    const year = new Date().getFullYear();
    const data = await this.leaveBalanceService.getBalances(employee.id, year);
    return { data, message: 'Balances retrieved', statusCode: HttpStatus.OK };
  }

  @Get('employees/:employeeId/leave-balances')
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'Employee leave balances' })
  async getEmployeeBalances(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const data = await this.leaveBalanceService.getBalances(employeeId, y);
    return { data, message: 'Balances retrieved', statusCode: HttpStatus.OK };
  }

  @Get('leave')
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'List leave requests' })
  async findAll(@Query() filters: LeaveFiltersDto) {
    const data = await this.leaveService.findAll(filters);
    return { data, message: 'Requests retrieved', statusCode: HttpStatus.OK };
  }

  @Get('leave/:id')
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'Get leave request' })
  async findOne(@Param('id') id: string) {
    const data = await this.leaveService.findOne(id);
    return { data, message: 'Request retrieved', statusCode: HttpStatus.OK };
  }

  @Patch('leave/:id/review')
  @RequirePermission('hr.attendance', 'write')
  @ApiOperation({ summary: 'Approve or reject leave request' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewLeaveRequestDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const reviewer = await this.attendanceService.getEmployeeByUserId(user.sub);
    const data = await this.leaveService.reviewRequest(
      id,
      dto,
      reviewer.id,
      buildAuditContext(user, req),
    );
    await this.hrSummaryService.invalidateSummaryCache();
    return { data, message: 'Request reviewed', statusCode: HttpStatus.OK };
  }

  @Patch('leave/:id/cancel')
  @ApiOperation({ summary: 'Cancel own pending leave request' })
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const employee = await this.attendanceService.getEmployeeByUserId(user.sub);
    const data = await this.leaveService.cancelRequest(id, employee.id);
    await this.hrSummaryService.invalidateSummaryCache();
    return { data, message: 'Request cancelled', statusCode: HttpStatus.OK };
  }
}
