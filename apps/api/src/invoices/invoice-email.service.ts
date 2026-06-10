import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '@prisma/client';
import { Resend } from 'resend';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

@Injectable()
export class InvoiceEmailService {
  private readonly logger = new Logger(InvoiceEmailService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set — email sending will be skipped in development',
      );
    }
  }

  async sendInvoice(
    invoice: Invoice,
    pdfBuffer: Buffer,
    clientEmail: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Skipping email for invoice ${invoice.invoiceNumber} — RESEND_API_KEY not configured`,
      );
      return;
    }

    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ?? 'finance@cdy.com';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    const lineItems = invoice.lineItems as unknown as LineItem[];
    const currency = invoice.currency;
    const fmt = (n: number | string): string =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(Number(n));

    const formattedTotal = fmt(Number(invoice.total));
    const formattedDueDate = invoice.dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const lineRows = lineItems
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1E3A5F;">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1E3A5F;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1E3A5F;text-align:right;">${fmt(item.amount)}</td>
        </tr>`,
      )
      .join('');

    const taxRow =
      Number(invoice.taxRate) > 0
        ? `<tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#94A3B8;">Tax (${Number(invoice.taxRate)}%)</td><td style="padding:8px 12px;text-align:right;">${fmt(Number(invoice.taxAmount))}</td></tr>`
        : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0A1628;padding:24px;border-radius:8px 8px 0 0;">
          <span style="font-size:24px;font-weight:bold;color:#C41E3A;">CDY</span>
          <span style="font-size:24px;font-weight:bold;color:#F8FAFC;"> In-House System</span>
        </div>
        <div style="background:#112240;padding:32px;color:#F8FAFC;">
          <p>Hello ${invoice.clientId},</p>
          <p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${formattedTotal}</strong>, due <strong>${formattedDueDate}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0;">
            <thead>
              <tr style="background:#1E3A5F;">
                <th style="padding:8px 12px;text-align:left;">Description</th>
                <th style="padding:8px 12px;text-align:center;">Qty</th>
                <th style="padding:8px 12px;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
            <tfoot>
              <tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#94A3B8;">Subtotal</td><td style="padding:8px 12px;text-align:right;">${fmt(Number(invoice.subtotal))}</td></tr>
              ${taxRow}
              <tr><td colspan="2" style="padding:8px 12px;text-align:right;font-weight:bold;">Total</td><td style="padding:8px 12px;text-align:right;font-weight:bold;">${formattedTotal}</td></tr>
            </tfoot>
          </table>
          <a href="${frontendUrl}/finance/invoices/${invoice.id}" style="display:inline-block;background:#C41E3A;color:#F8FAFC;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Invoice</a>
        </div>
        <div style="background:#0A1628;padding:16px;text-align:center;color:#94A3B8;font-size:12px;border-radius:0 0 8px 8px;">
          CDY Agency · finance@cdy.com · Nairobi, Kenya
        </div>
      </div>`;

    try {
      const result = await this.resend.emails.send({
        from: fromEmail,
        to: clientEmail,
        subject: `Invoice ${invoice.invoiceNumber} from CDY — ${formattedTotal} due ${formattedDueDate}`,
        html,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (result.error) {
        this.logger.error(`Resend API error: ${JSON.stringify(result.error)}`);
        throw new InternalServerErrorException('Failed to send invoice email');
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Email send failed: ${String(error)}`);
      throw new InternalServerErrorException('Failed to send invoice email');
    }
  }
}
