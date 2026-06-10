import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceNumberService {
  private readonly logger = new Logger(InvoiceNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CDY-${year}-`;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`invoice-seq-${year}`}))`;

      const latest = await tx.invoice.findFirst({
        where: {
          invoiceNumber: { startsWith: prefix },
        },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      });

      let nextSequence = 1;
      if (latest) {
        const sequencePart = latest.invoiceNumber.split('-')[2];
        nextSequence = parseInt(sequencePart ?? '0', 10) + 1;
      }

      const invoiceNumber = `${prefix}${String(nextSequence).padStart(4, '0')}`;
      this.logger.debug(`Generated invoice number: ${invoiceNumber}`);
      return invoiceNumber;
    });
  }
}
