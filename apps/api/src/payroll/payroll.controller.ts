import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { AdjustLineItemDto } from './dto/adjust-line-item.dto';
import { PayrollFiltersDto } from './dto/payroll-filters.dto';
import {
  CreateEmployeeSalaryDto,
  UpdateEmployeeSalaryDto,
} from './dto/create-employee-salary.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('payroll')
@UseGuards(RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('runs')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Create payroll run for a month' })
  async createRun(
    @Body() dto: CreatePayrollRunDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.payrollService.createRun(dto, user.sub);
    return { data, message: 'Payroll run created', statusCode: HttpStatus.CREATED };
  }

  @Get('runs/preview')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Preview payroll run totals before creating' })
  async previewRun(@Query() filters: PayrollFiltersDto) {
    const data = await this.payrollService.getPayrollPreview(
      filters.month ?? new Date().toISOString().slice(0, 7),
    );
    return { data, message: 'Payroll preview', statusCode: HttpStatus.OK };
  }

  @Get('runs')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'List payroll runs' })
  async findAllRuns(@Query() filters: PayrollFiltersDto) {
    const data = await this.payrollService.findAllRuns(filters.month);
    return { data, message: 'Payroll runs retrieved', statusCode: HttpStatus.OK };
  }

  @Get('runs/:id')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Get payroll run by ID' })
  async findRun(@Param('id') id: string) {
    const data = await this.payrollService.findRun(id);
    return { data, message: 'Payroll run retrieved', statusCode: HttpStatus.OK };
  }

  @Patch('runs/:id/items/:itemId')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Adjust payroll line item' })
  async adjustLineItem(
    @Param('id') runId: string,
    @Param('itemId') itemId: string,
    @Body() dto: AdjustLineItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.payrollService.adjustLineItem(
      runId,
      itemId,
      dto,
      user.sub,
    );
    return { data, message: 'Line item adjusted', statusCode: HttpStatus.OK };
  }

  @Post('runs/:id/process')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Process payroll run and send payslips' })
  async processRun(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.payrollService.processRun(id, user.sub);
    return { data, message: 'Payroll processed', statusCode: HttpStatus.OK };
  }

  @Post('runs/:id/lock')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Lock payroll run' })
  async lockRun(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.payrollService.lockRun(id, user.sub);
    return { data, message: 'Payroll run locked', statusCode: HttpStatus.OK };
  }

  @Get('runs/:id/items/:itemId/payslip')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Download payslip PDF' })
  async downloadPayslip(
    @Param('id') runId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.payrollService.getPayslipPdf(
      runId,
      itemId,
      user.sub,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip-${itemId}.pdf"`,
    );
    res.send(buffer);
  }

  @Post('salaries')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Create employee salary record' })
  async createSalary(
    @Body() dto: CreateEmployeeSalaryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.payrollService.createSalary(dto, user.sub);
    return { data, message: 'Salary created', statusCode: HttpStatus.CREATED };
  }

  @Get('salaries')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'List employee salaries' })
  async findAllSalaries() {
    const data = await this.payrollService.findAllSalaries();
    return { data, message: 'Salaries retrieved', statusCode: HttpStatus.OK };
  }

  @Patch('salaries/:id')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Update employee salary' })
  async updateSalary(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeSalaryDto,
  ) {
    const data = await this.payrollService.updateSalary(id, dto);
    return { data, message: 'Salary updated', statusCode: HttpStatus.OK };
  }
}
