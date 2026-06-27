import { Module } from '@nestjs/common';
import { CommissionsModule } from '../../commissions/commissions.module';
import { InvoicesModule } from '../../invoices/invoices.module';
import { CrmAuditModule } from '../audit/crm-audit.module';
import { CrmSettingsModule } from '../settings/crm-settings.module';
import { ClientsModule } from '../clients/clients.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadScoringService } from './lead-scoring.service';

@Module({
  imports: [CommissionsModule, InvoicesModule, CrmAuditModule, CrmSettingsModule, ClientsModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadScoringService],
  exports: [LeadsService, LeadScoringService],
})
export class LeadsModule {}
