import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateWeeklyReportDto } from './dto/generate-weekly-report.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('sales/campaigns')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post(':id/reports')
  @RequirePermission('sales.reporting', 'write')
  generate(
    @Param('id') campaignId: string,
    @Body() dto: GenerateWeeklyReportDto,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    return this.reportsService.generateWeeklyReport(
      campaignId,
      dto,
      req.user.sub,
    );
  }

  @Get(':id/reports')
  @RequirePermission('sales.reporting', 'read')
  getReports(@Param('id') campaignId: string) {
    return this.reportsService.getReports(campaignId);
  }

  @Get(':id/client-report')
  @RequirePermission('sales.campaigns', 'read')
  getClientReport(
    @Param('id') campaignId: string,
    @Query('week') week?: string,
  ) {
    return this.reportsService.getClientReport(
      campaignId,
      week ? Number(week) : undefined,
    );
  }
}
