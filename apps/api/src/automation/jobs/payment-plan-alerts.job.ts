import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InstalmentStatus, NotificationType } from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CronLogService } from '../cron-log.service';

@Injectable()
export class PaymentPlanAlertsJob {
  private readonly logger = new Logger(PaymentPlanAlertsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cronLog: CronLogService,
  ) {}

  @Cron('15 8 * * *', { name: 'payment-plan-instalment-alerts' })
  async checkOverdueInstalments(): Promise<void> {
    this.logger.log('Running payment plan instalment overdue check...');
    const startedAt = new Date();
    let itemsProcessed = 0;
    let errors = 0;

    try {
      const now = new Date();

      const overdueInstalments = await this.prisma.paymentPlanItem.findMany({
        where: {
          status: InstalmentStatus.PENDING,
          dueDate: { lt: now },
        },
        include: {
          plan: { include: { invoice: true } },
        },
      });

      if (overdueInstalments.length === 0) {
        this.logger.log('No overdue instalments found');
      } else {
        await this.prisma.paymentPlanItem.updateMany({
          where: { id: { in: overdueInstalments.map((i) => i.id) } },
          data: { status: InstalmentStatus.OVERDUE },
        });

        for (const inst of overdueInstalments) {
          this.notificationsService.createForRoleAsync('FINANCE_MANAGER', {
            type: NotificationType.INVOICE_OVERDUE,
            title: `Payment plan instalment overdue — ${inst.plan.invoice.invoiceNumber}`,
            body: `Instalment ${inst.instalmentNumber} of $${Number(inst.amount).toFixed(2)} was due ${format(inst.dueDate, 'MMM d, yyyy')} and has not been paid.`,
            link: `/finance/invoices/${inst.plan.invoiceId}`,
          });
        }

        itemsProcessed = overdueInstalments.length;
        this.logger.log(`Flagged ${overdueInstalments.length} overdue instalments`);
      }
    } catch (err: unknown) {
      errors = 1;
      this.logger.error('Payment plan alerts failed', String(err));
    }

    await this.cronLog.log('payment-plan-instalment-alerts', startedAt, {
      itemsProcessed,
      errors,
    });
  }
}
