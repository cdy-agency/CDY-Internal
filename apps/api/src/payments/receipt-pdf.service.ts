import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CreditNote, Invoice, Payment } from '@prisma/client';
import puppeteer, { Browser } from 'puppeteer';
import { getPuppeteerLaunchOptions } from '../common/puppeteer.config';
import { isInvoiceFullySettled } from '../common/invoice-balance.util';

type InvoiceWithPayments = Invoice & {
  payments: Payment[];
  creditNotes?: CreditNote[];
};

@Injectable()
export class ReceiptPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(ReceiptPdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch(getPuppeteerLaunchOptions());
    }
    return this.browserPromise;
  }

  async generate(invoice: InvoiceWithPayments, payment: Payment): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      const html = this.buildHtml(invoice, payment);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private buildHtml(invoice: InvoiceWithPayments, payment: Payment): string {
    const receiptNumber = `CDY-REC-${payment.id.slice(-8).toUpperCase()}`;
    const currency = invoice.currency;
    const fmt = (n: number): string =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

    const isFullyPaid = isInvoiceFullySettled({
      total: invoice.total,
      payments: invoice.payments.filter((p) => !p.deletedAt),
      creditNotes: invoice.creditNotes,
    });
    const stamp = isFullyPaid
      ? '<div style="color:#10B981;font-size:28px;font-weight:bold;border:3px solid #10B981;padding:12px 24px;display:inline-block;margin:20px 0;">PAID IN FULL</div>'
      : '<div style="color:#F59E0B;font-size:24px;font-weight:bold;border:3px solid #F59E0B;padding:12px 24px;display:inline-block;margin:20px 0;">PARTIAL PAYMENT</div>';

    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:40px;">
      <div style="display:flex;justify-content:space-between;">
        <h1 style="color:#C41E3A;margin:0;">PAYMENT RECEIPT</h1>
        <div style="text-align:right;"><span style="font-size:20px;font-weight:bold;color:#C41E3A;">CDY</span></div>
      </div>
      <p style="color:#475569;">Receipt #: ${receiptNumber}</p>
      <p>Invoice Reference: <strong>${invoice.invoiceNumber}</strong></p>
      <p>Received From: <strong>${invoice.clientId}</strong></p>
      <hr style="border-color:#1E3A5F;margin:24px 0;"/>
      <table style="width:100%;">
        <tr><td style="padding:8px 0;color:#475569;">Amount Paid</td><td style="text-align:right;font-weight:bold;">${fmt(Number(payment.amount))}</td></tr>
        <tr><td style="padding:8px 0;color:#475569;">Method</td><td style="text-align:right;">${payment.method.replace(/_/g, ' ')}</td></tr>
        <tr><td style="padding:8px 0;color:#475569;">Date</td><td style="text-align:right;">${new Date(payment.paidAt).toLocaleDateString()}</td></tr>
        <tr><td style="padding:8px 0;color:#475569;">Reference</td><td style="text-align:right;">${payment.reference ?? '—'}</td></tr>
      </table>
      <div style="text-align:center;">${stamp}</div>
      <p style="text-align:center;color:#94A3B8;font-size:12px;margin-top:40px;">CDY Agency · Thank you for your payment</p>
    </body></html>`;
  }
}
