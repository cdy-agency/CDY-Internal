import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillStatus, NotificationType, Role } from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class BillAlertsJob {
  private readonly logger = new Logger(BillAlertsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

    for (const bill of dueSoonBills) {
      this.notificationsService.createForRoleAsync(Role.FINANCE_MANAGER, {
        type: NotificationType.BILL_DUE_SOON,
        title: `Bill due in 3 days — ${bill.vendorName}`,
        body: `$${Number(bill.amount).toFixed(2)} owed to ${bill.vendorName} is due on ${format(bill.dueDate, 'MMM d, yyyy')}.`,
        link: '/finance/bills',
      });
    }

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
