import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { CreateDailyLogDto } from './dto/create-log.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('sales')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('logs')
  @RequirePermission('sales.reporting', 'write')
  async create(
    @Body() dto: CreateDailyLogDto,
    @Req() req: Express.Request & { user: { employeeId?: string; sub: string } },
  ) {
    dto.employeeId = req.user.employeeId ?? req.user.sub;
    const data = await this.logsService.create(dto);
    return { data, message: 'Log created', statusCode: 201 };
  }

  @Get('campaigns/:id/logs')
  @RequirePermission('sales.reporting', 'read')
  async getForCampaign(
    @Param('id') campaignId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.logsService.getForCampaign(
      campaignId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return { data, message: 'OK', statusCode: 200 };
  }

  @Patch('logs/:logId')
  @RequirePermission('sales.reporting', 'write')
  async update(
    @Param('logId') logId: string,
    @Body() dto: Partial<CreateDailyLogDto>,
  ) {
    const data = await this.logsService.update(logId, dto);
    return { data, message: 'Log updated', statusCode: 200 };
  }

  @Get('logs/my')
  @RequirePermission('sales.reporting', 'read')
  async getMyLogs(
    @Req() req: Express.Request & { user: { employeeId?: string; sub: string } },
    @Query('campaignId') campaignId?: string,
  ) {
    const employeeId = req.user.employeeId ?? req.user.sub;
    const data = await this.logsService.getMyLogs(employeeId, campaignId);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Delete('logs/:logId')
  @RequirePermission('sales.reporting', 'write')
  @ApiOperation({ summary: 'Soft-delete daily activity log' })
  async remove(@Param('logId') logId: string) {
    const data = await this.logsService.remove(logId);
    return { data, message: 'Log deleted', statusCode: 200 };
  }
}
