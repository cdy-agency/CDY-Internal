import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CrmReportsService } from './crm-reports.service';
import { SalesReportFiltersDto } from './dto/sales-report-filters.dto';

@ApiTags('crm-reports')
@ApiBearerAuth()
@Controller('crm/reports')
export class CrmReportsController {
  constructor(private readonly crmReportsService: CrmReportsService) {}

  @Get('sales-performance')
  @RequirePermission('crm.reports', 'read')
  @ApiOperation({ summary: 'Sales performance report by agent' })
  async getSalesPerformance(@Query() filters: SalesReportFiltersDto) {
    const data =
      await this.crmReportsService.getSalesPerformanceReport(filters);
    return {
      data,
      message: 'Sales performance report retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('source-analysis')
  @RequirePermission('crm.reports', 'read')
  @ApiOperation({ summary: 'Lead source analysis report' })
  async getSourceAnalysis(@Query() filters: SalesReportFiltersDto) {
    const data = await this.crmReportsService.getSourceAnalysisReport(filters);
    return {
      data,
      message: 'Source analysis report retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
