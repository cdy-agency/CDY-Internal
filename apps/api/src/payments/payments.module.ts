import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { ReceiptEmailService } from './receipt-email.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    ReceiptPdfService,
    ReceiptEmailService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
