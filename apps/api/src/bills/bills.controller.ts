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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { CreateBillDto, PayBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillFiltersDto } from './dto/bill-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('bills')
@ApiBearerAuth()
@Controller('bills')
@UseGuards(RolesGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Create a bill' })
  async create(@Body() dto: CreateBillDto, @CurrentUser() user: JwtPayload) {
    const data = await this.billsService.create(dto, user.sub);
    return {
      data,
      message: 'Bill created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
  @Roles(Role.FINANCE_MANAGER)
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
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Mark bill as paid' })
  async pay(@Param('id') id: string, @Body() dto: PayBillDto) {
    const data = await this.billsService.markAsPaid(id, dto);
    return {
      data,
      message: 'Bill marked as paid',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @Roles(Role.FINANCE_MANAGER)
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
