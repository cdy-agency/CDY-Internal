import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { CrmAuditModule } from '../audit/crm-audit.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [LeadsModule, CrmAuditModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
