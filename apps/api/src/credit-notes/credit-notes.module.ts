import { Module } from '@nestjs/common';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { CreditNotePdfService } from './credit-note-pdf.service';
import { CreditNoteEmailService } from './credit-note-email.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [CreditNotesController],
  providers: [
    CreditNotesService,
    CreditNotePdfService,
    CreditNoteEmailService,
  ],
  exports: [CreditNotesService],
})
export class CreditNotesModule {}
