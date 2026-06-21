import { Module } from '@nestjs/common';

import { FinanceController } from './finance.controller';

import { FinanceService } from './finance.service';

import { InvoicesModule } from '../invoices/invoices.module';

import { PaymentsModule } from '../payments/payments.module';

import { ExpensesModule } from '../expenses/expenses.module';

import { BillsModule } from '../bills/bills.module';
import { ReportsModule } from '../reports/reports.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { ArModule } from '../ar/ar.module';
import { CreditNotesModule } from '../credit-notes/credit-notes.module';
import { PaymentPlansModule } from '../payment-plans/payment-plans.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { TaxModule } from '../tax/tax.module';
import { RetainersModule } from '../retainers/retainers.module';
import { BudgetModule } from '../budget/budget.module';
import { PayrollModule } from '../payroll/payroll.module';
import { SettingsModule } from '../settings/settings.module';
import { VenturesModule } from '../ventures/ventures.module';
import { ReserveModule } from './reserve/reserve.module';

@Module({
  imports: [
    InvoicesModule,
    PaymentsModule,
    ExpensesModule,
    BillsModule,
    ReportsModule,
    CommissionsModule,
    ArModule,
    CreditNotesModule,
    PaymentPlansModule,
    ReconciliationModule,
    TaxModule,
    RetainersModule,
    BudgetModule,
    PayrollModule,
    SettingsModule,
    VenturesModule,
    ReserveModule,
  ],

  controllers: [FinanceController],

  providers: [FinanceService],

})

export class FinanceModule {}


