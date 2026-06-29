import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus, Payment, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { ReceiptPdfService } from './receipt-pdf.service';
import { ReceiptEmailService } from './receipt-email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';
import { NotificationType, Role } from '@prisma/client';

export interface SerializedPayment {
  id: string;
  type: 'INVOICE_PAYMENT' | 'DIRECT_INCOME';
  invoiceId: string | null;
  invoiceNumber: string | null;
  clientId: string | null;
  clientName: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  reference: string | null;
  date: Date;
  description: string;
  receiptSent?: boolean;
  notes: string | null;
  recordedBy: string | null;
  category?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptPdfService: ReceiptPdfService,
    private readonly receiptEmailService: ReceiptEmailService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async recordPayment(
    invoiceId: string,
    dto: CreatePaymentDto,
    userId: string,
    auditCtx: AuditContext,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        include: {
          payments: { where: { deletedAt: null } },
        },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('This invoice is already fully paid');
      }

      if (invoice.status === InvoiceStatus.WRITTEN_OFF) {
        throw new BadRequestException(
          'Cannot record payment on a written-off invoice',
        );
      }

      if (invoice.status === InvoiceStatus.DRAFT) {
        throw new BadRequestException(
          'Cannot record payment on a draft invoice — send it first',
        );
      }

      const alreadyPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const remaining = Number(invoice.total) - alreadyPaid;

      if (dto.amount > remaining + 0.001) {
        throw new BadRequestException(
          `Payment amount ($${dto.amount}) exceeds remaining balance ($${remaining.toFixed(2)})`,
        );
      }

      const paidAt = new Date(dto.paidAt);
      if (paidAt > new Date()) {
        throw new BadRequestException('Payment date cannot be in the future');
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          paidAt,
          notes: dto.notes,
          recordedBy: userId,
        },
      });

      const newTotalPaid = alreadyPaid + dto.amount;
      const isFullyPaid = newTotalPaid >= Number(invoice.total) - 0.001;
      const newStatus = isFullyPaid
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          paidAt: isFullyPaid ? new Date() : null,
        },
        include: {
          payments: { where: { deletedAt: null } },
        },
      });

      return { payment, invoice: updatedInvoice, isFullyPaid };
    });

    if (result.isFullyPaid) {
      setImmediate(() => {
        void this.sendReceiptAsync(
          result.invoice,
          result.payment,
          invoiceId,
        );
      });
    }

    const alreadyPaid = result.invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remaining = Number(result.invoice.total) - alreadyPaid;

    this.notificationsService.createForRoleAsync('FINANCE_MANAGER', {
      type: NotificationType.PAYMENT_RECEIVED,
      title: `Payment received — ${result.invoice.invoiceNumber}`,
      body: `$${dto.amount.toFixed(2)} recorded against invoice ${result.invoice.invoiceNumber}. ${result.isFullyPaid ? 'Invoice fully paid.' : `Remaining: $${remaining.toFixed(2)}.`}`,
      link: `/finance/invoices/${result.invoice.id}`,
    });

    const serializedPayment = this.serializePayment(
      result.payment,
      result.invoice,
    );
    this.auditService.log({
      ...auditCtx,
      action: 'payment.recorded',
      entityType: 'Payment',
      entityId: result.payment.id,
      newValue: serializedPayment,
    });

    return {
      payment: serializedPayment,
      invoice: result.invoice,
    };
  }

  private async sendReceiptAsync(
    invoice: Prisma.InvoiceGetPayload<{
      include: { payments: true };
    }>,
    payment: Payment,
    invoiceId: string,
  ): Promise<void> {
    try {
      const pdfBuffer = await this.receiptPdfService.generate(invoice, payment);
      const clientEmail = `${invoice.clientId.replace(/[^a-zA-Z0-9]/g, '')}@client.cdy.com`;
      await this.receiptEmailService.sendReceipt(
        invoice,
        payment,
        pdfBuffer,
        clientEmail,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { receiptSent: true },
      });
    } catch (err) {
      this.logger.error(`Receipt send failed for invoice ${invoiceId}`, String(err));
    }
  }

  async findAll(filters: PaymentFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;

    const dateFilter = filters.dateFrom || filters.dateTo
      ? {
          gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          lte: filters.dateTo ? (() => { const d = new Date(filters.dateTo!); d.setHours(23, 59, 59, 999); return d; })() : undefined,
        }
      : undefined;

    const [payments, directIncomes] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          deletedAt: null,
          ...(filters.method && { method: filters.method }),
          ...(dateFilter && { paidAt: dateFilter }),
          ...(filters.clientId && {
            invoice: { clientId: { contains: filters.clientId, mode: 'insensitive' } },
          }),
        },
        include: {
          invoice: {
            include: { client: { select: { companyName: true, contactName: true } } },
          },
        },
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.directIncome.findMany({
        where: {
          deletedAt: null,
          ...(filters.method && { paymentMethod: filters.method }),
          ...(dateFilter && { date: dateFilter }),
          ...(filters.clientId && { clientId: { contains: filters.clientId, mode: 'insensitive' } }),
        },
        include: {
          client: { select: { companyName: true, contactName: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const normalizedPayments: SerializedPayment[] = payments.map((p) =>
      this.serializePayment(p, p.invoice),
    );

    const normalizedDirectIncomes: SerializedPayment[] = directIncomes.map((d) => ({
      id: d.id,
      type: 'DIRECT_INCOME' as const,
      invoiceId: null,
      invoiceNumber: null,
      clientId: d.clientId,
      clientName: d.client?.companyName ?? d.client?.contactName ?? null,
      amount: Number(d.amount),
      paymentMethod: d.paymentMethod,
      reference: d.reference,
      date: d.date,
      description: d.description,
      receiptSent: false,
      notes: d.notes,
      recordedBy: d.createdBy,
      category: d.category,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    const all = [...normalizedPayments, ...normalizedDirectIncomes].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const total = all.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;
    const paginated = all.slice(skip, skip + limit);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [invoiceMonthAgg, directMonthAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { deletedAt: null, paidAt: { gte: monthStart } },
      }),
      this.prisma.directIncome.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { deletedAt: null, date: { gte: monthStart } },
      }),
    ]);

    const invoiceMonthTotal = Number(invoiceMonthAgg._sum.amount ?? 0);
    const directMonthTotal = Number(directMonthAgg._sum.amount ?? 0);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages,
      summary: {
        totalCollectedThisMonth: invoiceMonthTotal + directMonthTotal,
        invoicePaymentsThisMonth: invoiceMonthTotal,
        directIncomeThisMonth: directMonthTotal,
        paymentsThisMonth: invoiceMonthAgg._count + directMonthAgg._count,
      },
    };
  }

  async findOne(id: string): Promise<SerializedPayment> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.serializePayment(payment, payment.invoice);
  }

  private serializePayment(
    payment: {
      id: string;
      invoiceId: string;
      amount: Prisma.Decimal;
      method: PaymentMethod;
      reference: string | null;
      paidAt: Date;
      receiptSent: boolean;
      notes: string | null;
      recordedBy: string;
      createdAt: Date;
      updatedAt: Date;
    },
    invoice: {
      invoiceNumber: string;
      clientId: string;
      client?: { companyName: string | null; contactName: string } | null;
    },
  ): SerializedPayment {
    return {
      id: payment.id,
      type: 'INVOICE_PAYMENT',
      invoiceId: payment.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.client?.companyName ?? invoice.client?.contactName ?? null,
      amount: Number(payment.amount),
      paymentMethod: payment.method,
      reference: payment.reference,
      date: payment.paidAt,
      description: `Invoice ${invoice.invoiceNumber}`,
      receiptSent: payment.receiptSent,
      notes: payment.notes,
      recordedBy: payment.recordedBy,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
