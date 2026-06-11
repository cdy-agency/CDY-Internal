import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PayrollLineItem, PayrollRun } from '@prisma/client';
import { format, parse } from 'date-fns';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class PayslipPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PayslipPdfService.name);
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
      this.browserPromise = puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browserPromise;
  }

  async generate(
    lineItem: PayrollLineItem,
    run: PayrollRun,
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.buildHtml(lineItem, run);
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

  private buildHtml(lineItem: PayrollLineItem, run: PayrollRun): string {
    const currency = run.currency;
    const fmt = (n: number): string =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(n);

    const periodDate = parse(run.month, 'yyyy-MM', new Date());
    const periodLabel = format(periodDate, 'MMMM yyyy');
    const payRef = `CDY-PAY-${run.month}-${lineItem.employeeId.slice(-6).toUpperCase()}`;
    const generatedAt = new Date().toLocaleString('en-US');

    const commission = Number(lineItem.commission);
    const bonus = Number(lineItem.bonus);
    const otherDeductions = Number(lineItem.otherDeductions);

    const earningsRows = [
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">Base Salary</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(Number(lineItem.baseSalary))}</td></tr>`,
      ...(commission > 0
        ? [
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">Commission</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(commission)}</td></tr>`,
          ]
        : []),
      ...(bonus > 0
        ? [
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">Bonus</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(bonus)}</td></tr>`,
          ]
        : []),
    ].join('');

    const deductionRows = [
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">Income Tax (20%)</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#C41E3A;">−${fmt(Number(lineItem.taxDeduction))}</td></tr>`,
      ...(otherDeductions > 0
        ? [
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">Other Deductions</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#C41E3A;">−${fmt(otherDeductions)}</td></tr>`,
          ]
        : []),
    ].join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#0A1628;margin:0;background:#fff;}</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
    <h1 style="font-size:28px;margin:0;color:#0A1628;">PAYSLIP</h1>
    <div style="text-align:right;">
      <span style="font-size:24px;font-weight:bold;color:#C41E3A;">CDY</span>
      <span style="font-size:24px;font-weight:bold;color:#0A1628;"> In-House System</span>
    </div>
  </div>

  <div style="margin-bottom:24px;font-size:14px;line-height:1.8;">
    <p style="margin:4px 0;"><strong>Employee:</strong> ${this.escapeHtml(lineItem.employeeName)}</p>
    <p style="margin:4px 0;"><strong>Employee ID:</strong> ${lineItem.employeeId}</p>
    <p style="margin:4px 0;"><strong>Period:</strong> ${periodLabel}</p>
    <p style="margin:4px 0;"><strong>Pay reference:</strong> ${payRef}</p>
  </div>

  <h2 style="font-size:12px;color:#C41E3A;letter-spacing:2px;margin-bottom:8px;">EARNINGS</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px 12px;text-align:left;">Description</th>
        <th style="padding:8px 12px;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${earningsRows}</tbody>
    <tfoot>
      <tr style="font-weight:bold;">
        <td style="padding:10px 12px;border-top:2px solid #C41E3A;">GROSS PAY</td>
        <td style="padding:10px 12px;border-top:2px solid #C41E3A;text-align:right;">${fmt(Number(lineItem.grossPay))}</td>
      </tr>
    </tfoot>
  </table>

  <h2 style="font-size:12px;color:#C41E3A;letter-spacing:2px;margin-bottom:8px;">DEDUCTIONS</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:13px;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px 12px;text-align:left;">Description</th>
        <th style="padding:8px 12px;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${deductionRows}</tbody>
    <tfoot>
      <tr style="font-weight:bold;">
        <td style="padding:10px 12px;border-top:2px solid #e2e8f0;">TOTAL DEDUCTIONS</td>
        <td style="padding:10px 12px;border-top:2px solid #e2e8f0;text-align:right;color:#C41E3A;">−${fmt(Number(lineItem.taxDeduction) + otherDeductions)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="border:2px solid #C41E3A;padding:20px;text-align:center;margin-bottom:32px;">
    <p style="margin:0;font-size:12px;color:#64748b;letter-spacing:1px;">NET PAY</p>
    <p style="margin:8px 0 0;font-size:32px;font-weight:bold;color:#C41E3A;">${fmt(Number(lineItem.netPay))}</p>
  </div>

  <div style="text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #e2e8f0;padding-top:16px;">
    CDY In-House System — Confidential · Generated ${generatedAt}
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
