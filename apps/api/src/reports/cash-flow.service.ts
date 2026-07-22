import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BillStatus, InvoiceStatus } from '@prisma/client';
import {
  addWeeks,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CashFlowFiltersDto } from './dto/cash-flow-filters.dto';
import { CreateCashFlowAdjustmentDto } from './dto/create-cash-flow-adjustment.dto';
import { invoiceRemainingBalance } from '../common/invoice-balance.util';

export type CashFlowItemType = 'INVOICE' | 'BILL' | 'ADJUSTMENT';

export interface CashFlowLineItem {
  date: Date;
  amount: number;
  label: string;
  type: CashFlowItemType;
  invoiceId?: string;
  billId?: string;
}

export interface CashFlowWeekBucket {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  runningBalance: number;
  inflowItems: CashFlowLineItem[];
  outflowItems: CashFlowLineItem[];
  isNegative: boolean;
}

@Injectable()
export class CashFlowService {
  private readonly logger = new Logger(CashFlowService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getForecast(filters: CashFlowFiltersDto) {
    const weeks = filters.weeks ?? 13;
    const openingBalance = filters.openingBalance ?? 0;
    const today = startOfDay(new Date());
    const endDate = addWeeks(today, weeks);

    const openInvoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: [
            InvoiceStatus.SENT,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE,
          ],
        },
        deletedAt: null,
      },
      include: {
        payments: {
          where: { deletedAt: null },
          select: { amount: true },
        },
        creditNotes: {
          where: { deletedAt: null },
          select: { amount: true, status: true },
        },
      },
    });

    const invoiceInflows: CashFlowLineItem[] = openInvoices
      .map((inv) => {
        const remaining = invoiceRemainingBalance({
          total: inv.total,
          payments: inv.payments,
          creditNotes: inv.creditNotes,
        });
        return {
          date: inv.dueDate,
          amount: remaining,
          label: `Invoice ${inv.invoiceNumber}`,
          type: 'INVOICE' as const,
          invoiceId: inv.id,
        };
      })
      .filter((item) => item.amount > 0.001);

    const unpaidBills = await this.prisma.bill.findMany({
      where: {
        status: { in: [BillStatus.UNPAID, BillStatus.PARTIALLY_PAID] },
        deletedAt: null,
      },
    });

    const billOutflows: CashFlowLineItem[] = unpaidBills.map((bill) => ({
      date: bill.dueDate,
      amount: Number(bill.amount),
      label: `Bill — ${bill.vendorName}`,
      type: 'BILL' as const,
      billId: bill.id,
    }));

    const adjustments = await this.prisma.cashFlowAdjustment.findMany({
      where: {
        date: { gte: today, lte: endDate },
        deletedAt: null,
      },
    });

    const weeklyBuckets: CashFlowWeekBucket[] = [];
    let runningBalance = openingBalance;

    for (let i = 0; i < weeks; i++) {
      const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

      const weekInflows: CashFlowLineItem[] = [
        ...invoiceInflows.filter(
          (item) => item.date >= weekStart && item.date <= weekEnd,
        ),
        ...adjustments
          .filter(
            (a) =>
              a.direction === 'IN' &&
              a.date >= weekStart &&
              a.date <= weekEnd,
          )
          .map((a) => ({
            date: a.date,
            amount: Number(a.amount),
            label: a.label,
            type: 'ADJUSTMENT' as const,
          })),
      ];

      const weekOutflows: CashFlowLineItem[] = [
        ...billOutflows.filter(
          (item) => item.date >= weekStart && item.date <= weekEnd,
        ),
        ...adjustments
          .filter(
            (a) =>
              a.direction === 'OUT' &&
              a.date >= weekStart &&
              a.date <= weekEnd,
          )
          .map((a) => ({
            date: a.date,
            amount: Number(a.amount),
            label: a.label,
            type: 'ADJUSTMENT' as const,
          })),
      ];

      const totalInflows = weekInflows.reduce((s, item) => s + item.amount, 0);
      const totalOutflows = weekOutflows.reduce(
        (s, item) => s + item.amount,
        0,
      );
      const netFlow = totalInflows - totalOutflows;
      runningBalance += netFlow;

      weeklyBuckets.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
        inflows: Number(totalInflows.toFixed(2)),
        outflows: Number(totalOutflows.toFixed(2)),
        netFlow: Number(netFlow.toFixed(2)),
        runningBalance: Number(runningBalance.toFixed(2)),
        inflowItems: weekInflows.map((item) => ({
          ...item,
          date: item.date,
        })),
        outflowItems: weekOutflows,
        isNegative: runningBalance < 0,
      });
    }

    const lowestBalance = Math.min(
      ...weeklyBuckets.map((w) => w.runningBalance),
      openingBalance,
    );
    const shortfallWeeks = weeklyBuckets.filter((w) => w.isNegative);

    const thirtyDaysOut = addWeeks(today, 4);
    const hasShortfall30Days = weeklyBuckets.some(
      (w) =>
        w.isNegative &&
        new Date(w.weekStart) <= thirtyDaysOut,
    );

    this.logger.debug(`Cash flow forecast: ${weeks} weeks`);

    return {
      openingBalance,
      forecastPeriod: {
        from: today.toISOString(),
        to: endDate.toISOString(),
        weeks,
      },
      totalExpectedInflows: Number(
        invoiceInflows.reduce((s, i) => s + i.amount, 0).toFixed(2),
      ),
      totalExpectedOutflows: Number(
        billOutflows.reduce((s, o) => s + o.amount, 0).toFixed(2),
      ),
      lowestProjectedBalance: Number(lowestBalance.toFixed(2)),
      hasShortfall: shortfallWeeks.length > 0,
      hasShortfall30Days,
      shortfallWeeks: shortfallWeeks.map((w) => w.weekLabel),
      weeks: weeklyBuckets,
      adjustments: adjustments.map((a) => ({
        id: a.id,
        label: a.label,
        amount: Number(a.amount),
        direction: a.direction as 'IN' | 'OUT',
        date: a.date.toISOString(),
      })),
    };
  }

  async createAdjustment(dto: CreateCashFlowAdjustmentDto, userId: string) {
    const adjustment = await this.prisma.cashFlowAdjustment.create({
      data: {
        label: dto.label,
        amount: dto.amount,
        direction: dto.direction,
        date: new Date(dto.date),
        createdBy: userId,
      },
    });

    return {
      id: adjustment.id,
      label: adjustment.label,
      amount: Number(adjustment.amount),
      direction: adjustment.direction,
      date: adjustment.date.toISOString(),
    };
  }

  async deleteAdjustment(id: string) {
    const existing = await this.prisma.cashFlowAdjustment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Adjustment not found');
    }

    await this.prisma.cashFlowAdjustment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Adjustment deleted' };
  }

  async hasShortfallIn30Days(openingBalance = 0): Promise<boolean> {
    const forecast = await this.getForecast({
      weeks: 13,
      openingBalance,
    });
    return forecast.hasShortfall30Days;
  }
}
