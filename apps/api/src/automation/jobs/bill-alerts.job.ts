import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillAlertsJob {
  private readonly logger = new Logger(BillAlertsJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('10 8 * * *', { name: 'bill-due-alerts' })
  async sendBillAlerts(): Promise<void> {
    this.logger.log('Running bill due-soon alerts...');

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const dueSoonBills = await this.prisma.bill.findMany({
      where: {
        status: BillStatus.UNPAID,
        dueDate: { gte: now, lte: in3Days },
        deletedAt: null,
      },
    });

    const overdueBills = await this.prisma.bill.findMany({
      where: {
        status: BillStatus.UNPAID,
        dueDate: { lt: now },
        deletedAt: null,
      },
    });

    if (dueSoonBills.length > 0) {
      this.logger.warn(
        `${dueSoonBills.length} bills due within 3 days`,
      );
    }

    if (overdueBills.length > 0) {
      this.logger.warn(`${overdueBills.length} bills are overdue`);
    }

    this.logger.log('Bill due-soon alerts completed');
  }
}
