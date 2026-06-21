import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { CampaignsController } from './campaigns/campaigns.controller';
import { InfluencersController } from './influencers/influencers.controller';
import { AssignmentsController } from './assignments/assignments.controller';
import { DeliverablesController } from './deliverables/deliverables.controller';
import { CampaignsService } from './campaigns/campaigns.service';
import { InfluencersService } from './influencers/influencers.service';
import { AssignmentsService } from './assignments/assignments.service';
import { DeliverablesService } from './deliverables/deliverables.service';

@Module({
  imports: [NotificationsModule, InvoicesModule],
  controllers: [
    CampaignsController,
    InfluencersController,
    AssignmentsController,
    DeliverablesController,
  ],
  providers: [
    CampaignsService,
    InfluencersService,
    AssignmentsService,
    DeliverablesService,
  ],
})
export class InfluencerModule {}
