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
import { buildAuditContext } from '../common/audit/build-audit-context';
import { BillsService } from './bills.service';
import { CreateBillDto, PayBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillFiltersDto } from './dto/bill-filters.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('bills')
@ApiBearerAuth()
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  @RequirePermission('finance.bills', 'write')
  @ApiOperation({ summary: 'Create a bill' })
  async create(
    @Body() dto: CreateBillDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.billsService.create(
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return {
      data,
      message: 'Bill created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  @RequirePermission('finance.bills', 'read')
  @ApiOperation({ summary: 'List bills with filters' })
  async findAll(@Query() filters: BillFiltersDto) {
    const data = await this.billsService.findAll(filters);
    return {
      data,
      message: 'Bills retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':id')
  @RequirePermission('finance.bills', 'read')
  @ApiOperation({ summary: 'Get bill by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.billsService.findOne(id);
    return {
      data,
      message: 'Bill retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id')
  @RequirePermission('finance.bills', 'write')
  @ApiOperation({ summary: 'Update a bill' })
  async update(@Param('id') id: string, @Body() dto: UpdateBillDto) {
    const data = await this.billsService.update(id, dto);
    return {
      data,
      message: 'Bill updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/pay')
  @RequirePermission('finance.bills', 'write')
  @ApiOperation({ summary: 'Mark bill as paid' })
  async pay(
    @Param('id') id: string,
    @Body() dto: PayBillDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.billsService.markAsPaid(
      id,
      dto,
      buildAuditContext(user, req),
    );
    return {
      data,
      message: 'Bill marked as paid',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @RequirePermission('finance.bills', 'write')
  @ApiOperation({ summary: 'Soft-delete a bill' })
  async remove(@Param('id') id: string) {
    const data = await this.billsService.softDelete(id);
    return {
      data,
      message: data.message,
      statusCode: HttpStatus.OK,
    };
  }
}
