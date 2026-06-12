import { Module } from '@nestjs/common';
import { CrmReportsService } from './crm-reports.service';
import { CrmReportsController } from './crm-reports.controller';

@Module({
  controllers: [CrmReportsController],
  providers: [CrmReportsService],
  exports: [CrmReportsService],
})
export class CrmReportsModule {}
