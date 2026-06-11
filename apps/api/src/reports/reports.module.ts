import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { CashFlowService } from './cash-flow.service';
import { BalanceSheetService } from './balance-sheet.service';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportPdfService,
    CashFlowService,
    BalanceSheetService,
  ],
  exports: [ReportsService, CashFlowService, BalanceSheetService],
})
export class ReportsModule {}
