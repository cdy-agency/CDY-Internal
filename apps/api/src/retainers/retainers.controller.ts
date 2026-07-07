import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ExtendRetainerDto } from './dto/extend-retainer.dto';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../common/audit/build-audit-context';

@ApiTags('retainers')
@ApiBearerAuth()
@Controller('retainers')
export class RetainersController {
  constructor(private readonly retainersService: RetainersService) {}

  @Post()
  @RequirePermission('finance.retainers', 'write')
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
  @RequirePermission('finance.retainers', 'read')
  @ApiOperation({ summary: 'List retainer contracts' })
  async findAll(@Query() filters: RetainerFiltersDto) {
    const data = await this.retainersService.findAll(filters);
    return { data, message: 'Retainers retrieved', statusCode: HttpStatus.OK };
  }

  @Get('summary')
  @RequirePermission('finance.retainers', 'read')
  @ApiOperation({ summary: 'MRR summary' })
  async getSummary() {
    const data = await this.retainersService.getMRRSummary();
    return { data, message: 'MRR summary retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @RequirePermission('finance.retainers', 'read')
  @ApiOperation({ summary: 'Get retainer contract' })
  async findOne(@Param('id') id: string) {
    const data = await this.retainersService.findOne(id);
    return { data, message: 'Retainer retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id/invoices')
  @RequirePermission('finance.retainers', 'read')
  @ApiOperation({ summary: 'List invoices for retainer' })
  async findInvoices(@Param('id') id: string) {
    const data = await this.retainersService.findInvoices(id);
    return { data, message: 'Retainer invoices retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('finance.retainers', 'write')
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
  @RequirePermission('finance.retainers', 'write')
  @ApiOperation({ summary: 'Pause retainer' })
  async pause(@Param('id') id: string, @Body() dto: PauseRetainerDto) {
    const data = await this.retainersService.pause(id, dto.reason);
    return { data, message: 'Retainer paused', statusCode: HttpStatus.OK };
  }

  @Post(':id/resume')
  @RequirePermission('finance.retainers', 'write')
  @ApiOperation({ summary: 'Resume retainer' })
  async resume(@Param('id') id: string) {
    const data = await this.retainersService.resume(id);
    return { data, message: 'Retainer resumed', statusCode: HttpStatus.OK };
  }

  @Post(':id/end')
  @RequirePermission('finance.retainers', 'write')
  @ApiOperation({ summary: 'End retainer contract' })
  async end(@Param('id') id: string, @Body() dto: EndRetainerDto) {
    const data = await this.retainersService.end(id, dto.reason);
    return { data, message: 'Retainer ended', statusCode: HttpStatus.OK };
  }

  @Post(':id/extend')
  @RequirePermission('finance.retainers', 'write')
  @ApiOperation({ summary: 'Extend retainer contract (records history)' })
  async extend(
    @Param('id') id: string,
    @Body() dto: ExtendRetainerDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.retainersService.extend(
      id,
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Retainer extended', statusCode: HttpStatus.OK };
  }

  @Post(':id/start')
  @RequirePermission('finance.retainers', 'write')
  @ApiOperation({ summary: 'Start retainer contract' })
  async start(@Param('id') id: string) {
    const data = await this.retainersService.start(id);
    return { data, message: 'Retainer started', statusCode: HttpStatus.OK };
  }
  

  @Get(':id/extensions')
  @RequirePermission('finance.retainers', 'read')
  @ApiOperation({ summary: 'List extension history for a retainer' })
  async getExtensions(@Param('id') id: string) {
    const data = await this.retainersService.getExtensions(id);
    return { data, message: 'Extensions retrieved', statusCode: HttpStatus.OK };
  }
}
