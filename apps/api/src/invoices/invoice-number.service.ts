import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceNumberService {
  private readonly logger = new Logger(InvoiceNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CDY-${year}-`;
    const key = `invoice:${year}`;

    const nextSequence = await this.nextSequence(key, async (tx) => {
      const rows = await tx.invoice.findMany({
        where: { invoiceNumber: { startsWith: prefix } },
        select: { invoiceNumber: true },
      });
      return this.maxSuffixFromNumbers(
        rows.map((r) => r.invoiceNumber),
        prefix,
      );
    });

    const invoiceNumber = `${prefix}${String(nextSequence).padStart(4, '0')}`;
    this.logger.debug(`Generated invoice number: ${invoiceNumber}`);
    return invoiceNumber;
  }

  async generateCreditNoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CDY-CN-${year}-`;
    const key = `credit-note:${year}`;

    const nextSequence = await this.nextSequence(key, async (tx) => {
      const rows = await tx.creditNote.findMany({
        where: { creditNoteNumber: { startsWith: prefix } },
        select: { creditNoteNumber: true },
      });
      return this.maxSuffixFromNumbers(
        rows.map((r) => r.creditNoteNumber),
        prefix,
      );
    });

    const number = `${prefix}${String(nextSequence).padStart(4, '0')}`;
    this.logger.debug(`Generated credit note number: ${number}`);
    return number;
  }

  /**
   * Atomically reserve the next sequence value under an advisory lock.
   * The number is claimed here (before the invoice/credit-note INSERT), so
   * concurrent callers never receive the same value — fixing the previous
   * race where the lock ended before the document row was created.
   */
  private async nextSequence(
    key: string,
    bootstrapMax: (tx: Prisma.TransactionClient) => Promise<number>,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;

      const existingMax = await bootstrapMax(tx);

      let row = await tx.numberSequence.findUnique({ where: { id: key } });
      if (!row) {
        row = await tx.numberSequence.create({
          data: { id: key, lastValue: existingMax },
        });
      } else if (row.lastValue < existingMax) {
        // Stay ahead of any manually inserted / legacy numbers
        row = await tx.numberSequence.update({
          where: { id: key },
          data: { lastValue: existingMax },
        });
      }

      const updated = await tx.numberSequence.update({
        where: { id: key },
        data: { lastValue: { increment: 1 } },
      });

      return updated.lastValue;
    });
  }

  /** Highest numeric suffix after `prefix` (e.g. CDY-2026-0042 → 42). */
  private maxSuffixFromNumbers(numbers: string[], prefix: string): number {
    let max = 0;
    for (const value of numbers) {
      if (!value.startsWith(prefix)) continue;
      const suffix = value.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!Number.isNaN(parsed) && parsed > max) max = parsed;
    }
    return max;
  }
}
