import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceEmailService } from './invoice-email.service';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoiceNumberService,
    InvoicePdfService,
    InvoiceEmailService,
  ],
  exports: [InvoicesService, InvoiceEmailService],
})
export class InvoicesModule {}
