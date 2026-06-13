import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Invoice } from '@prisma/client';
import puppeteer, { Browser } from 'puppeteer';
import { getPuppeteerLaunchOptions } from '../common/puppeteer.config';
import { SettingsService } from '../settings/settings.service';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

@Injectable()
export class InvoicePdfService implements OnModuleDestroy {
  private readonly logger = new Logger(InvoicePdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly settingsService: SettingsService) {}

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

  async generate(invoice: Invoice): Promise<Buffer> {
    const company = await this.settingsService.getCompanyDetails();
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.buildHtml(invoice, company);
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

  private buildHtml(
    invoice: Invoice,
    company: {
      companyName: string;
      companyAddress: string;
      companyEmail: string;
      invoiceFooterNote: string;
    },
  ): string {
    const lineItems = invoice.lineItems as unknown as LineItem[];
    const issueDate = invoice.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const dueDate = invoice.dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const generatedAt = new Date().toLocaleString('en-US');
    const currency = invoice.currency;
    const fmt = (n: number | string): string =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(Number(n));

    const rows = lineItems
      .map(
        (item, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${this.escapeHtml(item.description)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(item.unitPrice)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(item.amount)}</td>
        </tr>`,
      )
      .join('');

    const taxRow =
      Number(invoice.taxRate) > 0
        ? `<tr><td colspan="3" style="padding:8px 12px;text-align:right;color:#475569;">Tax (${Number(invoice.taxRate)}%)</td><td style="padding:8px 12px;text-align:right;">${fmt(Number(invoice.taxAmount))}</td></tr>`
        : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#0A1628;margin:0;}</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
    <div>
      <span style="font-size:28px;font-weight:bold;color:#C41E3A;">CDY</span>
      <span style="font-size:28px;font-weight:bold;color:#0A1628;"> In-House System</span>
    </div>
    <div style="text-align:right;font-size:12px;color:#475569;line-height:1.6;">
      ${this.escapeHtml(company.companyName)}<br/>${this.escapeHtml(company.companyAddress)}<br/>${this.escapeHtml(company.companyEmail)}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:32px;">
    <div>
      <p style="font-size:11px;text-transform:uppercase;color:#94A3B8;margin:0 0 8px;">Bill To</p>
      <p style="margin:0;font-weight:600;">${this.escapeHtml(invoice.clientId)}</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:4px 0;"><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
      <p style="margin:4px 0;"><strong>Issue Date:</strong> ${issueDate}</p>
      <p style="margin:4px 0;"><strong>Due Date:</strong> ${dueDate}</p>
      <span style="display:inline-block;margin-top:8px;padding:4px 12px;background:#C41E3A;color:white;border-radius:4px;font-size:12px;">${invoice.status}</span>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="background:#C41E3A;color:white;">
        <th style="padding:10px 12px;text-align:left;">Description</th>
        <th style="padding:10px 12px;text-align:center;">Qty</th>
        <th style="padding:10px 12px;text-align:right;">Unit Price</th>
        <th style="padding:10px 12px;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;">
    <table style="width:280px;">
      <tr><td style="padding:6px 12px;text-align:right;color:#475569;">Subtotal</td><td style="padding:6px 12px;text-align:right;">${fmt(Number(invoice.subtotal))}</td></tr>
      ${taxRow}
      <tr><td style="padding:10px 12px;text-align:right;font-weight:bold;font-size:16px;border-top:2px solid #C41E3A;">Total</td><td style="padding:10px 12px;text-align:right;font-weight:bold;font-size:16px;border-top:2px solid #C41E3A;">${fmt(Number(invoice.total))}</td></tr>
    </table>
  </div>

  <div style="margin-top:32px;padding:16px;background:#f8fafc;border-radius:6px;text-align:center;font-size:12px;color:#475569;">
    ${this.escapeHtml(company.invoiceFooterNote)}
  </div>
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94A3B8;">
    Generated by CDY In-House System · ${invoice.invoiceNumber} · ${generatedAt}
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
