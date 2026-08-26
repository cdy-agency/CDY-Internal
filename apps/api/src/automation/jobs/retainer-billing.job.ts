import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RetainerStatus } from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { RetainersService } from '../../retainers/retainers.service';
import { CronLogService } from '../cron-log.service';

@Injectable()
export class RetainerBillingJob {
  private readonly logger = new Logger(RetainerBillingJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retainersService: RetainersService,
    private readonly cronLog: CronLogService,
  ) {}

  @Cron('0 7 * * *', { name: 'retainer-auto-billing' })
  async processRetainerBilling(): Promise<void> {
    this.logger.log('Running retainer auto-billing...');
    const startedAt = new Date();
    let itemsProcessed = 0;
    let errors = 0;

    const today = startOfDay(new Date());

    const dueRetainers = await this.prisma.retainerContract.findMany({
      where: {
        status: RetainerStatus.ACTIVE,
        nextBillingDate: {
          gte: today,
          lt: addDays(today, 1),
        },
      },
    });

    this.logger.log(`Found ${dueRetainers.length} retainers due for billing today`);

    for (const retainer of dueRetainers) {
      try {
        // No auditCtx — matches every other cron job in this codebase,
        // none of which write audit log entries for automated actions.
        await this.retainersService.generateInvoiceNow(retainer.id, retainer.createdBy);
        itemsProcessed++;
      } catch (err) {
        errors++;
        this.logger.error(
          `Failed to process retainer billing for retainer ${retainer.id}`,
          String(err),
        );
      }
    }

    this.logger.log('Retainer auto-billing complete');

    await this.cronLog.log('retainer-auto-billing', startedAt, {
      itemsProcessed,
      errors,
    });
  }
}
