import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  InstalmentStatus,
  InvoiceStatus,
  PaymentPlanStatus,
  Prisma,
} from '@prisma/client';
import { startOfDay } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditContext } from '../common/audit/audit.context';
import {
  CreatePaymentPlanDto,
  PayInstalmentDto,
} from './dto/create-payment-plan.dto';

@Injectable()
export class PaymentPlansService {
  private readonly logger = new Logger(PaymentPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async create(invoiceId: string, dto: CreatePaymentPlanDto, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      include: {
        payments: { where: { deletedAt: null } },
        paymentPlan: true,
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.paymentPlan) {
      throw new BadRequestException(
        'This invoice already has an active payment plan',
      );
    }

    const allowedStatuses: InvoiceStatus[] = [
      InvoiceStatus.SENT,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
    ];
    if (!allowedStatuses.includes(invoice.status)) {
      throw new BadRequestException(
        'Payment plans can only be created for unpaid invoices',
      );
    }

    const alreadyPaid = invoice.payments.reduce(
      (s, p) => s + Number(p.amount),
      0,
    );
    const remaining = Number(invoice.total) - alreadyPaid;
    const instalmentTotal = dto.instalments.reduce((s, i) => s + i.amount, 0);

    if (Math.abs(instalmentTotal - remaining) > 0.01) {
      throw new BadRequestException(
        `Instalment total ($${instalmentTotal.toFixed(2)}) must equal the remaining invoice balance ($${remaining.toFixed(2)})`,
      );
    }

    const today = startOfDay(new Date());
    for (const inst of dto.instalments) {
      if (new Date(inst.dueDate) <= today) {
        throw new BadRequestException(
          'All instalment due dates must be in the future',
        );
      }
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentPlan.create({
        data: {
          invoiceId,
          totalAmount: remaining,
          createdBy: userId,
          instalments: {
            create: dto.instalments.map((inst, idx) => ({
              instalmentNumber: idx + 1,
              amount: inst.amount,
              dueDate: new Date(inst.dueDate),
            })),
          },
        },
        include: {
          instalments: { orderBy: { instalmentNumber: 'asc' } },
          invoice: { include: { client: { select: { id: true, companyName: true } } } },
        },
      });

      return created;
    });

    this.logger.log(`Payment plan created for invoice ${invoiceId}`);
    return this.serialize(plan);
  }

  async findByInvoice(invoiceId: string) {
    const plan = await this.prisma.paymentPlan.findUnique({
      where: { invoiceId },
      include: {
        instalments: { orderBy: { instalmentNumber: 'asc' } },
        invoice: { include: { client: { select: { id: true, companyName: true } } } },
      },
    });
    if (!plan) return null;
    return this.serialize(plan);
  }

  async payInstalment(
    planId: string,
    instalmentId: string,
    dto: PayInstalmentDto,
    userId: string,
    auditCtx: AuditContext,
  ) {
    const instalment = await this.prisma.paymentPlanItem.findFirst({
      where: { id: instalmentId, paymentPlanId: planId },
      include: {
        plan: { include: { invoice: { include: { payments: true } } } },
      },
    });

    if (!instalment) throw new NotFoundException('Instalment not found');

    if (instalment.status === InstalmentStatus.PAID) {
      throw new BadRequestException('This instalment has already been paid');
    }

    const paymentResult = await this.paymentsService.recordPayment(
      instalment.plan.invoiceId,
      {
        amount: Number(instalment.amount),
        method: dto.method,
        paidAt: dto.paidAt,
        reference: dto.reference,
        notes: `Payment plan instalment ${instalment.instalmentNumber}`,
      },
      userId,
      auditCtx,
    );

    await this.prisma.paymentPlanItem.update({
      where: { id: instalmentId },
      data: {
        status: InstalmentStatus.PAID,
        paidAt: new Date(dto.paidAt),
        paymentId: paymentResult.payment.id,
      },
    });

    const allInstalments = await this.prisma.paymentPlanItem.findMany({
      where: { paymentPlanId: planId },
    });

    const allPaid = allInstalments.every(
      (i) => i.id === instalmentId || i.status === InstalmentStatus.PAID,
    );

    if (allPaid) {
      await this.prisma.paymentPlan.update({
        where: { id: planId },
        data: { status: PaymentPlanStatus.COMPLETED },
      });
    }

    return {
      payment: paymentResult.payment,
      instalment: {
        id: instalment.id,
        instalmentNumber: instalment.instalmentNumber,
        status: InstalmentStatus.PAID,
      },
    };
  }

  async cancel(planId: string) {
    const plan = await this.prisma.paymentPlan.findUnique({
      where: { id: planId },
      include: { instalments: true },
    });

    if (!plan) throw new NotFoundException('Payment plan not found');

    const hasPaid = plan.instalments.some(
      (i) => i.status === InstalmentStatus.PAID,
    );
    if (hasPaid) {
      throw new BadRequestException(
        'Cannot cancel a plan with paid instalments',
      );
    }

    await this.prisma.paymentPlan.update({
      where: { id: planId },
      data: { status: PaymentPlanStatus.CANCELLED },
    });

    return { message: 'Payment plan cancelled' };
  }

  private serialize(
    plan: Prisma.PaymentPlanGetPayload<{
      include: {
        instalments: true;
        invoice: { include: { client: { select: { id: true; companyName: true } } } };
      };
    }>,
  ) {
    const paidTotal = plan.instalments
      .filter((i) => i.status === InstalmentStatus.PAID)
      .reduce((s, i) => s + Number(i.amount), 0);

    return {
      id: plan.id,
      invoiceId: plan.invoiceId,
      clientId: plan.invoice.clientId,
      clientName: plan.invoice.client?.companyName ?? null,
      totalAmount: Number(plan.totalAmount),
      remainingAmount: Number(
        (Number(plan.totalAmount) - paidTotal).toFixed(2),
      ),
      status: plan.status,
      createdAt: plan.createdAt.toISOString(),
      instalments: plan.instalments.map((item) => ({
        id: item.id,
        instalmentNumber: item.instalmentNumber,
        amount: Number(item.amount),
        dueDate: item.dueDate.toISOString(),
        status: item.status,
        paidAt: item.paidAt?.toISOString() ?? null,
        paymentId: item.paymentId,
      })),
    };
  }
}
