import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { format } from 'date-fns';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { CashFlowService } from './cash-flow.service';
import { BalanceSheetService } from './balance-sheet.service';
import { PlReportFiltersDto } from './dto/pl-report-filters.dto';
import { AgeingReportFiltersDto } from './dto/ageing-report-filters.dto';
import { ExpenseReportFiltersDto } from './dto/expense-report-filters.dto';
import { CashFlowFiltersDto } from './dto/cash-flow-filters.dto';
import { CreateCashFlowAdjustmentDto } from './dto/create-cash-flow-adjustment.dto';
import { BalanceSheetFiltersDto } from './dto/balance-sheet-filters.dto';
import {
  CreateBalanceSheetEntryDto,
  UpdateBalanceSheetEntryDto,
} from './dto/balance-sheet-entry.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportPdfService: ReportPdfService,
    private readonly cashFlowService: CashFlowService,
    private readonly balanceSheetService: BalanceSheetService,
  ) {}

  @Get('pl')
  @RequirePermission('finance.reports', 'read')
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
  @RequirePermission('finance.reports', 'read')
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
  @RequirePermission('finance.reports', 'read')
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
  @RequirePermission('finance.reports', 'read')
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
  @RequirePermission('finance.reports', 'read')
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
  @RequirePermission('finance.reports', 'read')
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

  @Get('cashflow')
  @RequirePermission('finance.reports', 'read')
  @ApiOperation({ summary: 'Cash flow forecast' })
  async getCashFlow(@Query() filters: CashFlowFiltersDto) {
    const data = await this.cashFlowService.getForecast(filters);
    return {
      data,
      message: 'Cash flow forecast generated',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('cashflow/pdf')
  @RequirePermission('finance.reports', 'read')
  @ApiOperation({ summary: 'Download cash flow forecast PDF' })
  async downloadCashFlowPdf(
    @Query() filters: CashFlowFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.cashFlowService.getForecast(filters);
    const buffer = await this.reportPdfService.generateCashFlowReport(data);
    const dateLabel = format(new Date(), 'yyyy-MM-dd');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CDY-Report-CashFlow-${dateLabel}.pdf"`,
    );
    res.send(buffer);
  }

  @Post('cashflow/adjustments')
  @RequirePermission('finance.reports', 'write')
  @ApiOperation({ summary: 'Add manual cash flow adjustment' })
  async createCashFlowAdjustment(
    @Body() dto: CreateCashFlowAdjustmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.cashFlowService.createAdjustment(dto, user.sub);
    return {
      data,
      message: 'Adjustment created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Delete('cashflow/adjustments/:id')
  @RequirePermission('finance.reports', 'write')
  @ApiOperation({ summary: 'Delete cash flow adjustment' })
  async deleteCashFlowAdjustment(@Param('id') id: string) {
    const data = await this.cashFlowService.deleteAdjustment(id);
    return {
      data,
      message: 'Adjustment deleted',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('balance-sheet')
  @RequirePermission('finance.reports', 'read')
  @ApiOperation({ summary: 'Balance sheet as of date' })
  async getBalanceSheet(@Query() filters: BalanceSheetFiltersDto) {
    const data = await this.balanceSheetService.getBalanceSheet(filters.date);
    return {
      data,
      message: 'Balance sheet generated',
      statusCode: HttpStatus.OK,
    };
  }

  @Post('balance-sheet/entries')
  @RequirePermission('finance.reports', 'write')
  @ApiOperation({ summary: 'Create manual balance sheet entry' })
  async createBalanceSheetEntry(
    @Body() dto: CreateBalanceSheetEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.balanceSheetService.createEntry(dto, user.sub);
    return { data, message: 'Entry created', statusCode: HttpStatus.CREATED };
  }

  @Patch('balance-sheet/entries/:id')
  @RequirePermission('finance.reports', 'write')
  @ApiOperation({ summary: 'Update balance sheet entry' })
  async updateBalanceSheetEntry(
    @Param('id') id: string,
    @Body() dto: UpdateBalanceSheetEntryDto,
  ) {
    const data = await this.balanceSheetService.updateEntry(id, dto);
    return { data, message: 'Entry updated', statusCode: HttpStatus.OK };
  }

  @Delete('balance-sheet/entries/:id')
  @RequirePermission('finance.reports', 'write')
  @ApiOperation({ summary: 'Delete balance sheet entry' })
  async deleteBalanceSheetEntry(@Param('id') id: string) {
    const data = await this.balanceSheetService.deleteEntry(id);
    return { data, message: 'Entry deleted', statusCode: HttpStatus.OK };
  }

  @Get('balance-sheet/pdf')
  @RequirePermission('finance.reports', 'read')
  @ApiOperation({ summary: 'Download balance sheet PDF' })
  async downloadBalanceSheetPdf(
    @Query() filters: BalanceSheetFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.balanceSheetService.getBalanceSheet(filters.date);
    const buffer = await this.reportPdfService.generateBalanceSheetReport(data);
    const dateLabel = format(
      new Date(data.asOf),
      'yyyy-MM-dd',
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CDY-Report-BalanceSheet-${dateLabel}.pdf"`,
    );
    res.send(buffer);
  }
}
