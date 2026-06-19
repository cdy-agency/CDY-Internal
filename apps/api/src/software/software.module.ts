import { Module } from '@nestjs/common';
import { SoftwareProjectsController } from './projects/software-projects.controller';
import { RequirementsController } from './requirements/requirements.controller';
import { DesignController } from './design/design.controller';
import { SprintsController } from './sprints/sprints.controller';
import { QaController } from './qa/qa.controller';
import { DeploymentController } from './deployment/deployment.controller';
import { SoftwareProjectsService } from './projects/software-projects.service';
import { RequirementsService } from './requirements/requirements.service';
import { DesignService } from './design/design.service';
import { SprintsService } from './sprints/sprints.service';
import { QaService } from './qa/qa.service';
import { DeploymentService } from './deployment/deployment.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [
    SoftwareProjectsController,
    RequirementsController,
    DesignController,
    SprintsController,
    QaController,
    DeploymentController,
  ],
  providers: [
    SoftwareProjectsService,
    RequirementsService,
    DesignService,
    SprintsService,
    QaService,
    DeploymentService,
  ],
})
export class SoftwareModule {}
