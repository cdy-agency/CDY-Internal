import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BrandingProjectsController } from './projects/branding-projects.controller';
import { SubmissionsController } from './submissions/submissions.controller';
import { SuppliersController } from './suppliers/suppliers.controller';
import { BrandingProjectsService } from './projects/branding-projects.service';
import { SubmissionsService } from './submissions/submissions.service';
import { SuppliersService } from './suppliers/suppliers.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    BrandingProjectsController,
    SubmissionsController,
    SuppliersController,
  ],
  providers: [BrandingProjectsService, SubmissionsService, SuppliersService],
})
export class BrandingModule {}
