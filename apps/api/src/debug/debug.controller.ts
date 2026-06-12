import {
  Controller,
  Post,
  Param,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { OverdueInvoicesJob } from '../automation/jobs/overdue-invoices.job';
import { InvoiceRemindersJob } from '../automation/jobs/invoice-reminders.job';
import { BillAlertsJob } from '../automation/jobs/bill-alerts.job';

@ApiTags('debug')
@ApiBearerAuth()
@Controller('debug')
export class DebugController {
  constructor(
    private readonly overdueJob: OverdueInvoicesJob,
    private readonly remindersJob: InvoiceRemindersJob,
    private readonly billAlertsJob: BillAlertsJob,
  ) {}

  @Post('run-cron/:job')
  @RequirePermission('finance.settings', 'write')
  @ApiOperation({ summary: 'Manually trigger a cron job (QA only)' })
  async runCron(@Param('job') job: string) {
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
      default:
        throw new NotFoundException(`Unknown cron job: ${job}`);
    }

    return {
      data: { job, ran: true },
      message: `Cron job ${job} executed`,
      statusCode: HttpStatus.OK,
    };
  }
}
