import {
  Body,
  Controller,
  Delete,
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
import { AllowAuthenticated } from '../../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../../common/audit/build-audit-context';
import { PerformanceReviewService } from '../performance/performance-review.service';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFiltersDto } from './dto/employee-filters.dto';
import { TerminateEmployeeDto } from './dto/terminate-employee.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';

@ApiTags('hr-employees')
@ApiBearerAuth()
@Controller('hr/employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly performanceReviewService: PerformanceReviewService,
  ) {}

  @Get('me')
  @AllowAuthenticated()
  @ApiOperation({ summary: 'Get own employee profile' })
  async findMe(@CurrentUser() user: JwtPayload) {
    const data = await this.employeesService.findByUserId(user.sub);
    return { data, message: 'Profile retrieved', statusCode: HttpStatus.OK };
  }

  @Patch('me')
  @AllowAuthenticated()
  @ApiOperation({ summary: 'Update own limited profile fields' })
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const data = await this.employeesService.updateOwnProfile(user.sub, dto);
    return { data, message: 'Profile updated', statusCode: HttpStatus.OK };
  }

  @Get('available-users')
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Users without employee records' })
  async availableUsers() {
    const data = await this.employeesService.findUsersWithoutEmployeeRecord();
    return { data, message: 'Users retrieved', statusCode: HttpStatus.OK };
  }

  @Get()
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'List employees' })
  async findAll(
    @Query() filters: EmployeeFiltersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.employeesService.findAll(filters, {
      id: user.sub,
    });
    return { data, message: 'Employees retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Create employee' })
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.employeesService.create(
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Employee created', statusCode: HttpStatus.CREATED };
  }

  @Get(':id/performance')
  @RequirePermission('hr.performance', 'read')
  @ApiOperation({ summary: 'Employee performance reviews' })
  async getPerformance(@Param('id') id: string) {
    const data = await this.performanceReviewService.getByEmployee(id);
    return { data, message: 'Performance reviews retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id/salary')
  @RequirePermission('hr.payroll', 'read')
  @ApiOperation({ summary: 'Employee salary history' })
  async getSalary(@Param('id') id: string) {
    const data = await this.employeesService.getSalaryHistory(id);
    return { data, message: 'Salary history retrieved', statusCode: HttpStatus.OK };
  }

  @Post(':id/salary')
  @RequirePermission('hr.payroll', 'write')
  @ApiOperation({ summary: 'Update employee salary' })
  async updateSalary(
    @Param('id') id: string,
    @Body() dto: UpdateSalaryDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.employeesService.updateSalary(
      id,
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Salary updated', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'Get employee by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.employeesService.findOne(id, user.sub);
    return { data, message: 'Employee retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Update employee' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.employeesService.update(
      id,
      dto,
      buildAuditContext(user, req),
    );
    return { data, message: 'Employee updated', statusCode: HttpStatus.OK };
  }

  @Post(':id/terminate')
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Terminate employee' })
  async terminate(
    @Param('id') id: string,
    @Body() dto: TerminateEmployeeDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.employeesService.terminate(
      id,
      dto,
      buildAuditContext(user, req),
    );
    return { data, message: 'Employee terminated', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Soft-delete employee' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.employeesService.remove(
      id,
      buildAuditContext(user, req),
    );
    return { data, message: 'Employee deleted', statusCode: HttpStatus.OK };
  }
}
