import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CreditNote, Invoice } from '@prisma/client';
import puppeteer, { Browser } from 'puppeteer';
import { getPuppeteerLaunchOptions } from '../common/puppeteer.config';

@Injectable()
export class CreditNotePdfService implements OnModuleDestroy {
  private readonly logger = new Logger(CreditNotePdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch(getPuppeteerLaunchOptions());
    }
    return this.browserPromise;
  }

  async generate(creditNote: CreditNote, invoice: Invoice): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      const html = this.buildHtml(creditNote, invoice);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private fmt(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildHtml(creditNote: CreditNote, invoice: Invoice): string {
    const amount = Number(creditNote.amount);
    const refundBanner = creditNote.refundDue
      ? `<div style="margin:20px 0;padding:16px;background:#ecfdf5;border:2px solid #16a34a;border-radius:8px;">
          <strong style="color:#16a34a;font-size:16px;">REFUND DUE</strong>
          <p style="margin:8px 0 0;color:#166534;">A refund of ${this.fmt(amount, invoice.currency)} will be processed within 14 business days.</p>
        </div>`
      : '';

    const footerNote = creditNote.refundDue
      ? `A refund of ${this.fmt(amount, invoice.currency)} will be processed within 14 days.`
      : 'This credit note reduces your outstanding balance with CDY.';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;color:#0f172a;background:#fff;">
      <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
        <div>
          <h1 style="margin:0;font-size:32px;color:#C41E3A;">CREDIT NOTE</h1>
          <p style="margin:8px 0 0;font-size:18px;font-weight:bold;">${this.escapeHtml(creditNote.creditNoteNumber)}</p>
        </div>
        <div style="text-align:right;">
          <div style="font-size:24px;font-weight:bold;color:#C41E3A;">CDY</div>
          <div style="font-size:11px;color:#64748b;">In-House System</div>
        </div>
      </div>
      <p style="color:#475569;">Credited to Invoice: <strong>${this.escapeHtml(invoice.invoiceNumber)}</strong></p>
      <p style="color:#475569;">Client: ${this.escapeHtml(invoice.clientId)}</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;">Description</th>
          <th style="padding:10px 12px;text-align:right;">Amount</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${this.escapeHtml(creditNote.description)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#C41E3A;">-${this.fmt(amount, invoice.currency)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="font-weight:bold;">
            <td style="padding:12px;">Total Credit</td>
            <td style="padding:12px;text-align:right;color:#C41E3A;">-${this.fmt(amount, invoice.currency)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="padding:12px 16px;background:#fef2f2;border-left:4px solid #C41E3A;margin:16px 0;">
        <strong>Reason:</strong> ${creditNote.reason.replace(/_/g, ' ')}
      </div>
      ${refundBanner}
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">
        ${footerNote}<br/>
        Generated ${new Date().toLocaleString('en-US')} — Confidential
      </div>
    </body></html>`;
  }
}
