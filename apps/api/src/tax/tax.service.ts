import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  BillStatus,
  InvoiceStatus,
  Prisma,
  TaxRate,
} from '@prisma/client';
import {
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { TaxPaymentDto } from './dto/tax-payment.dto';
import { TaxReportFiltersDto } from './dto/tax-report-filters.dto';

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TaxRate> {
    const rate = await this.prisma.taxRate.findUnique({ where: { id } });
    if (!rate) {
      throw new NotFoundException('Tax rate not found');
    }
    return rate;
  }

  async findApplicableRate(
    country: string,
    serviceType: string,
    date: Date = new Date(),
  ): Promise<TaxRate | null> {
    const candidates = await this.prisma.taxRate.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [
          { country, serviceType },
          { country, serviceType: null },
          { country: 'ALL', serviceType },
          { country: 'ALL', serviceType: null },
        ],
      },
    });

    if (candidates.length === 0) {
      return null;
    }

    const scored = candidates.map((rate) => {
      let score = 0;
      if (rate.country === country) score += 100;
      else if (rate.country === 'ALL') score += 50;
      if (rate.serviceType === serviceType) score += 10;
      else if (rate.serviceType === null) score += 5;
      score += rate.effectiveFrom.getTime() / 1e15;
      return { rate, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].rate;
  }

  async findAllRates() {
    const rates = await this.prisma.taxRate.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return rates.map((r) => this.serializeRate(r));
  }

  async createTaxRate(dto: CreateTaxRateDto, userId: string) {
    if (dto.ratePercent < 0 || dto.ratePercent > 100) {
      throw new BadRequestException('Rate must be between 0 and 100');
    }

    const rate = await this.prisma.taxRate.create({
      data: {
        name: dto.name,
        ratePercent: dto.ratePercent,
        country: dto.country,
        serviceType: dto.serviceType ?? null,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
        createdBy: userId,
      },
    });

    this.logger.log(`Tax rate created: ${rate.name}`);
    return this.serializeRate(rate);
  }

  async deactivateTaxRate(id: string) {
    const rate = await this.prisma.taxRate.findUnique({ where: { id } });
    if (!rate) {
      throw new NotFoundException('Tax rate not found');
    }

    const updated = await this.prisma.taxRate.update({
      where: { id },
      data: { isActive: false },
    });

    return this.serializeRate(updated);
  }

  async getTaxLiabilityReport(filters: TaxReportFiltersDto) {
    const from = filters.from
      ? new Date(filters.from)
      : startOfMonth(new Date());
    const to = filters.to ? new Date(filters.to) : endOfMonth(new Date());
    to.setHours(23, 59, 59, 999);

    const taxCollected = await this.prisma.invoice.groupBy({
      by: ['taxRateId'],
      where: {
        status: InvoiceStatus.PAID,
        paidAt: { gte: from, lte: to },
        taxAmount: { gt: 0 },
        deletedAt: null,
      },
      _sum: {
        taxAmount: true,
        subtotal: true,
        total: true,
      },
      _count: { id: true },
    });

    const rateIds = taxCollected
      .map((r) => r.taxRateId)
      .filter((id): id is string => id !== null);

    const rates = await this.prisma.taxRate.findMany({
      where: { id: { in: rateIds } },
    });
    const rateMap = Object.fromEntries(rates.map((r) => [r.id, r]));

    const inputTax = 0;

    const totalTaxCollected = taxCollected.reduce(
      (s, r) => s + Number(r._sum.taxAmount ?? 0),
      0,
    );

    const remittances = await this.prisma.taxPayment.findMany({
      where: {
        periodFrom: { lte: to },
        periodTo: { gte: from },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalRemitted = remittances.reduce(
      (s, r) => s + Number(r.amount),
      0,
    );
    const netOwed = totalTaxCollected - inputTax - totalRemitted;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      taxCollected: {
        total: Number(totalTaxCollected.toFixed(2)),
        byRate: taxCollected.map((r) => ({
          taxRateId: r.taxRateId,
          rateName: r.taxRateId
            ? (rateMap[r.taxRateId]?.name ?? 'Unknown')
            : 'No tax',
          ratePercent: r.taxRateId
            ? Number(rateMap[r.taxRateId]?.ratePercent ?? 0)
            : 0,
          invoiceCount: r._count.id,
          grossRevenue: Number(r._sum.subtotal ?? 0),
          taxAmount: Number(r._sum.taxAmount ?? 0),
        })),
      },
      inputTax: Number(inputTax.toFixed(2)),
      totalRemitted: Number(totalRemitted.toFixed(2)),
      netOwed: Number(netOwed.toFixed(2)),
      remittances: remittances.map((r) => this.serializeTaxPayment(r)),
      warning:
        netOwed > 0
          ? `$${netOwed.toFixed(2)} in tax is outstanding for this period`
          : null,
    };
  }

  async recordRemittance(dto: TaxPaymentDto, userId: string) {
    const taxPayment = await this.prisma.taxPayment.create({
      data: {
        authorityName: dto.authorityName,
        amount: dto.amount,
        currency: dto.currency,
        paidAt: new Date(dto.paidAt),
        reference: dto.reference,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        notes: dto.notes,
        createdBy: userId,
      },
    });

    await this.prisma.bill.create({
      data: {
        vendorName: dto.authorityName,
        category: 'TAX_REMITTANCE',
        amount: dto.amount,
        currency: dto.currency,
        dueDate: new Date(dto.paidAt),
        status: BillStatus.PAID,
        paidAt: new Date(dto.paidAt),
        notes: `Tax remittance for period ${format(new Date(dto.periodFrom), 'MMM yyyy')} – ${format(new Date(dto.periodTo), 'MMM yyyy')}`,
        createdBy: userId,
      },
    });

    this.logger.log(`Tax remittance recorded: ${dto.authorityName}`);
    return this.serializeTaxPayment(taxPayment);
  }

  async findAllRemittances() {
    const payments = await this.prisma.taxPayment.findMany({
      orderBy: { paidAt: 'desc' },
    });
    return payments.map((p) => this.serializeTaxPayment(p));
  }

  private serializeRate(rate: TaxRate) {
    return {
      id: rate.id,
      name: rate.name,
      ratePercent: Number(rate.ratePercent),
      country: rate.country,
      serviceType: rate.serviceType,
      effectiveFrom: rate.effectiveFrom.toISOString(),
      isActive: rate.isActive,
      createdBy: rate.createdBy,
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    };
  }

  private serializeTaxPayment(payment: {
    id: string;
    authorityName: string;
    amount: Prisma.Decimal;
    currency: string;
    paidAt: Date;
    reference: string | null;
    periodFrom: Date;
    periodTo: Date;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
  }) {
    return {
      id: payment.id,
      authorityName: payment.authorityName,
      amount: Number(payment.amount),
      currency: payment.currency,
      paidAt: payment.paidAt.toISOString(),
      reference: payment.reference,
      periodFrom: payment.periodFrom.toISOString(),
      periodTo: payment.periodTo.toISOString(),
      notes: payment.notes,
      createdBy: payment.createdBy,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
