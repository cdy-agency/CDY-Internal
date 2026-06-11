import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { RetainersService } from './retainers.service';
import { CreateRetainerDto } from './dto/create-retainer.dto';
import { AmendRetainerDto } from './dto/amend-retainer.dto';
import { RetainerFiltersDto } from './dto/retainer-filters.dto';
import { PauseRetainerDto } from './dto/pause-retainer.dto';
import { EndRetainerDto } from './dto/end-retainer.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../common/audit/build-audit-context';
import { Role } from '@cdy/shared';

@ApiTags('retainers')
@ApiBearerAuth()
@Controller('retainers')
@UseGuards(RolesGuard)
export class RetainersController {
  constructor(private readonly retainersService: RetainersService) {}

  @Post()
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Create retainer contract' })
  async create(
    @Body() dto: CreateRetainerDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.retainersService.create(
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Retainer created', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'List retainer contracts' })
  async findAll(@Query() filters: RetainerFiltersDto) {
    const data = await this.retainersService.findAll(filters);
    return { data, message: 'Retainers retrieved', statusCode: HttpStatus.OK };
  }

  @Get('summary')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'MRR summary' })
  async getSummary() {
    const data = await this.retainersService.getMRRSummary();
    return { data, message: 'MRR summary retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Get retainer contract' })
  async findOne(@Param('id') id: string) {
    const data = await this.retainersService.findOne(id);
    return { data, message: 'Retainer retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id/invoices')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'List invoices for retainer' })
  async findInvoices(@Param('id') id: string) {
    const data = await this.retainersService.findInvoices(id);
    return { data, message: 'Retainer invoices retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Amend retainer contract' })
  async amend(
    @Param('id') id: string,
    @Body() dto: AmendRetainerDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.retainersService.amend(
      id,
      dto,
      buildAuditContext(user, req),
    );
    return { data, message: 'Retainer amended', statusCode: HttpStatus.OK };
  }

  @Post(':id/pause')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Pause retainer' })
  async pause(@Param('id') id: string, @Body() dto: PauseRetainerDto) {
    const data = await this.retainersService.pause(id, dto.reason);
    return { data, message: 'Retainer paused', statusCode: HttpStatus.OK };
  }

  @Post(':id/resume')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Resume retainer' })
  async resume(@Param('id') id: string) {
    const data = await this.retainersService.resume(id);
    return { data, message: 'Retainer resumed', statusCode: HttpStatus.OK };
  }

  @Post(':id/end')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'End retainer contract' })
  async end(@Param('id') id: string, @Body() dto: EndRetainerDto) {
    const data = await this.retainersService.end(id, dto.reason);
    return { data, message: 'Retainer ended', statusCode: HttpStatus.OK };
  }
}
