import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceEmailService } from '../../invoices/invoice-email.service';

@Injectable()
export class InvoiceRemindersJob {
  private readonly logger = new Logger(InvoiceRemindersJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceEmailService: InvoiceEmailService,
  ) {}

  @Cron('5 8 * * *', { name: 'invoice-reminder-cascade' })
  async sendInvoiceReminders(): Promise<void> {
    this.logger.log('Running invoice reminder cascade...');

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
      } catch (err) {
        this.logger.error(
          `Failed to send reminder for invoice ${invoice.invoiceNumber}`,
          String(err),
        );
      }
    }

    this.logger.log('Invoice reminder cascade completed');
  }
}
