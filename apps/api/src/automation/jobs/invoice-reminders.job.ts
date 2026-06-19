import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceEmailService } from '../../invoices/invoice-email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CronLogService } from '../cron-log.service';

@Injectable()
export class InvoiceRemindersJob {
  private readonly logger = new Logger(InvoiceRemindersJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceEmailService: InvoiceEmailService,
    private readonly notificationsService: NotificationsService,
    private readonly cronLog: CronLogService,
  ) {}

  @Cron('5 8 * * *', { name: 'invoice-reminder-cascade' })
  async sendInvoiceReminders(): Promise<void> {
    this.logger.log('Running invoice reminder cascade...');
    const startedAt = new Date();
    let itemsProcessed = 0;
    let errors = 0;

    try {
      const now = new Date();

      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.OVERDUE,
          deletedAt: null,
        },
        include: { reminders: true },
      });

      const reminderSchedule: Record<number, number> = { 1: 0, 2: 3, 3: 7 };

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        const remindersSent = invoice.reminders.length;
        const nextReminderNumber = remindersSent + 1;

        if (nextReminderNumber > 3) continue;

        const daysThreshold = reminderSchedule[nextReminderNumber];
        if (daysOverdue < daysThreshold) continue;

        try {
          await this.invoiceEmailService.sendReminder(
            invoice,
            nextReminderNumber,
          );

          await this.prisma.invoiceReminder.create({
            data: {
              invoiceId: invoice.id,
              reminderNumber: nextReminderNumber,
              emailAddress: invoice.clientId,
            },
          });

          this.logger.log(
            `Sent reminder ${nextReminderNumber} for invoice ${invoice.invoiceNumber}`,
          );

          this.notificationsService.createForRoleAsync('FINANCE_MANAGER', {
            type: NotificationType.INVOICE_REMINDER_SENT,
            title: `Reminder ${nextReminderNumber} sent — ${invoice.invoiceNumber}`,
            body: `Payment reminder sent to client for invoice ${invoice.invoiceNumber}.`,
            link: `/finance/invoices/${invoice.id}`,
          });

          itemsProcessed++;
        } catch (err) {
          errors++;
          this.logger.error(
            `Failed to send reminder for invoice ${invoice.invoiceNumber}`,
            String(err),
          );

          this.notificationsService.createForRoleAsync('FINANCE_MANAGER', {
            type: NotificationType.REMINDER_FAILED,
            title: `Reminder failed — ${invoice.invoiceNumber}`,
            body: `Failed to send reminder ${nextReminderNumber} for invoice ${invoice.invoiceNumber}. Manual follow-up required.`,
            link: `/finance/invoices/${invoice.id}`,
          });
        }
      }

      this.logger.log('Invoice reminder cascade completed');
    } catch (err: unknown) {
      errors++;
      this.logger.error('Invoice reminder cascade failed', String(err));
    }

    await this.cronLog.log('invoice-reminder-cascade', startedAt, {
      itemsProcessed,
      errors,
    });
  }
}
