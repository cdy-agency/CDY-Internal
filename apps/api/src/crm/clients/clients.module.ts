import { Module } from '@nestjs/common';
import { CrmAuditModule } from '../audit/crm-audit.module';
import { InvoicesModule } from '../../invoices/invoices.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientServiceService } from './client-service.service';

@Module({
  imports: [CrmAuditModule, InvoicesModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientServiceService],
  exports: [ClientsService, ClientServiceService],
})
export class ClientsModule {}
