import { Module } from '@nestjs/common';
import { PaymentPlansController } from './payment-plans.controller';
import { PaymentPlansService } from './payment-plans.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [PaymentPlansController],
  providers: [PaymentPlansService],
  exports: [PaymentPlansService],
})
export class PaymentPlansModule {}
