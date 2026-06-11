import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BalanceSheetEntry,
  BalanceSheetType,
  BillStatus,
  InvoiceStatus,
} from '@prisma/client';
import { startOfDay } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBalanceSheetEntryDto,
  UpdateBalanceSheetEntryDto,
} from './dto/balance-sheet-entry.dto';

export interface BalanceSheetResult {
  asOf: string;
  assets: {
    accountsReceivable: number;
    manual: {
      id: string;
      label: string;
      amount: number;
      currency: string;
      asOfDate: string;
    }[];
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    manual: {
      id: string;
      label: string;
      amount: number;
      currency: string;
      asOfDate: string;
    }[];
    totalLiabilities: number;
  };
  equity: number;
  previousPeriod: {
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
  } | null;
}

@Injectable()
export class BalanceSheetService {
  private readonly logger = new Logger(BalanceSheetService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalanceSheet(
    asOfInput?: string,
    includeYoY = true,
  ): Promise<BalanceSheetResult> {
    const date = asOfInput ? new Date(asOfInput) : new Date();
    const endOfDay = startOfDay(date);
    endOfDay.setHours(23, 59, 59, 999);

    const accountsReceivable =
      await this.calculateAccountsReceivable(endOfDay);

    const manualAssets = await this.prisma.balanceSheetEntry.findMany({
      where: {
        type: BalanceSheetType.ASSET,
        asOfDate: { lte: endOfDay },
        deletedAt: null,
      },
      orderBy: { asOfDate: 'desc' },
    });

    const latestManualAssets = this.getLatestEntriesByLabel(manualAssets);
    const totalManualAssets = latestManualAssets.reduce(
      (s, e) => s + Number(e.amount),
      0,
    );

    const apResult = await this.prisma.bill.aggregate({
      where: {
        status: { in: [BillStatus.UNPAID, BillStatus.PARTIALLY_PAID] },
        createdAt: { lte: endOfDay },
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    const accountsPayable = Number(apResult._sum.amount ?? 0);

    const manualLiabilities = await this.prisma.balanceSheetEntry.findMany({
      where: {
        type: BalanceSheetType.LIABILITY,
        asOfDate: { lte: endOfDay },
        deletedAt: null,
      },
      orderBy: { asOfDate: 'desc' },
    });

    const latestManualLiabilities =
      this.getLatestEntriesByLabel(manualLiabilities);
    const totalManualLiabilities = latestManualLiabilities.reduce(
      (s, e) => s + Number(e.amount),
      0,
    );

    const totalAssets = accountsReceivable + totalManualAssets;
    const totalLiabilities = accountsPayable + totalManualLiabilities;
    const equity = totalAssets - totalLiabilities;

    let previousPeriod: {
      totalAssets: number;
      totalLiabilities: number;
      equity: number;
    } | null = null;

    if (includeYoY) {
      const lastYear = new Date(date);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const prev = await this.getBalanceSheet(
        lastYear.toISOString().slice(0, 10),
        false,
      );
      previousPeriod = {
        totalAssets: prev.assets.totalAssets,
        totalLiabilities: prev.liabilities.totalLiabilities,
        equity: prev.equity,
      };
    }

    this.logger.debug(`Balance sheet as of ${endOfDay.toISOString()}`);

    return {
      asOf: endOfDay.toISOString(),
      assets: {
        accountsReceivable: Number(accountsReceivable.toFixed(2)),
        manual: latestManualAssets.map((e) => ({
          id: e.id,
          label: e.label,
          amount: Number(e.amount),
          currency: e.currency,
          asOfDate: e.asOfDate.toISOString(),
        })),
        totalAssets: Number(totalAssets.toFixed(2)),
      },
      liabilities: {
        accountsPayable: Number(accountsPayable.toFixed(2)),
        manual: latestManualLiabilities.map((e) => ({
          id: e.id,
          label: e.label,
          amount: Number(e.amount),
          currency: e.currency,
          asOfDate: e.asOfDate.toISOString(),
        })),
        totalLiabilities: Number(totalLiabilities.toFixed(2)),
      },
      equity: Number(equity.toFixed(2)),
      previousPeriod,
    };
  }

  async createEntry(dto: CreateBalanceSheetEntryDto, userId: string) {
    const entry = await this.prisma.balanceSheetEntry.create({
      data: {
        type: dto.type,
        label: dto.label,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        asOfDate: dto.asOfDate ? new Date(dto.asOfDate) : new Date(),
        notes: dto.notes,
        createdBy: userId,
      },
    });
    return this.serializeEntry(entry);
  }

  async updateEntry(id: string, dto: UpdateBalanceSheetEntryDto) {
    const existing = await this.prisma.balanceSheetEntry.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Entry not found');

    const entry = await this.prisma.balanceSheetEntry.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.asOfDate !== undefined
          ? { asOfDate: new Date(dto.asOfDate) }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return this.serializeEntry(entry);
  }

  async deleteEntry(id: string) {
    const existing = await this.prisma.balanceSheetEntry.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Entry not found');

    const entry = await this.prisma.balanceSheetEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return this.serializeEntry(entry);
  }

  private async calculateAccountsReceivable(endOfDay: Date): Promise<number> {
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

    return invoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce(
        (ps, p) => ps + Number(p.amount),
        0,
      );
      return sum + (Number(inv.total) - paid);
    }, 0);
  }

  private getLatestEntriesByLabel(entries: BalanceSheetEntry[]) {
    const byLabel = new Map<string, BalanceSheetEntry>();
    for (const entry of entries) {
      if (!byLabel.has(entry.label)) {
        byLabel.set(entry.label, entry);
      }
    }
    return Array.from(byLabel.values());
  }

  private serializeEntry(entry: BalanceSheetEntry) {
    return {
      id: entry.id,
      type: entry.type,
      label: entry.label,
      amount: Number(entry.amount),
      currency: entry.currency,
      asOfDate: entry.asOfDate.toISOString(),
      notes: entry.notes,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
