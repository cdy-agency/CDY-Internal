import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { OverdueInvoicesJob } from './jobs/overdue-invoices.job';
import { InvoiceRemindersJob } from './jobs/invoice-reminders.job';
import { BillAlertsJob } from './jobs/bill-alerts.job';

@Module({
  imports: [InvoicesModule],
  providers: [OverdueInvoicesJob, InvoiceRemindersJob, BillAlertsJob],
  exports: [OverdueInvoicesJob, InvoiceRemindersJob, BillAlertsJob],
})
export class AutomationModule {}
