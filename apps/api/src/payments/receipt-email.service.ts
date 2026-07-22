import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditNote, Invoice, Payment } from '@prisma/client';
import { Resend } from 'resend';
import {
  invoiceRemainingBalance,
  isInvoiceFullySettled,
} from '../common/invoice-balance.util';

type InvoiceWithPayments = Invoice & {
  payments: Payment[];
  creditNotes?: CreditNote[];
};

@Injectable()
export class ReceiptEmailService {
  private readonly logger = new Logger(ReceiptEmailService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendReceipt(
    invoice: InvoiceWithPayments,
    payment: Payment,
    pdfBuffer: Buffer,
    clientEmail: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — skipping receipt email');
      return;
    }

    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ?? 'finance@cdy.com';
    const currency = invoice.currency;
    const fmt = (n: number): string =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

    const activePayments = invoice.payments.filter((p) => !p.deletedAt);
    const isFullyPaid = isInvoiceFullySettled({
      total: invoice.total,
      payments: activePayments,
      creditNotes: invoice.creditNotes,
    });
    const remaining = invoiceRemainingBalance({
      total: invoice.total,
      payments: activePayments,
      creditNotes: invoice.creditNotes,
    });

    const badge = isFullyPaid
      ? '<span style="background:#0D2A1A;color:#10B981;padding:6px 16px;border-radius:4px;font-weight:bold;">PAID IN FULL</span>'
      : `<span style="background:#2D1A00;color:#F59E0B;padding:6px 16px;border-radius:4px;">Remaining: ${fmt(remaining)}</span>`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0A1628;padding:24px;"><span style="color:#C41E3A;font-size:24px;font-weight:bold;">CDY</span></div>
        <div style="background:#112240;padding:32px;color:#F8FAFC;">
          <p>Hello ${invoice.clientId},</p>
          <p>We confirm receipt of your payment of <strong>${fmt(Number(payment.amount))}</strong> via ${payment.method.replace(/_/g, ' ')} on ${new Date(payment.paidAt).toLocaleDateString()}.</p>
          <p>Invoice: <strong>${invoice.invoiceNumber}</strong></p>
          <div style="margin:24px 0;">${badge}</div>
        </div>
      </div>`;

    const result = await this.resend.emails.send({
      from: fromEmail,
      to: clientEmail,
      subject: `Payment Receipt — Invoice ${invoice.invoiceNumber} — CDY`,
      html,
      attachments: [
        {
          filename: `Receipt-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (result.error) {
      this.logger.error(`Receipt email failed: ${JSON.stringify(result.error)}`);
      throw new Error('Failed to send receipt email');
    }
  }
}
