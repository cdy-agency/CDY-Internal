import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
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

interface ClientInfo {
  companyName: string | null;
  contactName: string;
  email: string;
  address: string | null;
  city: string | null;
  country: string;
}

@Injectable()
export class InvoicePdfService implements OnModuleDestroy {
  private readonly logger = new Logger(InvoicePdfService.name);
  private browserPromise: Promise<Browser> | null = null;
  private readonly logoDataUri: string;

  constructor(private readonly settingsService: SettingsService) {
    const logoPath = join(__dirname, 'assets', 'logo.png');
    const logoBase64 = readFileSync(logoPath).toString('base64');
    this.logoDataUri = `data:image/png;base64,${logoBase64}`;
  }

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

  async generate(invoice: Invoice, client?: ClientInfo): Promise<Buffer> {
    const company = await this.settingsService.getCompanyDetails();
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.buildHtml(invoice, company, client);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
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
    client?: ClientInfo,
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

    const currency = invoice.currency;
    const fmt = (n: number | string): string =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(n));

    const statusLabel = invoice.status.replace(/_/g, ' ');

    const clientName = client?.companyName ?? client?.contactName ?? '—';
    const clientLines = [
      client?.companyName && client.contactName !== client.companyName
        ? `<div style="color:#475569;font-size:13px;margin-top:2px;">${this.escapeHtml(client.contactName)}</div>`
        : '',
      client?.email
        ? `<div style="color:#475569;font-size:13px;">${this.escapeHtml(client.email)}</div>`
        : '',
      client?.address
        ? `<div style="color:#475569;font-size:13px;">${this.escapeHtml(client.address)}</div>`
        : '',
      client?.city || client?.country
        ? `<div style="color:#475569;font-size:13px;">${[client?.city, client?.country].filter(Boolean).map(s => this.escapeHtml(s!)).join(', ')}</div>`
        : '',
    ].join('');

    const rows = lineItems
      .map(
        (item, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${this.escapeHtml(item.description)}</td>
          <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#475569;">${item.quantity}</td>
          <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#475569;">${fmt(item.unitPrice)}</td>
          <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:500;color:#1e293b;">${fmt(item.amount)}</td>
        </tr>`,
      )
      .join('');

    const taxRow =
      Number(invoice.taxRate) > 0
        ? `<tr>
            <td style="padding:6px 16px;text-align:right;font-size:13px;color:#475569;">Tax (${Number(invoice.taxRate)}%)</td>
            <td style="padding:6px 16px;text-align:right;font-size:13px;color:#475569;">${fmt(Number(invoice.taxAmount))}</td>
           </tr>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #ffffff; }
    @page { margin: 0; }
  </style>
</head>
<body>

  <!-- Header band -->
  <div style="background:#0A1628;padding:24px 48px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">

      <!-- Logo image -->
      <img src="${this.logoDataUri}" alt="CDY Agency" style="height:72px;width:auto;object-fit:contain;" />

      <!-- Company contact block -->
      <div style="text-align:right;">
        <div style="font-size:13px;color:#ffffff;font-weight:600;">${this.escapeHtml(company.companyName)}</div>
        <div style="margin-top:5px;font-size:12px;color:#94a3b8;line-height:1.8;">
          ${this.escapeHtml(company.companyAddress)}<br>
          info@cdyagency.com<br>
          +250 790 147 808
        </div>
      </div>
    </div>
  </div>

  <!-- Invoice title strip -->
  <div style="background:#C41E3A;padding:14px 48px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">Invoice</span>
    <span style="background:rgba(255,255,255,0.2);color:#ffffff;font-size:12px;font-weight:600;padding:4px 14px;border-radius:20px;letter-spacing:0.5px;">${this.escapeHtml(statusLabel)}</span>
  </div>

  <!-- Meta row: bill-to + invoice details -->
  <div style="padding:32px 48px;display:flex;justify-content:space-between;gap:32px;border-bottom:1px solid #f1f5f9;">

    <div style="flex:1;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase;margin-bottom:10px;">Bill To</div>
      <div style="font-size:15px;font-weight:700;color:#0f172a;">${this.escapeHtml(clientName)}</div>
      ${clientLines}
    </div>

    <div style="text-align:right;flex-shrink:0;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase;margin-bottom:10px;">Invoice Details</div>
      <table style="margin-left:auto;">
        <tr>
          <td style="font-size:12px;color:#64748b;padding:3px 0;text-align:right;">Invoice No.</td>
          <td style="font-size:12px;font-weight:600;color:#0f172a;padding:3px 0 3px 20px;text-align:right;">${this.escapeHtml(invoice.invoiceNumber)}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#64748b;padding:3px 0;text-align:right;">Issue Date</td>
          <td style="font-size:12px;color:#1e293b;padding:3px 0 3px 20px;text-align:right;">${issueDate}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#64748b;padding:3px 0;text-align:right;">Due Date</td>
          <td style="font-size:12px;font-weight:600;color:#C41E3A;padding:3px 0 3px 20px;text-align:right;">${dueDate}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#64748b;padding:3px 0;text-align:right;">Currency</td>
          <td style="font-size:12px;color:#1e293b;padding:3px 0 3px 20px;text-align:right;">${this.escapeHtml(currency)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Line items table -->
  <div style="padding:0 48px;">
    <table style="width:100%;border-collapse:collapse;margin-top:28px;">
      <thead>
        <tr style="background:#0A1628;">
          <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;">Description</th>
          <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;width:80px;">Qty</th>
          <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;width:130px;">Unit Price</th>
          <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;width:130px;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="padding:8px 48px 32px;display:flex;justify-content:flex-end;">
    <div style="width:300px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 16px;text-align:right;font-size:13px;color:#475569;">Subtotal</td>
          <td style="padding:6px 16px;text-align:right;font-size:13px;color:#1e293b;">${fmt(Number(invoice.subtotal))}</td>
        </tr>
        ${taxRow}
        <tr style="border-top:2px solid #0A1628;">
          <td style="padding:12px 16px;text-align:right;font-size:15px;font-weight:700;color:#0A1628;">Total Due</td>
          <td style="padding:12px 16px;text-align:right;font-size:15px;font-weight:700;color:#C41E3A;">${fmt(Number(invoice.total))}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin:0 48px;border-top:1px solid #f1f5f9;padding:20px 0;">
    ${company.invoiceFooterNote
      ? `<p style="font-size:12px;color:#64748b;text-align:center;line-height:1.6;">${this.escapeHtml(company.invoiceFooterNote)}</p>`
      : ''}
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:10px;">
      CDY Agency &nbsp;·&nbsp; info@cdyagency.com &nbsp;·&nbsp; +250 790 147 808
    </p>
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
