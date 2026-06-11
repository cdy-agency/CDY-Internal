import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus, NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class OverdueInvoicesJob {
  private readonly logger = new Logger(OverdueInvoicesJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *', { name: 'overdue-invoice-detection' })
  async detectOverdueInvoices(): Promise<void> {
    this.logger.log('Running overdue invoice detection...');

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
      return;
    }

    const updated = await this.prisma.invoice.updateMany({
      where: { id: { in: overdueInvoices.map((i) => i.id) } },
      data: { status: InvoiceStatus.OVERDUE },
    });

    this.logger.log(`Flagged ${updated.count} invoices as overdue`);

    if (updated.count > 0) {
      this.notificationsService.createForRoleAsync(Role.FINANCE_MANAGER, {
        type: NotificationType.INVOICE_OVERDUE,
        title: `${updated.count} invoice${updated.count > 1 ? 's' : ''} are now overdue`,
        body: `${updated.count} invoice${updated.count > 1 ? 's have' : ' has'} passed their due date and been marked overdue.`,
        link: '/finance/reports/ageing',
      });
    }
  }
}
