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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VenturesService } from './ventures.service';
import { CreateVentureDto } from './dto/create-venture.dto';
import { VentureSummaryQueryDto } from './dto/venture-summary-query.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('ventures')
@ApiBearerAuth()
@Controller('ventures')
export class VenturesController {
  constructor(private readonly venturesService: VenturesService) {}

  @Get()
  @RequirePermission('ventures.view', 'read')
  @ApiOperation({ summary: 'List all ventures' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const data = await this.venturesService.findAll(includeInactive === 'true');
    return { data, statusCode: HttpStatus.OK };
  }

  @Get('lookup')
  @RequirePermission('ventures.lookup', 'read')
  @ApiOperation({ summary: 'Lookup ventures for pickers (id/name only)' })
  async lookup(@Query('q') query = '') {
    const data = await this.venturesService.lookup(query);
    return { data, message: 'Ventures found', statusCode: HttpStatus.OK };
  }

  @Get('summary')
  @RequirePermission('ventures.view', 'read')
  @ApiOperation({ summary: 'Combined summary for all ventures' })
  async getAllSummary(@Query() query: VentureSummaryQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    to.setHours(23, 59, 59, 999);
    const data = await this.venturesService.getAllVenturesSummary(from, to);
    return { data, statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Create a venture' })
  async create(
    @Body() dto: CreateVentureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.venturesService.create(dto, user.sub);
    return {
      data,
      message: 'Venture created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get(':id')
  @RequirePermission('ventures.view', 'read')
  @ApiOperation({ summary: 'Get venture by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.venturesService.findOne(id);
    return { data, statusCode: HttpStatus.OK };
  }

  @Get(':id/summary')
  @RequirePermission('ventures.view', 'read')
  @ApiOperation({ summary: 'Per-venture summary for a period' })
  async getSummary(
    @Param('id') id: string,
    @Query() query: VentureSummaryQueryDto,
  ) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    to.setHours(23, 59, 59, 999);
    const data = await this.venturesService.getSummary(id, from, to);
    return { data, statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Update a venture' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateVentureDto>) {
    const data = await this.venturesService.update(id, dto);
    return { data, message: 'Venture updated', statusCode: HttpStatus.OK };
  }

  @Patch(':id/deactivate')
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Deactivate a venture' })
  async deactivate(@Param('id') id: string) {
    const data = await this.venturesService.deactivate(id);
    return { data, message: 'Venture deactivated', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Soft-delete a venture' })
  async remove(@Param('id') id: string) {
    const data = await this.venturesService.remove(id);
    return { data, message: data.message, statusCode: HttpStatus.OK };
  }
}
