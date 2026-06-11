import { Injectable, Logger } from '@nestjs/common';
import { BillStatus, InvoiceStatus } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BalanceSheetService {
  private readonly logger = new Logger(BalanceSheetService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalanceSheet(asOfInput?: string) {
    const date = asOfInput ? new Date(asOfInput) : new Date();
    const endOfDay = startOfDay(date);
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: [
            InvoiceStatus.SENT,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE,
          ],
        },
        createdAt: { lte: endOfDay },
        deletedAt: null,
      },
      include: {
        payments: {
          where: { deletedAt: null, paidAt: { lte: endOfDay } },
          select: { amount: true },
        },
      },
    });

    const accountsReceivable = invoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce(
        (ps, p) => ps + Number(p.amount),
        0,
      );
      return sum + (Number(inv.total) - paid);
    }, 0);

    const accountsPayableAgg = await this.prisma.bill.aggregate({
      where: {
        status: { in: [BillStatus.UNPAID, BillStatus.PARTIALLY_PAID] },
        createdAt: { lte: endOfDay },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    const totalAccountsPayable = Number(accountsPayableAgg._sum.amount ?? 0);
    const totalAssets = accountsReceivable;
    const totalLiabilities = totalAccountsPayable;
    const equity = totalAssets - totalLiabilities;

    this.logger.debug(`Balance sheet as of ${endOfDay.toISOString()}`);

    return {
      asOf: endOfDay.toISOString(),
      assets: {
        accountsReceivable: Number(accountsReceivable.toFixed(2)),
        cash: 0,
        otherAssets: 0,
        totalAssets: Number(totalAssets.toFixed(2)),
      },
      liabilities: {
        accountsPayable: Number(totalAccountsPayable.toFixed(2)),
        otherLiabilities: 0,
        totalLiabilities: Number(totalLiabilities.toFixed(2)),
      },
      equity: Number(equity.toFixed(2)),
    };
  }
}
