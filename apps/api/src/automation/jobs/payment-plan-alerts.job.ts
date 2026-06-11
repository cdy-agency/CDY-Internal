import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InstalmentStatus, NotificationType, Role } from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PaymentPlanAlertsJob {
  private readonly logger = new Logger(PaymentPlanAlertsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('15 8 * * *', { name: 'payment-plan-instalment-alerts' })
  async checkOverdueInstalments(): Promise<void> {
    this.logger.log('Running payment plan instalment overdue check...');

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
      return;
    }

    await this.prisma.paymentPlanItem.updateMany({
      where: { id: { in: overdueInstalments.map((i) => i.id) } },
      data: { status: InstalmentStatus.OVERDUE },
    });

    for (const inst of overdueInstalments) {
      this.notificationsService.createForRoleAsync(Role.FINANCE_MANAGER, {
        type: NotificationType.INVOICE_OVERDUE,
        title: `Payment plan instalment overdue — ${inst.plan.invoice.invoiceNumber}`,
        body: `Instalment ${inst.instalmentNumber} of $${Number(inst.amount).toFixed(2)} was due ${format(inst.dueDate, 'MMM d, yyyy')} and has not been paid.`,
        link: `/finance/invoices/${inst.plan.invoiceId}`,
      });
    }

    this.logger.log(`Flagged ${overdueInstalments.length} overdue instalments`);
  }
}
