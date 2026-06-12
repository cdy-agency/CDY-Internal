import { Module } from '@nestjs/common';
import { CrmSettingsService } from './crm-settings.service';
import { CrmSettingsController } from './crm-settings.controller';

@Module({
  controllers: [CrmSettingsController],
  providers: [CrmSettingsService],
  exports: [CrmSettingsService],
})
export class CrmSettingsModule {}
