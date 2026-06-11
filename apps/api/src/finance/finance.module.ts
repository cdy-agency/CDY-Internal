import { Module } from '@nestjs/common';

import { FinanceController } from './finance.controller';

import { FinanceService } from './finance.service';

import { InvoicesModule } from '../invoices/invoices.module';

import { PaymentsModule } from '../payments/payments.module';

import { ExpensesModule } from '../expenses/expenses.module';

import { BillsModule } from '../bills/bills.module';
import { ReportsModule } from '../reports/reports.module';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [
    InvoicesModule,
    PaymentsModule,
    ExpensesModule,
    BillsModule,
    ReportsModule,
    CommissionsModule,
  ],

  controllers: [FinanceController],

  providers: [FinanceService],

})

export class FinanceModule {}


