import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BudgetService } from '../../budget/budget.service';
import { CronLogService } from '../cron-log.service';

@Injectable()
export class BudgetAlertsJob {
  private readonly logger = new Logger(BudgetAlertsJob.name);

  constructor(
    private readonly budgetService: BudgetService,
    private readonly cronLog: CronLogService,
  ) {}

  @Cron('20 8 * * *', { name: 'budget-alerts' })
  async checkProjectBudgets(): Promise<void> {
    this.logger.log('Running project budget alert check...');
    const startedAt = new Date();
    let itemsProcessed = 0;
    let errors = 0;

    try {
      const count = await this.budgetService.checkBudgetAlerts();
      itemsProcessed = count;
      this.logger.log(`Budget alert check complete — ${count} alerts sent`);
    } catch (err: unknown) {
      errors = 1;
      this.logger.error('Budget alerts failed', String(err));
    }

    await this.cronLog.log('budget-alerts', startedAt, {
      itemsProcessed,
      errors,
    });
  }
}
