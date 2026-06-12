import { Global, Module } from '@nestjs/common';
import { HrAuditController } from './hr-audit.controller';
import { HrAuditService } from './hr-audit.service';

@Global()
@Module({
  controllers: [HrAuditController],
  providers: [HrAuditService],
  exports: [HrAuditService],
})
export class HrAuditModule {}
