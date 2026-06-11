import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { TaxPdfService } from './tax-pdf.service';

@Module({
  controllers: [TaxController],
  providers: [TaxService, TaxPdfService],
  exports: [TaxService],
})
export class TaxModule {}
