import { Module } from '@nestjs/common';
import { RetainersController } from './retainers.controller';
import { RetainersService } from './retainers.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InvoicesModule, NotificationsModule],
  controllers: [RetainersController],
  providers: [RetainersService],
  exports: [RetainersService],
})
export class RetainersModule {}
