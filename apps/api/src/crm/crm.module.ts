import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmSummaryService } from './crm-summary.service';
import { LeadsModule } from './leads/leads.module';
import { ActivitiesModule } from './activities/activities.module';
import { ProposalsModule } from './proposals/proposals.module';
import { ClientsModule } from './clients/clients.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { TargetsModule } from './targets/targets.module';
import { CrmAuditModule } from './audit/crm-audit.module';
import { CrmSettingsModule } from './settings/crm-settings.module';
import { CrmReportsModule } from './reports/crm-reports.module';
import { SavedFiltersModule } from './filters/saved-filters.module';

@Module({
  imports: [
    LeadsModule,
    ActivitiesModule,
    ProposalsModule,
    ClientsModule,
    PipelineModule,
    TargetsModule,
    CrmAuditModule,
    CrmSettingsModule,
    CrmReportsModule,
    SavedFiltersModule,
  ],
  controllers: [CrmController],
  providers: [CrmSummaryService],
})
export class CrmModule {}
