import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { RetainersModule } from '../retainers/retainers.module';
import { BudgetModule } from '../budget/budget.module';
import { OverdueInvoicesJob } from './jobs/overdue-invoices.job';
import { InvoiceRemindersJob } from './jobs/invoice-reminders.job';
import { BillAlertsJob } from './jobs/bill-alerts.job';
import { PaymentPlanAlertsJob } from './jobs/payment-plan-alerts.job';
import { RetainerBillingJob } from './jobs/retainer-billing.job';
import { BudgetAlertsJob } from './jobs/budget-alerts.job';

@Module({
  imports: [InvoicesModule, RetainersModule, BudgetModule],
  providers: [
    OverdueInvoicesJob,
    InvoiceRemindersJob,
    BillAlertsJob,
    PaymentPlanAlertsJob,
    RetainerBillingJob,
    BudgetAlertsJob,
  ],
  exports: [
    OverdueInvoicesJob,
    InvoiceRemindersJob,
    BillAlertsJob,
    PaymentPlanAlertsJob,
    RetainerBillingJob,
    BudgetAlertsJob,
  ],
})
export class AutomationModule {}
