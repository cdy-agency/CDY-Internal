import {
  Controller,
  Post,
  Param,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { OverdueInvoicesJob } from '../automation/jobs/overdue-invoices.job';
import { InvoiceRemindersJob } from '../automation/jobs/invoice-reminders.job';
import { BillAlertsJob } from '../automation/jobs/bill-alerts.job';
import { PaymentPlanAlertsJob } from '../automation/jobs/payment-plan-alerts.job';
import { RetainerBillingJob } from '../automation/jobs/retainer-billing.job';
import { BudgetAlertsJob } from '../automation/jobs/budget-alerts.job';
import { ProposalExpiryJob } from '../automation/jobs/proposal-expiry.job';
import { CrmFollowUpRemindersJob } from '../automation/jobs/crm-follow-up-reminders.job';
import { ProjectDeadlineAlertsJob } from '../automation/jobs/project-deadline-alerts.job';

@ApiTags('debug')
@ApiBearerAuth()
@Controller('debug')
export class DebugController {
  constructor(
    private readonly overdueJob: OverdueInvoicesJob,
    private readonly remindersJob: InvoiceRemindersJob,
    private readonly billAlertsJob: BillAlertsJob,
    private readonly paymentPlanJob: PaymentPlanAlertsJob,
    private readonly retainerJob: RetainerBillingJob,
    private readonly budgetJob: BudgetAlertsJob,
    private readonly proposalJob: ProposalExpiryJob,
    private readonly crmRemindersJob: CrmFollowUpRemindersJob,
    private readonly deadlineJob: ProjectDeadlineAlertsJob,
  ) {}

  @Post('run-cron/:job')
  @RequirePermission('it.audit', 'write')
  @ApiOperation({ summary: 'Manually trigger a cron job (non-production only)' })
  async runCron(@Param('job') job: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Debug cron triggers are disabled in production',
      );
    }

    switch (job) {
      case 'overdue':
        await this.overdueJob.detectOverdueInvoices();
        break;
      case 'reminders':
        await this.remindersJob.sendInvoiceReminders();
        break;
      case 'bills':
        await this.billAlertsJob.sendBillAlerts();
        break;
      case 'payment-plans':
        await this.paymentPlanJob.checkOverdueInstalments();
        break;
      case 'retainer-billing':
        await this.retainerJob.processRetainerBilling();
        break;
      case 'budget':
        await this.budgetJob.checkProjectBudgets();
        break;
      case 'proposal-expiry':
        await this.proposalJob.checkProposalExpiry();
        break;
      case 'crm-followups':
        await this.crmRemindersJob.sendFollowUpReminders();
        break;
      case 'deadline-alerts':
        await this.deadlineJob.checkProjectDeadlines();
        break;
      default:
        throw new NotFoundException(`Unknown cron job: ${job}`);
    }

    return {
      data: { job, ran: true },
      message: `Cron job '${job}' executed`,
      statusCode: HttpStatus.OK,
    };
  }
}
