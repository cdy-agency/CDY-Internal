import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayrollLineItem } from '@prisma/client';
import { format, parse } from 'date-fns';
import { Resend } from 'resend';

@Injectable()
export class PayslipEmailService {
  private readonly logger = new Logger(PayslipEmailService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set — payslip emails will be skipped in development',
      );
    }
  }

  async send(
    lineItem: PayrollLineItem,
    month: string,
    pdfBuffer: Buffer,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Skipping payslip email for ${lineItem.employeeEmail} — RESEND not configured`,
      );
      return;
    }

    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ?? 'finance@cdy.com';
    const periodDate = parse(month, 'yyyy-MM', new Date());
    const monthLabel = format(periodDate, 'MMMM yyyy');
    const currency = 'RWF';
    const fmt = (n: number): string =>
      new Intl.NumberFormat('fr-RW', { style: 'currency', currency }).format(n);

    const gross = Number(lineItem.grossPay);
    const deductions =
      Number(lineItem.taxDeduction) + Number(lineItem.otherDeductions);
    const net = Number(lineItem.netPay);

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0A1628;padding:24px;border-radius:8px 8px 0 0;">
          <span style="font-size:24px;font-weight:bold;color:#C41E3A;">CDY</span>
          <span style="font-size:24px;font-weight:bold;color:#F8FAFC;"> In-House System</span>
        </div>
        <div style="background:#112240;padding:32px;color:#F8FAFC;">
          <p>Dear ${lineItem.employeeName},</p>
          <p>Please find attached your payslip for <strong>${monthLabel}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
            <tr><td style="padding:8px 0;color:#94A3B8;">Gross Pay</td><td style="padding:8px 0;text-align:right;">${fmt(gross)}</td></tr>
            <tr><td style="padding:8px 0;color:#94A3B8;">Total Deductions</td><td style="padding:8px 0;text-align:right;">−${fmt(deductions)}</td></tr>
            <tr style="font-weight:bold;"><td style="padding:12px 0;border-top:1px solid #1E3A5F;">Net Pay</td><td style="padding:12px 0;border-top:1px solid #1E3A5F;text-align:right;color:#C41E3A;">${fmt(net)}</td></tr>
          </table>
          <p style="color:#94A3B8;font-size:14px;">Your payment will be processed via the usual payment method.</p>
        </div>
        <div style="background:#0A1628;padding:16px;text-align:center;color:#94A3B8;font-size:12px;border-radius:0 0 8px 8px;">
          CDY HR · finance@cdy.com · +250 788 000 000
        </div>
      </div>`;

    const safeName = lineItem.employeeName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `Payslip-${month}-${safeName}.pdf`;

    const result = await this.resend.emails.send({
      from: fromEmail,
      to: lineItem.employeeEmail,
      subject: `Your payslip for ${monthLabel} — CDY`,
      html,
      attachments: [{ filename, content: pdfBuffer }],
    });

    if (result.error) {
      this.logger.error(
        `Payslip email failed for ${lineItem.employeeEmail}: ${JSON.stringify(result.error)}`,
      );
      throw new Error('Failed to send payslip email');
    }
  }
}
