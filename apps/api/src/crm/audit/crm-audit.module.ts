import { Module } from '@nestjs/common';
import { CrmAuditService } from './crm-audit.service';
import { CrmAuditController } from './crm-audit.controller';

@Module({
  controllers: [CrmAuditController],
  providers: [CrmAuditService],
  exports: [CrmAuditService],
})
export class CrmAuditModule {}
