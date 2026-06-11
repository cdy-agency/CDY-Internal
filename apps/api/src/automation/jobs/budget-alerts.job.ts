import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BudgetService } from '../../budget/budget.service';

@Injectable()
export class BudgetAlertsJob {
  private readonly logger = new Logger(BudgetAlertsJob.name);

  constructor(private readonly budgetService: BudgetService) {}

  @Cron('20 8 * * *', { name: 'budget-alerts' })
  async checkProjectBudgets(): Promise<void> {
    this.logger.log('Running project budget alert check...');
    const count = await this.budgetService.checkBudgetAlerts();
    this.logger.log(`Budget alert check complete — ${count} alerts sent`);
  }
}
