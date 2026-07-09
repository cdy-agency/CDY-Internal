import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { GenerateWeeklyReportDto } from './dto/generate-weekly-report.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('sales/campaigns')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post(':id/reports')
  @RequirePermission('sales.reporting', 'write')
  async generate(
    @Param('id') campaignId: string,
    @Body() dto: GenerateWeeklyReportDto,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    const data = await this.reportsService.generateWeeklyReport(campaignId, dto, req.user.sub);
    return { data, message: 'Report generated', statusCode: 201 };
  }

  @Get(':id/reports')
  @RequirePermission('sales.reporting', 'read')
  async getReports(@Param('id') campaignId: string) {
    const data = await this.reportsService.getReports(campaignId);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Get(':id/client-report')
  @RequirePermission('sales.campaigns', 'read')
  async getClientReport(
    @Param('id') campaignId: string,
    @Query('week') week?: string,
  ) {
    const data = await this.reportsService.getClientReport(campaignId, week ? Number(week) : undefined);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Delete(':id/reports/:reportId')
  @RequirePermission('sales.reporting', 'write')
  @ApiOperation({ summary: 'Soft-delete weekly report' })
  async remove(
    @Param('id') campaignId: string,
    @Param('reportId') reportId: string,
  ) {
    const data = await this.reportsService.remove(campaignId, reportId);
    return { data, message: 'Report deleted', statusCode: 200 };
  }
}
