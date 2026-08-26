import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { MarketingClientsController } from './clients/marketing-clients.controller';
import { ContentController } from './content/content.controller';
import { MarketingClientsService } from './clients/marketing-clients.service';
import { ContentService } from './content/content.service';
import { CalendarPdfService } from './content/calendar-pdf.service';
import { MarketingSummaryService } from './summary/marketing-summary.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [NotificationsModule, ProjectsModule],
  controllers: [
    MarketingController,
    MarketingClientsController,
    ContentController,
  ],
  providers: [
    MarketingClientsService,
    ContentService,
    CalendarPdfService,
    MarketingSummaryService,
  ],
  exports: [MarketingSummaryService],
})
export class MarketingModule {}
