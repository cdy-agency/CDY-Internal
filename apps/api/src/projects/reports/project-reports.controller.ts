import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { ProjectReportsService } from './project-reports.service';
import { PortfolioReportFiltersDto } from './dto/portfolio-report-filters.dto';

@ApiTags('project-reports')
@ApiBearerAuth()
@Controller('projects/reports')
export class ProjectReportsController {
  constructor(
    private readonly projectReportsService: ProjectReportsService,
  ) {}

  @Get('portfolio')
  @RequirePermission('projects.reports', 'read')
  @ApiOperation({ summary: 'Portfolio health and revenue summary' })
  async getPortfolio(@Query() filters: PortfolioReportFiltersDto) {
    const data = await this.projectReportsService.getPortfolioReport(filters);
    return {
      data,
      message: 'Portfolio report retrieved',
      statusCode: HttpStatus.OK,
    };
  }

}
