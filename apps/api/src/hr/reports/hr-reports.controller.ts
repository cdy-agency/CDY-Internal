import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { HrReportsService } from './hr-reports.service';
import { HrReportFiltersDto } from './dto/hr-report-filters.dto';

@ApiTags('hr-reports')
@ApiBearerAuth()
@Controller('hr')
export class HrReportsController {
  constructor(private readonly hrReportsService: HrReportsService) {}

  @Get('reports/headcount')
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'Headcount report' })
  async headcount(@Query() filters: HrReportFiltersDto) {
    const data = await this.hrReportsService.getHeadcountReport(filters);
    return { data, message: 'Headcount report', statusCode: HttpStatus.OK };
  }

  @Get('reports/turnover')
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'Turnover report' })
  async turnover(@Query() filters: HrReportFiltersDto) {
    const data = await this.hrReportsService.getTurnoverReport(filters);
    return { data, message: 'Turnover report', statusCode: HttpStatus.OK };
  }

  @Get('reports/leave')
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'Leave utilisation report' })
  async leave(@Query() filters: HrReportFiltersDto) {
    const year = filters.year ?? new Date().getFullYear();
    const data = await this.hrReportsService.getLeaveUtilisationReport(year);
    return { data, message: 'Leave utilisation report', statusCode: HttpStatus.OK };
  }

  @Get('reports/attendance')
  @RequirePermission('hr.attendance', 'read')
  @ApiOperation({ summary: 'Attendance summary report' })
  async attendance(@Query() filters: HrReportFiltersDto) {
    const data = await this.hrReportsService.getAttendanceSummary(filters);
    return { data, message: 'Attendance summary report', statusCode: HttpStatus.OK };
  }

  @Get('productivity')
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'Team productivity stub' })
  async productivity() {
    const data = await this.hrReportsService.getProductivityStub();
    return { data, message: 'Productivity data', statusCode: HttpStatus.OK };
  }
}
