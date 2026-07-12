import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { DirectIncomeService } from './direct-income.service';
import { CreateDirectIncomeDto } from './dto/create-direct-income.dto';
import { UpdateDirectIncomeDto } from './dto/update-direct-income.dto';
import { DirectIncomeFiltersDto } from './dto/direct-income-filters.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../common/audit/build-audit-context';

@ApiTags('direct-income')
@ApiBearerAuth()
@Controller('finance/income/direct')
export class DirectIncomeController {
  constructor(private readonly directIncomeService: DirectIncomeService) {}

  @Post()
  @RequirePermission('finance.payments', 'write')
  @ApiOperation({ summary: 'Record direct income' })
  async create(
    @Body() dto: CreateDirectIncomeDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.directIncomeService.create(
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Direct income recorded', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @RequirePermission('finance.payments', 'read')
  @ApiOperation({ summary: 'List direct income records' })
  async findAll(@Query() filters: DirectIncomeFiltersDto) {
    const data = await this.directIncomeService.findAll(filters);
    return { data, message: 'Direct income records retrieved', statusCode: HttpStatus.OK };
  }

  @Get('monthly-summary')
  @RequirePermission('finance.payments', 'read')
  @ApiOperation({ summary: 'Monthly income summary by year' })
  async getMonthlySummary(@Query('year') year?: string) {
    const data = await this.directIncomeService.getMonthlySummary(
      year ? Number(year) : undefined,
    );
    return { data, message: 'Monthly summary retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @RequirePermission('finance.payments', 'read')
  @ApiOperation({ summary: 'Get direct income record' })
  async findOne(@Param('id') id: string) {
    const data = await this.directIncomeService.findOne(id);
    return { data, message: 'Record retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('finance.payments', 'write')
  @ApiOperation({ summary: 'Update a direct income record (creator only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDirectIncomeDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.directIncomeService.update(
      id,
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Direct income updated', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('finance.payments', 'write')
  @ApiOperation({ summary: 'Soft-delete direct income record' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.directIncomeService.softDelete(id, user.sub);
    return { data, message: data.message, statusCode: HttpStatus.OK };
  }
}
