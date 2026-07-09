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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { TargetsService } from './targets.service';
import { SetTargetDto } from './dto/set-target.dto';
import { UpdateTargetDto } from './dto/update-target.dto';
import { TargetMonthQueryDto } from './dto/target-month-query.dto';

@ApiTags('crm-targets')
@ApiBearerAuth()
@Controller('crm/targets')
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) {}

  @Get('dashboard/me')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Get personal agent dashboard' })
  async getMyDashboard(
    @Query() query: TargetMonthQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const month = this.targetsService.resolveMonth(query.month);
    const data = await this.targetsService.getAgentDashboard(user.sub, month);
    return { data, message: 'Dashboard retrieved', statusCode: HttpStatus.OK };
  }

  @Get('my')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Get my sales target for a month' })
  async getMyTarget(
    @Query() query: TargetMonthQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const month = this.targetsService.resolveMonth(query.month);
    const data = await this.targetsService.getTarget(user.sub, month);
    return { data, message: 'Target retrieved', statusCode: HttpStatus.OK };
  }

  @Get()
  @RequirePermission('crm.reports', 'read')
  @ApiOperation({ summary: 'Get monthly targets with performance' })
  async getMonthlyTargets(@Query() query: TargetMonthQueryDto) {
    const month = this.targetsService.resolveMonth(query.month);
    const data = await this.targetsService.getMonthlyTargets(month);
    return { data, message: 'Targets retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('crm.reports', 'write')
  @ApiOperation({ summary: 'Set monthly target for an agent' })
  async setTarget(
    @Body() dto: SetTargetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.targetsService.setTarget(dto, user.sub);
    return { data, message: 'Target set', statusCode: HttpStatus.CREATED };
  }

  @Patch(':id')
  @RequirePermission('crm.reports', 'write')
  @ApiOperation({ summary: 'Update a sales target' })
  async updateTarget(
    @Param('id') id: string,
    @Body() dto: UpdateTargetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.targetsService.updateTarget(id, dto, user.sub);
    return { data, message: 'Target updated', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('crm.reports', 'write')
  @ApiOperation({ summary: 'Soft-delete a sales target' })
  async deleteTarget(@Param('id') id: string) {
    const data = await this.targetsService.deleteTarget(id);
    return { data, message: data.message, statusCode: HttpStatus.OK };
  }
}
