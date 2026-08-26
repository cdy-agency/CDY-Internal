import { Module, Global } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { DataCutoffService } from './data-cutoff.service';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, DataCutoffService],
  exports: [SettingsService, DataCutoffService],
})
export class SettingsModule {}
