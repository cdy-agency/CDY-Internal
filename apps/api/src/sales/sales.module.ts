import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CampaignsController } from './campaigns/campaigns.controller';
import { CampaignsService } from './campaigns/campaigns.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { LogsController } from './logs/logs.controller';
import { LogsService } from './logs/logs.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    CampaignsController,
    AgentsController,
    LogsController,
    ReportsController,
  ],
  providers: [CampaignsService, AgentsService, LogsService, ReportsService],
})
export class SalesModule {}
