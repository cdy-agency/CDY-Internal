import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  CreditNote,
  CreditNoteStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceNumberService } from '../invoices/invoice-number.service';
import { CreditNotePdfService } from './credit-note-pdf.service';
import { CreditNoteEmailService } from './credit-note-email.service';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';
import {
  CreateCreditNoteDto,
  CreditNoteFiltersDto,
} from './dto/create-credit-note.dto';
import {
  invoiceRemainingBalance,
  isInvoiceFullySettled,
  sumNonVoidCreditNotes,
  sumPaymentAmounts,
} from '../common/invoice-balance.util';

@Injectable()
export class CreditNotesService {
  private readonly logger = new Logger(CreditNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly creditNotePdfService: CreditNotePdfService,
    private readonly creditNoteEmailService: CreditNoteEmailService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    invoiceId: string,
    dto: CreateCreditNoteDto,
    userId: string,
    auditCtx: AuditContext,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      include: {
        creditNotes: { where: { deletedAt: null } },
        payments: { where: { deletedAt: null } },
        client: { select: { companyName: true, contactName: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (
      invoice.status === InvoiceStatus.DRAFT ||
      invoice.status === InvoiceStatus.WRITTEN_OFF
    ) {
      throw new BadRequestException(
        `Cannot raise a credit note on a ${invoice.status} invoice`,
      );
    }

    const existingCreditTotal = sumNonVoidCreditNotes(invoice.creditNotes);
    const refundDue = invoice.status === InvoiceStatus.PAID;
    const absoluteMax = Number(
      (Number(invoice.total) - existingCreditTotal).toFixed(2),
    );
    // Unpaid invoices can only credit the outstanding balance (after payments).
    // Paid invoices can credit up to the full invoice total for refunds.
    const maxCredit = refundDue
      ? absoluteMax
      : invoiceRemainingBalance({
          total: invoice.total,
          payments: invoice.payments,
          creditNotes: invoice.creditNotes,
        });

    if (dto.amount > maxCredit + 0.001) {
      throw new BadRequestException(
        `Credit note amount ($${dto.amount}) would exceed the maximum creditable ($${maxCredit.toFixed(2)})`,
      );
    }

    const creditNoteNumber =
      await this.invoiceNumberService.generateCreditNoteNumber();
    const clientDisplayName =
      invoice.client?.companyName?.trim() ||
      invoice.client?.contactName?.trim() ||
      invoice.clientId;

    const creditNote = await this.prisma.creditNote.create({
      data: {
        creditNoteNumber,
        invoiceId,
        amount: dto.amount,
        reason: dto.reason,
        description: dto.description,
        refundDue,
        status: refundDue
          ? CreditNoteStatus.REFUND_PENDING
          : CreditNoteStatus.ISSUED,
        createdBy: userId,
      },
    });

    // Adjustment path: when credits settle the unpaid balance, mark invoice paid.
    if (!refundDue) {
      const settled = isInvoiceFullySettled({
        total: invoice.total,
        payments: invoice.payments,
        creditNotes: [...invoice.creditNotes, creditNote],
      });
      if (settled) {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.PAID,
            paidAt: new Date(),
          },
        });
      } else if (sumPaymentAmounts(invoice.payments) > 0) {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: InvoiceStatus.PARTIALLY_PAID },
        });
      }
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.creditNotePdfService.generate(
        creditNote,
        invoice,
        invoice.client,
      );
    } catch (err) {
      this.logger.error(`Credit note PDF failed: ${String(err)}`);
      throw new InternalServerErrorException('Failed to generate credit note PDF');
    }

    try {
      await this.creditNoteEmailService.send(creditNote, invoice, pdfBuffer);
    } catch (err) {
      this.logger.error(`Credit note email failed: ${String(err)}`);
    }

    if (refundDue) {
      await this.prisma.bill.create({
        data: {
          vendorName: `Refund — ${clientDisplayName}`,
          category: 'REFUND',
          amount: dto.amount,
          currency: invoice.currency,
          dueDate: addDays(new Date(), 14),
          notes: `Refund for credit note ${creditNoteNumber} against invoice ${invoice.invoiceNumber}`,
          createdBy: userId,
        },
      });
    }

    const serialized = this.serialize(creditNote);
    this.auditService.log({
      ...auditCtx,
      action: 'credit_note.created',
      entityType: 'CreditNote',
      entityId: creditNote.id,
      newValue: serialized,
    });

    return serialized;
  }

  async findAll(filters: CreditNoteFiltersDto) {
    const page = filters.page ?? 1;
    const limit = 25;
    const skip = (page - 1) * limit;

    const where: Prisma.CreditNoteWhereInput = { deletedAt: null };
    if (filters.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters.status) where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { invoice: { select: { invoiceNumber: true, clientId: true } } },
      }),
      this.prisma.creditNote.count({ where }),
    ]);

    return {
      data: items.map((cn) => ({
        ...this.serialize(cn),
        invoiceNumber: cn.invoice.invoiceNumber,
        clientId: cn.invoice.clientId,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findByInvoice(invoiceId: string) {
    const items = await this.prisma.creditNote.findMany({
      where: { invoiceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((cn) => this.serialize(cn));
  }

  async findOne(id: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, deletedAt: null },
      include: { invoice: true },
    });
    if (!creditNote) throw new NotFoundException('Credit note not found');
    return {
      ...this.serialize(creditNote),
      invoice: {
        id: creditNote.invoice.id,
        invoiceNumber: creditNote.invoice.invoiceNumber,
        clientId: creditNote.invoice.clientId,
        total: Number(creditNote.invoice.total),
      },
    };
  }

  async remove(
    id: string,
    auditCtx: AuditContext,
  ): Promise<{ message: string }> {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, deletedAt: null },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status === CreditNoteStatus.REFUND_PAID) {
      throw new BadRequestException(
        'Credit notes with a paid refund cannot be deleted',
      );
    }

    await this.prisma.creditNote.delete({ where: { id } });

    this.auditService.log({
      ...auditCtx,
      action: 'credit_note.deleted',
      entityType: 'CreditNote',
      entityId: id,
      previousValue: this.serialize(creditNote),
    });

    return { message: 'Credit note deleted' };
  }

  async generatePdf(id: string): Promise<{ buffer: Buffer; number: string }> {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, deletedAt: null },
      include: {
        invoice: {
          include: {
            client: { select: { companyName: true, contactName: true } },
          },
        },
      },
    });
    if (!creditNote) throw new NotFoundException('Credit note not found');
    const buffer = await this.creditNotePdfService.generate(
      creditNote,
      creditNote.invoice,
      creditNote.invoice.client,
    );
    return { buffer, number: creditNote.creditNoteNumber };
  }

  private serialize(creditNote: CreditNote) {
    return {
      id: creditNote.id,
      creditNoteNumber: creditNote.creditNoteNumber,
      invoiceId: creditNote.invoiceId,
      amount: Number(creditNote.amount),
      reason: creditNote.reason,
      description: creditNote.description,
      status: creditNote.status,
      issuedAt: creditNote.issuedAt.toISOString(),
      refundDue: creditNote.refundDue,
      refundPaidAt: creditNote.refundPaidAt?.toISOString() ?? null,
      createdAt: creditNote.createdAt.toISOString(),
    };
  }
}
