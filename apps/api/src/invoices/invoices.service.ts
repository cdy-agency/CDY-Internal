import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Invoice, InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceEmailService } from './invoice-email.service';
import { CreateInvoiceDto, LineItemDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFiltersDto } from './dto/invoice-filters.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';

interface LineItemWithAmount extends LineItemDto {
  amount: number;
}

export interface SerializedInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
  status: Invoice['status'];
  lineItems: LineItemWithAmount[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  dueDate: Date;
  sentAt: Date | null;
  paidAt: Date | null;
  writtenOffAt: Date | null;
  writtenOffBy: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PaginatedInvoices {
  data: SerializedInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly invoiceEmailService: InvoiceEmailService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateInvoiceDto,
    userId: string,
    auditCtx: AuditContext,
  ): Promise<SerializedInvoice> {
    const invoiceNumber = await this.invoiceNumberService.generate();
    const taxRate = dto.taxRate ?? 0;
    const { subtotal, taxAmount, total, lineItemsWithAmounts } =
      this.calculateTotals(dto.lineItems, taxRate);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: dto.clientId,
        projectId: dto.projectId,
        status: InvoiceStatus.DRAFT,
        lineItems: lineItemsWithAmounts as unknown as Prisma.InputJsonValue,
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: dto.currency ?? 'USD',
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        serviceType: dto.serviceType ?? 'general',
        createdBy: userId,
      },
    });

    const serialized = this.serializeInvoice(invoice);
    this.auditService.log({
      ...auditCtx,
      action: 'invoice.created',
      entityType: 'Invoice',
      entityId: invoice.id,
      newValue: serialized,
    });

    return serialized;
  }

  async findAll(filters: InvoiceFiltersDto): Promise<PaginatedInvoices> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
    };

    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }

    if (filters.clientId) {
      where.clientId = { contains: filters.clientId, mode: 'insensitive' };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map((inv) => this.serializeInvoice(inv)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<SerializedInvoice & { payments: ReturnType<InvoicesService['serializePayment']>[] }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        payments: {
          where: { deletedAt: null },
          orderBy: { paidAt: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      ...this.serializeInvoice(invoice),
      payments: invoice.payments.map((p) => this.serializePayment(p)),
    };
  }

  async update(
    id: string,
    dto: UpdateInvoiceDto,
    auditCtx: AuditContext,
  ): Promise<SerializedInvoice> {
    const existing = await this.getInvoiceOrThrow(id);
    const before = this.serializeInvoice(existing);

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Invoice cannot be edited after it has been sent',
      );
    }

    const taxRate = dto.taxRate ?? Number(existing.taxRate);
    const lineItems =
      dto.lineItems ??
      (existing.lineItems as unknown as LineItemDto[]);
    const { subtotal, taxAmount, total, lineItemsWithAmounts } =
      this.calculateTotals(lineItems, taxRate);

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(dto.lineItems !== undefined && {
          lineItems: lineItemsWithAmounts as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.taxRate !== undefined && { taxRate }),
        ...(dto.lineItems !== undefined || dto.taxRate !== undefined
          ? { subtotal, taxAmount, total }
          : {}),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    const serialized = this.serializeInvoice(invoice);
    this.auditService.log({
      ...auditCtx,
      action: 'invoice.updated',
      entityType: 'Invoice',
      entityId: id,
      previousValue: before,
      newValue: serialized,
    });

    return serialized;
  }

  async send(
    id: string,
    userId: string,
    dto: SendInvoiceDto,
    auditCtx: AuditContext,
  ): Promise<SerializedInvoice> {
    void userId;
    const existing = await this.getInvoiceOrThrow(id);

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be sent');
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.invoicePdfService.generate(existing);
    } catch (error) {
      this.logger.error(`PDF generation failed: ${String(error)}`);
      throw new InternalServerErrorException('Failed to generate invoice PDF');
    }

    const clientEmail =
      dto.clientEmail ?? `${existing.clientId.replace(/[^a-zA-Z0-9]/g, '')}@client.cdy.com`;

    try {
      await this.invoiceEmailService.sendInvoice(existing, pdfBuffer, clientEmail);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Email send failed: ${String(error)}`);
      throw new InternalServerErrorException('Failed to send invoice email');
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.SENT,
        sentAt: new Date(),
      },
    });

    const serialized = this.serializeInvoice(invoice);
    this.auditService.log({
      ...auditCtx,
      action: 'invoice.sent',
      entityType: 'Invoice',
      entityId: id,
      newValue: serialized,
    });

    return serialized;
  }

  async generatePdf(id: string): Promise<{ buffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.getInvoiceOrThrow(id);
    const buffer = await this.invoicePdfService.generate(invoice);
    return { buffer, invoiceNumber: invoice.invoiceNumber };
  }

  async softDelete(
    id: string,
    auditCtx: AuditContext,
  ): Promise<{ message: string }> {
    const existing = await this.getInvoiceOrThrow(id);
    const before = this.serializeInvoice(existing);

    if (existing.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Paid invoices cannot be deleted');
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.auditService.log({
      ...auditCtx,
      action: 'invoice.deleted',
      entityType: 'Invoice',
      entityId: id,
      previousValue: before,
    });

    return { message: 'Invoice deleted' };
  }

  private calculateTotals(
    lineItems: LineItemDto[],
    taxRate: number,
  ): {
    subtotal: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    total: Prisma.Decimal;
    lineItemsWithAmounts: LineItemWithAmount[];
  } {
    const lineItemsWithAmounts: LineItemWithAmount[] = lineItems.map((item) => ({
      ...item,
      amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const subtotalNum = lineItemsWithAmounts.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const subtotal = new Prisma.Decimal(subtotalNum.toFixed(2));
    const taxAmount = new Prisma.Decimal(
      (subtotalNum * (taxRate / 100)).toFixed(2),
    );
    const total = new Prisma.Decimal(
      (subtotalNum + subtotalNum * (taxRate / 100)).toFixed(2),
    );

    return { subtotal, taxAmount, total, lineItemsWithAmounts };
  }

  async sendManualReminder(id: string): Promise<{ sent: boolean; reminderNumber: number }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { reminders: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.DRAFT ||
      invoice.status === InvoiceStatus.WRITTEN_OFF
    ) {
      throw new BadRequestException(
        'Reminders can only be sent for unpaid sent invoices',
      );
    }

    const nextReminderNumber = invoice.reminders.length + 1;
    if (nextReminderNumber > 3) {
      throw new BadRequestException('Maximum of 3 reminders already sent');
    }

    await this.invoiceEmailService.sendReminder(invoice, nextReminderNumber);

    await this.prisma.invoiceReminder.create({
      data: {
        invoiceId: invoice.id,
        reminderNumber: nextReminderNumber,
        emailAddress: invoice.clientId,
      },
    });

    this.logger.log(
      `Manual reminder ${nextReminderNumber} sent for ${invoice.invoiceNumber}`,
    );

    return { sent: true, reminderNumber: nextReminderNumber };
  }

  private async getInvoiceOrThrow(id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private serializeInvoice(invoice: Invoice): SerializedInvoice {
    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      lineItems: invoice.lineItems as unknown as LineItemWithAmount[],
    };
  }

  private serializePayment(payment: {
    id: string;
    invoiceId: string;
    amount: Prisma.Decimal;
    method: string;
    reference: string | null;
    paidAt: Date;
    receiptSent: boolean;
    notes: string | null;
    recordedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...payment,
      amount: Number(payment.amount),
    };
  }
}
