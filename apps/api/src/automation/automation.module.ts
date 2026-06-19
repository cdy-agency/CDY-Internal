import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { RetainersModule } from '../retainers/retainers.module';
import { BudgetModule } from '../budget/budget.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OverdueInvoicesJob } from './jobs/overdue-invoices.job';
import { InvoiceRemindersJob } from './jobs/invoice-reminders.job';
import { BillAlertsJob } from './jobs/bill-alerts.job';
import { PaymentPlanAlertsJob } from './jobs/payment-plan-alerts.job';
import { RetainerBillingJob } from './jobs/retainer-billing.job';
import { BudgetAlertsJob } from './jobs/budget-alerts.job';
import { ProposalExpiryJob } from './jobs/proposal-expiry.job';
import { CrmFollowUpRemindersJob } from './jobs/crm-follow-up-reminders.job';
import { ProjectDeadlineAlertsJob } from './jobs/project-deadline-alerts.job';
import { CronLogService } from './cron-log.service';

@Module({
  imports: [InvoicesModule, RetainersModule, BudgetModule, PrismaModule],
  providers: [
    CronLogService,
    OverdueInvoicesJob,
    InvoiceRemindersJob,
    BillAlertsJob,
    PaymentPlanAlertsJob,
    RetainerBillingJob,
    BudgetAlertsJob,
    ProposalExpiryJob,
    CrmFollowUpRemindersJob,
    ProjectDeadlineAlertsJob,
  ],
  exports: [
    CronLogService,
    OverdueInvoicesJob,
    InvoiceRemindersJob,
    BillAlertsJob,
    PaymentPlanAlertsJob,
    RetainerBillingJob,
    BudgetAlertsJob,
    ProposalExpiryJob,
    CrmFollowUpRemindersJob,
    ProjectDeadlineAlertsJob,
  ],
})
export class AutomationModule {}
