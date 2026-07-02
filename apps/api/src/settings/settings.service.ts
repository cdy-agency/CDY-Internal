import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SETTINGS: Record<string, string> = {
  default_currency: 'RWF',
  default_payment_terms: '30',
  invoice_prefix: 'CDY',
  fiscal_year_start: '01',
  company_name: 'CDY Agency Ltd',
  company_address: 'Kigali, Rwanda',
  company_email: 'finance@cdy.com',
  company_phone: '+250 788 000 000',
  invoice_footer_note: 'Thank you for your business.',
  payroll_approver_id: '',
  payroll_tax_rate: '20',
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string | null> {
    const setting = await this.prisma.financeSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  async set(key: string, value: string | undefined, userId: string): Promise<void> {
    const v = value ?? '';
    await this.prisma.financeSetting.upsert({
      where: { key },
      create: { key, value: v, updatedBy: userId },
      update: { value: v, updatedBy: userId },
    });
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.financeSetting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async getCompanyDetails(): Promise<{
    companyName: string;
    companyAddress: string;
    companyEmail: string;
    invoiceFooterNote: string;
  }> {
    const all = await this.getAll();
    return {
      companyName: all.company_name ?? DEFAULT_SETTINGS.company_name,
      companyAddress: all.company_address ?? DEFAULT_SETTINGS.company_address,
      companyEmail: all.company_email ?? DEFAULT_SETTINGS.company_email,
      invoiceFooterNote:
        all.invoice_footer_note ?? DEFAULT_SETTINGS.invoice_footer_note,
    };
  }

  async seed(): Promise<void> {
    const count = await this.prisma.financeSetting.count();
    if (count > 0) {
      return;
    }

    this.logger.log('Seeding default finance settings');

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await this.prisma.financeSetting.upsert({
        where: { key },
        create: { key, value, updatedBy: 'system' },
        update: {},
      });
    }
  }
}
