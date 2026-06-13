import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { getPuppeteerLaunchOptions } from '../common/puppeteer.config';
import { format } from 'date-fns';

interface TaxReportData {
  period: { from: string; to: string };
  taxCollected: {
    total: number;
    byRate: {
      rateName: string;
      ratePercent: number;
      invoiceCount: number;
      grossRevenue: number;
      taxAmount: number;
    }[];
  };
  inputTax: number;
  totalRemitted: number;
  netOwed: number;
  remittances: {
    paidAt: string;
    authorityName: string;
    amount: number;
    reference: string | null;
  }[];
}

@Injectable()
export class TaxPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(TaxPdfService.name);
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

  async generate(report: TaxReportData): Promise<Buffer> {
    const periodLabel = `${format(new Date(report.period.from), 'MMMM yyyy')} – ${format(new Date(report.period.to), 'MMMM yyyy')}`;
    const netColor = report.netOwed > 0 ? '#dc2626' : '#16a34a';

    const rateRows = report.taxCollected.byRate
      .map(
        (r) => `
      <tr>
        <td>${r.rateName} (${r.ratePercent}%)</td>
        <td style="text-align:center">${r.invoiceCount}</td>
        <td style="text-align:right">$${r.grossRevenue.toFixed(2)}</td>
        <td style="text-align:right">$${r.taxAmount.toFixed(2)}</td>
      </tr>`,
      )
      .join('');

    const remittanceRows = report.remittances
      .map(
        (r) => `
      <tr>
        <td>${format(new Date(r.paidAt), 'MMM d, yyyy')}</td>
        <td>${r.authorityName}</td>
        <td style="text-align:right">$${r.amount.toFixed(2)}</td>
        <td>${r.reference ?? '—'}</td>
      </tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { color: #dc2626; font-size: 24px; font-weight: bold; }
    h1 { color: #dc2626; font-size: 28px; margin: 0 0 8px; }
    .period { color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #1a1a2e; color: white; padding: 10px; text-align: left; font-size: 12px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .total-row { font-weight: bold; background: #f9fafb; }
    .net-owed { font-size: 20px; font-weight: bold; color: ${netColor}; padding: 16px; border: 2px solid ${netColor}; margin: 24px 0; }
    .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
    .section-title { font-size: 14px; font-weight: bold; color: #1a1a2e; margin-top: 24px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>TAX LIABILITY REPORT</h1>
      <p class="period">Period: ${periodLabel}</p>
    </div>
    <div class="brand">CDY</div>
  </div>

  <p class="section-title">Tax Collected</p>
  <table>
    <thead>
      <tr>
        <th>Rate</th>
        <th style="text-align:center">Invoices</th>
        <th style="text-align:right">Gross Revenue</th>
        <th style="text-align:right">Tax Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rateRows}
      <tr class="total-row">
        <td colspan="3">TOTAL COLLECTED</td>
        <td style="text-align:right">$${report.taxCollected.total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <p class="section-title">Input Tax Recoverable</p>
  <p>$${report.inputTax.toFixed(2)} <em style="color:#999">(tracked in future sprint)</em></p>

  <p class="section-title">Tax Remitted This Period</p>
  <p><strong>$${report.totalRemitted.toFixed(2)}</strong></p>

  <div class="net-owed">NET TAX OWED: $${report.netOwed.toFixed(2)}</div>

  <p class="section-title">Remittances Paid</p>
  <table>
    <thead>
      <tr><th>Date</th><th>Authority</th><th style="text-align:right">Amount</th><th>Reference</th></tr>
    </thead>
    <tbody>${remittanceRows || '<tr><td colspan="4">No remittances</td></tr>'}</tbody>
  </table>

  <div class="footer">Prepared by CDY Finance System — Confidential</div>
</body>
</html>`;

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
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
}
