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

    const nextSequence = await this.nextSequence(key, async (tx) =>
      this.maxNumericSuffix(tx, 'Invoice', 'invoiceNumber', prefix, 3),
    );

    const invoiceNumber = `${prefix}${String(nextSequence).padStart(4, '0')}`;
    this.logger.debug(`Generated invoice number: ${invoiceNumber}`);
    return invoiceNumber;
  }

  async generateCreditNoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CDY-CN-${year}-`;
    const key = `credit-note:${year}`;

    const nextSequence = await this.nextSequence(key, async (tx) =>
      this.maxNumericSuffix(tx, 'CreditNote', 'creditNoteNumber', prefix, 4),
    );

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

  /**
   * Highest numeric suffix for documents with the given prefix.
   * Uses numeric cast so ordering is correct past string-sort edge cases.
   */
  private async maxNumericSuffix(
    tx: Prisma.TransactionClient,
    table: 'Invoice' | 'CreditNote',
    column: 'invoiceNumber' | 'creditNoteNumber',
    prefix: string,
    splitPartIndex: number,
  ): Promise<number> {
    // Table/column names are fixed literals from our call sites — not user input.
    const tableSql = table === 'Invoice' ? '"Invoice"' : '"CreditNote"';
    const columnSql =
      column === 'invoiceNumber' ? '"invoiceNumber"' : '"creditNoteNumber"';

    const rows = await tx.$queryRawUnsafe<Array<{ max: number | null }>>(
      `SELECT COALESCE(MAX(CAST(NULLIF(split_part(${columnSql}, '-', $1), '') AS INTEGER)), 0) AS max
       FROM ${tableSql}
       WHERE ${columnSql} LIKE $2`,
      splitPartIndex,
      `${prefix}%`,
    );

    return Number(rows[0]?.max ?? 0);
  }
}
