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
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { format } from 'date-fns';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { LeadFiltersDto } from './dto/lead-filters.dto';
import {
  BulkAssignDto,
  BulkDeleteDto,
  BulkMoveStageDto,
} from './dto/bulk-leads.dto';

function toActor(user: JwtPayload) {
  return { userId: user.sub, userEmail: user.email };
}

@ApiTags('crm-leads')
@ApiBearerAuth()
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Create a lead' })
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: JwtPayload) {
    const data = await this.leadsService.create(dto, toActor(user));
    return { data, message: 'Lead created', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'List leads' })
  async findAll(
    @Query() filters: LeadFiltersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.leadsService.findAll(filters, user.sub);
    return { data, message: 'Leads retrieved', statusCode: HttpStatus.OK };
  }

  @Get('export')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Export leads to CSV' })
  async exportLeads(
    @Query() filters: LeadFiltersDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const csv = await this.leadsService.exportToCsv(filters, user.sub);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="CDY-Leads-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
    });
    res.send(csv);
  }

  @Get('agents')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'List sales agents for assignment' })
  async findAgents() {
    const data = await this.leadsService.findSalesAgents();
    return { data, message: 'Agents retrieved', statusCode: HttpStatus.OK };
  }

  @Post('bulk/assign')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Bulk assign leads to agent' })
  async bulkAssign(
    @Body() dto: BulkAssignDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.leadsService.bulkAssign(
      dto.leadIds,
      dto.agentId,
      toActor(user),
    );
    return { data, message: 'Leads assigned', statusCode: HttpStatus.OK };
  }

  @Post('bulk/move-stage')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Bulk move leads to stage' })
  async bulkMoveStage(
    @Body() dto: BulkMoveStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.leadsService.bulkMoveStage(
      dto.leadIds,
      dto.stage,
      toActor(user),
    );
    return { data, message: 'Leads moved', statusCode: HttpStatus.OK };
  }

  @Post('bulk/delete')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Bulk soft delete leads' })
  async bulkDelete(
    @Body() dto: BulkDeleteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.leadsService.bulkDelete(dto.leadIds, toActor(user));
    return { data, message: 'Leads deleted', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Get lead by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.leadsService.findOne(id, user.sub);
    return { data, message: 'Lead retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Update lead' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.leadsService.update(
      id,
      dto,
      user.sub,
      toActor(user),
    );
    return { data, message: 'Lead updated', statusCode: HttpStatus.OK };
  }

  @Patch(':id/stage')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Move lead to a new pipeline stage' })
  async moveStage(
    @Param('id') id: string,
    @Body() dto: MoveStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.leadsService.moveStage(
      id,
      dto,
      user.sub,
      toActor(user),
    );
    return { data, message: 'Lead stage updated', statusCode: HttpStatus.OK };
  }

  @Post(':id/score')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Recalculate lead quality score' })
  async recalculateScore(@Param('id') id: string) {
    await this.leadsService.recalculateScore(id);
    return {
      data: { recalculated: true },
      message: 'Score recalculated',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Soft delete lead' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.leadsService.softDelete(
      id,
      user.sub,
      toActor(user),
    );
    return { data, message: 'Lead deleted', statusCode: HttpStatus.OK };
  }
}
