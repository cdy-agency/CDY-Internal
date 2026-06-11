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
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: Date;
  receiptSent: boolean;
  notes: string | null;
  recordedBy: string;
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

    this.notificationsService.createForRoleAsync(Role.FINANCE_MANAGER, {
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
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = { deletedAt: null };

    if (filters.method) {
      where.method = filters.method;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.paidAt = {};
      if (filters.dateFrom) where.paidAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.paidAt.lte = end;
      }
    }

    if (filters.clientId) {
      where.invoice = {
        clientId: { contains: filters.clientId, mode: 'insensitive' },
      };
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { invoice: true },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthAgg = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: {
        deletedAt: null,
        paidAt: { gte: monthStart },
      },
    });

    return {
      data: payments.map((p) => this.serializePayment(p, p.invoice)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalCollectedThisMonth: Number(monthAgg._sum.amount ?? 0),
        paymentsThisMonth: monthAgg._count,
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
    invoice: { invoiceNumber: string; clientId: string },
  ): SerializedPayment {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt,
      receiptSent: payment.receiptSent,
      notes: payment.notes,
      recordedBy: payment.recordedBy,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
