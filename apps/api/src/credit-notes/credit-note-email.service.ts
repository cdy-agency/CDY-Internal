import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditNote, Invoice } from '@prisma/client';
import { Resend } from 'resend';

@Injectable()
export class CreditNoteEmailService {
  private readonly logger = new Logger(CreditNoteEmailService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(
    creditNote: CreditNote,
    invoice: Invoice,
    pdfBuffer: Buffer,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Skipping credit note email ${creditNote.creditNoteNumber} — RESEND not configured`,
      );
      return;
    }

    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ?? 'finance@cdy.com';
    const clientEmail = `${invoice.clientId.replace(/[^a-zA-Z0-9]/g, '')}@client.cdy.com`;
    const amount = Number(creditNote.amount);
    const fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency,
    }).format(amount);

    const refundMsg = creditNote.refundDue
      ? `<p style="color:#16a34a;font-weight:bold;">A refund of ${fmt} will be processed to your account within 14 business days.</p>`
      : `<p>This credit reduces your outstanding balance with CDY.</p>`;

    await this.resend.emails.send({
      from: fromEmail,
      to: clientEmail,
      subject: `Credit Note ${creditNote.creditNoteNumber} — CDY`,
      html: `
        <div style="background:#0A1628;padding:24px;color:#fff;font-family:Arial,sans-serif;">
          <h1 style="color:#C41E3A;margin:0;">CDY</h1>
        </div>
        <div style="padding:24px;font-family:Arial,sans-serif;">
          <p>We have issued a credit note against invoice <strong>${invoice.invoiceNumber}</strong>.</p>
          <p><strong>Credit amount:</strong> ${fmt}</p>
          <p><strong>Reason:</strong> ${creditNote.reason.replace(/_/g, ' ')}</p>
          ${refundMsg}
        </div>
      `,
      attachments: [
        {
          filename: `${creditNote.creditNoteNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    this.logger.log(`Credit note email sent: ${creditNote.creditNoteNumber}`);
  }
}
