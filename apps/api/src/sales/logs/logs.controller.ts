import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateDailyLogDto } from './dto/create-log.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('sales')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('logs')
  @RequirePermission('sales.reporting', 'write')
  create(
    @Body() dto: CreateDailyLogDto,
    @Req() req: Express.Request & { user: { employeeId?: string; sub: string } },
  ) {
    dto.employeeId = req.user.employeeId ?? req.user.sub;
    return this.logsService.create(dto);
  }

  @Get('campaigns/:id/logs')
  @RequirePermission('sales.reporting', 'read')
  getForCampaign(
    @Param('id') campaignId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.logsService.getForCampaign(
      campaignId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Patch('logs/:logId')
  @RequirePermission('sales.reporting', 'write')
  update(
    @Param('logId') logId: string,
    @Body() dto: Partial<CreateDailyLogDto>,
  ) {
    return this.logsService.update(logId, dto);
  }

  @Get('logs/my')
  @RequirePermission('sales.reporting', 'read')
  getMyLogs(
    @Req() req: Express.Request & { user: { employeeId?: string; sub: string } },
    @Query('campaignId') campaignId?: string,
  ) {
    const employeeId = req.user.employeeId ?? req.user.sub;
    return this.logsService.getMyLogs(employeeId, campaignId);
  }
}
