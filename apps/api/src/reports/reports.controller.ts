import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { format } from 'date-fns';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { PlReportFiltersDto } from './dto/pl-report-filters.dto';
import { AgeingReportFiltersDto } from './dto/ageing-report-filters.dto';
import { ExpenseReportFiltersDto } from './dto/expense-report-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@cdy/shared';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportPdfService: ReportPdfService,
  ) {}

  @Get('pl')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Profit & Loss report' })
  async getProfitAndLoss(@Query() filters: PlReportFiltersDto) {
    const data = await this.reportsService.getProfitAndLoss(filters);
    return {
      data,
      message: 'P&L report generated',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('pl/pdf')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Download P&L report PDF' })
  async downloadPlPdf(
    @Query() filters: PlReportFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.reportsService.getProfitAndLoss(filters);
    const buffer = await this.reportPdfService.generatePLReport(data);
    const dateLabel = format(new Date(), 'MMM-yyyy');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CDY-Report-PL-${dateLabel}.pdf"`,
    );
    res.send(buffer);
  }

  @Get('ageing')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Invoice ageing report' })
  async getInvoiceAgeing(@Query() filters: AgeingReportFiltersDto) {
    const data = await this.reportsService.getInvoiceAgeing(filters);
    return {
      data,
      message: 'Ageing report generated',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('ageing/pdf')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Download ageing report PDF' })
  async downloadAgeingPdf(
    @Query() filters: AgeingReportFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.reportsService.getInvoiceAgeing(filters);
    const buffer = await this.reportPdfService.generateAgeingReport(data);
    const dateLabel = format(new Date(), 'yyyy-MM-dd');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CDY-Report-Ageing-${dateLabel}.pdf"`,
    );
    res.send(buffer);
  }

  @Get('expenses')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Expense summary report' })
  async getExpenseSummary(@Query() filters: ExpenseReportFiltersDto) {
    const data = await this.reportsService.getExpenseSummary(filters);
    return {
      data,
      message: 'Expense report generated',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('expenses/pdf')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Download expense summary PDF' })
  async downloadExpensePdf(
    @Query() filters: ExpenseReportFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.reportsService.getExpenseSummary(filters);
    const buffer = await this.reportPdfService.generateExpenseReport(data);
    const dateLabel = data.monthKey ?? format(new Date(), 'yyyy-MM');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CDY-Report-Expenses-${dateLabel}.pdf"`,
    );
    res.send(buffer);
  }
}
