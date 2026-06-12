import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { CrmAuditModule } from '../audit/crm-audit.module';
import { ProposalsController } from './proposals.controller';
import { ProposalsListController } from './proposals-list.controller';
import { ProposalsService } from './proposals.service';

@Module({
  imports: [LeadsModule, CrmAuditModule],
  controllers: [ProposalsController, ProposalsListController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
