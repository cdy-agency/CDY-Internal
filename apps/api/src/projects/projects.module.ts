import { Module } from '@nestjs/common';
import { BudgetModule } from '../budget/budget.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { ProjectCodeService } from './projects/project-code.service';
import { MilestonesController } from './milestones/milestones.controller';
import { MilestonesService } from './milestones/milestones.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { TimeController } from './time/time.controller';
import { TimeService } from './time/time.service';
import { ProjectsSummaryService } from './summary/projects-summary.service';
import { ProjectActivityService } from './activity/project-activity.service';
import { DeliverableApprovalService } from './approvals/deliverable-approval.service';
import { ApprovalsController } from './approvals/approvals.controller';
import { HourlyRateService } from './hourly-rates/hourly-rate.service';

import { ProjectReportsController } from './reports/project-reports.controller';
import { ProjectReportsService } from './reports/project-reports.service';

@Module({
  imports: [BudgetModule, InvoicesModule],
  controllers: [
    ProjectReportsController,
    ProjectsController,
    MilestonesController,
    TasksController,
    TimeController,
    ApprovalsController,
  ],
  providers: [
    ProjectsService,
    ProjectCodeService,
    MilestonesService,
    TasksService,
    TimeService,
    ProjectsSummaryService,
    ProjectActivityService,
    DeliverableApprovalService,
    HourlyRateService,
    ProjectReportsService,
  ],
  exports: [ProjectsService, ProjectsSummaryService, ProjectActivityService],
})
export class ProjectsModule {}
