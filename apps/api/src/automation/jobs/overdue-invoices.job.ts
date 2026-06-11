import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OverdueInvoicesJob {
  private readonly logger = new Logger(OverdueInvoicesJob.name);

  constructor(private readonly prisma: PrismaService) {}

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
  }
}
