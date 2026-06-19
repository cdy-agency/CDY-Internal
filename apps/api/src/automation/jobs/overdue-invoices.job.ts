import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CronLogService } from '../cron-log.service';

@Injectable()
export class OverdueInvoicesJob {
  private readonly logger = new Logger(OverdueInvoicesJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cronLog: CronLogService,
  ) {}

  @Cron('0 8 * * *', { name: 'overdue-invoice-detection' })
  async detectOverdueInvoices(): Promise<void> {
    this.logger.log('Running overdue invoice detection...');
    const startedAt = new Date();
    let itemsProcessed = 0;
    let errors = 0;

    try {
      const now = new Date();

      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
          dueDate: { lt: now },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (overdueInvoices.length === 0) {
        this.logger.log('No overdue invoices found');
      } else {
        const updated = await this.prisma.invoice.updateMany({
          where: { id: { in: overdueInvoices.map((i) => i.id) } },
          data: { status: InvoiceStatus.OVERDUE },
        });

        itemsProcessed = updated.count;
        this.logger.log(`Flagged ${updated.count} invoices as overdue`);

        if (updated.count > 0) {
          this.notificationsService.createForRoleAsync('FINANCE_MANAGER', {
            type: NotificationType.INVOICE_OVERDUE,
            title: `${updated.count} invoice${updated.count > 1 ? 's' : ''} are now overdue`,
            body: `${updated.count} invoice${updated.count > 1 ? 's have' : ' has'} passed their due date and been marked overdue.`,
            link: '/finance/reports/ageing',
          });
        }
      }
    } catch (err: unknown) {
      errors = 1;
      this.logger.error('Overdue invoice detection failed', String(err));
    }

    await this.cronLog.log('overdue-invoice-detection', startedAt, {
      itemsProcessed,
      errors,
    });
  }
}
