import { Module } from '@nestjs/common';
import { CeoDashboardController } from './ceo-dashboard.controller';
import { CeoDashboardService } from './ceo-dashboard.service';

@Module({
  controllers: [CeoDashboardController],
  providers: [CeoDashboardService],
})
export class CeoDashboardModule {}
