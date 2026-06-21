import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { ProjectCodeService } from './projects/project-code.service';
import { MilestonesController } from './milestones/milestones.controller';
import { MilestonesService } from './milestones/milestones.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { ProjectsSummaryService } from './summary/projects-summary.service';
import { ProjectActivityService } from './activity/project-activity.service';
import { DeliverableApprovalService } from './approvals/deliverable-approval.service';
import { ApprovalsController } from './approvals/approvals.controller';
import { ProjectReportsController } from './reports/project-reports.controller';
import { ProjectReportsService } from './reports/project-reports.service';

@Module({
  imports: [InvoicesModule],
  controllers: [
    ProjectReportsController,
    ProjectsController,
    MilestonesController,
    TasksController,
    ApprovalsController,
  ],
  providers: [
    ProjectsService,
    ProjectCodeService,
    MilestonesService,
    TasksService,
    ProjectsSummaryService,
    ProjectActivityService,
    DeliverableApprovalService,
    ProjectReportsService,
  ],
  exports: [ProjectsService, ProjectsSummaryService, ProjectActivityService],
})
export class ProjectsModule {}
