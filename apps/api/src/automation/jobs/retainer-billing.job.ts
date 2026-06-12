import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  InvoiceStatus,
  NotificationType,
  Prisma,
  RetainerStatus,
} from '@prisma/client';
import { addDays, addMonths, format, startOfDay } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceNumberService } from '../../invoices/invoice-number.service';
import { InvoicePdfService } from '../../invoices/invoice-pdf.service';
import { InvoiceEmailService } from '../../invoices/invoice-email.service';
import { RetainersService } from '../../retainers/retainers.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class RetainerBillingJob {
  private readonly logger = new Logger(RetainerBillingJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly invoiceEmailService: InvoiceEmailService,
    private readonly retainersService: RetainersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 7 * * *', { name: 'retainer-auto-billing' })
  async processRetainerBilling(): Promise<void> {
    this.logger.log('Running retainer auto-billing...');

    const today = startOfDay(new Date());

    const dueRetainers = await this.prisma.retainerContract.findMany({
      where: {
        status: RetainerStatus.ACTIVE,
        nextBillingDate: {
          gte: today,
          lt: addDays(today, 1),
        },
      },
      include: { taxRate: true },
    });

    this.logger.log(`Found ${dueRetainers.length} retainers due for billing today`);

    for (const retainer of dueRetainers) {
      try {
        const lineItems = [
          {
            description: `${retainer.serviceName} — ${format(today, 'MMMM yyyy')}`,
            quantity: 1,
            unitPrice: Number(retainer.amount),
            amount: Number(retainer.amount),
          },
        ];

        const taxRatePercent = retainer.taxRate
          ? Number(retainer.taxRate.ratePercent)
          : 0;

        const subtotal = Number(retainer.amount);
        const taxAmount = Number(
          ((subtotal * taxRatePercent) / 100).toFixed(2),
        );
        const total = subtotal + taxAmount;

        const invoiceNumber = await this.invoiceNumberService.generate();

        const invoice = await this.prisma.invoice.create({
          data: {
            invoiceNumber,
            clientId: retainer.clientId,
            serviceType: 'retainer',
            retainerContractId: retainer.id,
            lineItems: lineItems as unknown as Prisma.InputJsonValue,
            subtotal,
            taxRate: taxRatePercent,
            taxAmount,
            total,
            taxRateId: retainer.taxRateId,
            currency: retainer.currency,
            dueDate: addDays(today, 30),
            status: InvoiceStatus.SENT,
            sentAt: new Date(),
            createdBy: retainer.createdBy,
          },
        });

        const pdfBuffer = await this.invoicePdfService.generate(invoice);
        await this.invoiceEmailService.sendInvoice(
          invoice,
          pdfBuffer,
          retainer.clientId,
        );

        const nextBillingDate = this.retainersService.calculateNextBillingDate(
          retainer.billingDayOfMonth,
          addMonths(today, 1),
        );

        await this.prisma.retainerContract.update({
          where: { id: retainer.id },
          data: {
            lastBilledAt: today,
            nextBillingDate,
          },
        });

        this.notificationsService.createForRoleAsync('FINANCE_MANAGER', {
          type: NotificationType.SYSTEM,
          title: `Retainer invoice sent — ${retainer.clientId}`,
          body: `Invoice ${invoiceNumber} for ${retainer.serviceName} ($${total.toFixed(2)}) auto-sent.`,
          link: `/finance/invoices/${invoice.id}`,
        });

        this.logger.log(
          `Retainer invoice created and sent: ${invoiceNumber} for retainer ${retainer.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to process retainer billing for retainer ${retainer.id}`,
          String(err),
        );
      }
    }

    this.logger.log('Retainer auto-billing complete');
  }
}
