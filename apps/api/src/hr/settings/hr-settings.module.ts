import { Module } from '@nestjs/common';
import { HrSettingsController } from './hr-settings.controller';
import { HrSettingsService } from './hr-settings.service';

@Module({
  controllers: [HrSettingsController],
  providers: [HrSettingsService],
  exports: [HrSettingsService],
})
export class HrSettingsModule {}
