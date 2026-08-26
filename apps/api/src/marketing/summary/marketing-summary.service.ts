import { Injectable } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  parse,
  parseISO,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';

export type SummaryPeriod = 'day' | 'week' | 'month';

@Injectable()
export class MarketingSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(period: SummaryPeriod, dateStr: string): { from: Date; to: Date } {
    const anchor = parseISO(dateStr);
    switch (period) {
      case 'day':
        return { from: startOfDay(anchor), to: endOfDay(anchor) };
      case 'week':
        return {
          from: startOfWeek(anchor, { weekStartsOn: 1 }),
          to: endOfWeek(anchor, { weekStartsOn: 1 }),
        };
      case 'month':
      default:
        return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    }
  }

  /** Totals across every active marketing client for a day/week/month, anchored on `dateStr` (yyyy-MM-dd). */
  async getAllClientsSummaryForPeriod(period: SummaryPeriod, dateStr: string) {
    const { from, to } = this.resolveRange(period, dateStr);

    const clients = await this.prisma.marketingClient.findMany({
      where: { isActive: true },
      include: { client: { select: { companyName: true } } },
    });

    return Promise.all(
      clients.map(async (mc) => {
        const items = await this.prisma.contentItem.findMany({
          where: {
            marketingClientId: mc.id,
            scheduledDate: { gte: from, lte: to },
            deletedAt: null,
          },
        });

        const planned = items.length;
        const approved = items.filter(
          (i) => i.status === ContentStatus.APPROVED || i.status === ContentStatus.PUBLISHED,
        ).length;
        const published = items.filter((i) => i.status === ContentStatus.PUBLISHED).length;
        const pending = items.filter((i) => i.status === ContentStatus.READY).length;
        const rejected = items.filter((i) => i.status === ContentStatus.REJECTED).length;

        const byPlatform: Record<string, { planned: number; published: number }> = {};
        for (const item of items) {
          if (!byPlatform[item.platform]) {
            byPlatform[item.platform] = { planned: 0, published: 0 };
          }
          byPlatform[item.platform].planned++;
          if (item.status === ContentStatus.PUBLISHED) {
            byPlatform[item.platform].published++;
          }
        }

        const deliveryRate = planned > 0 ? Number(((published / planned) * 100).toFixed(1)) : 0;

        return {
          clientName: mc.client?.companyName ?? 'Unknown',
          marketingClientId: mc.id,
          postsTarget: mc.postsPerMonth,
          planned,
          approved,
          published,
          pending,
          rejected,
          deliveryRate,
          byPlatform,
        };
      }),
    );
  }

  async getMonthlySummary(marketingClientId: string, month: string) {
    const monthDate = parse(month, 'yyyy-MM', new Date());
    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);

    const [items, mc] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: {
          marketingClientId,
          scheduledDate: { gte: from, lte: to },
          deletedAt: null,
        },
      }),
      this.prisma.marketingClient.findUnique({
        where: { id: marketingClientId },
      }),
    ]);

    const planned = items.length;
    const approved = items.filter(
      (i) =>
        i.status === ContentStatus.APPROVED ||
        i.status === ContentStatus.PUBLISHED,
    ).length;
    const published = items.filter(
      (i) => i.status === ContentStatus.PUBLISHED,
    ).length;
    const pending = items.filter(
      (i) => i.status === ContentStatus.READY,
    ).length;
    const rejected = items.filter(
      (i) => i.status === ContentStatus.REJECTED,
    ).length;

    const byPlatform: Record<string, { planned: number; published: number }> =
      {};
    for (const item of items) {
      if (!byPlatform[item.platform]) {
        byPlatform[item.platform] = { planned: 0, published: 0 };
      }
      byPlatform[item.platform].planned++;
      if (item.status === ContentStatus.PUBLISHED) {
        byPlatform[item.platform].published++;
      }
    }

    const deliveryRate =
      planned > 0
        ? Number(((published / planned) * 100).toFixed(1))
        : 0;

    let invoice = null;
    if (mc?.retainerId) {
      invoice = await this.prisma.invoice.findFirst({
        where: {
          retainerContractId: mc.retainerId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          currency: true,
        },
      });
    }

    return {
      month,
      marketingClientId,
      postsTarget: mc?.postsPerMonth ?? 0,
      planned,
      approved,
      published,
      pending,
      rejected,
      deliveryRate,
      byPlatform,
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            total: Number(invoice.total),
            currency: invoice.currency,
          }
        : null,
    };
  }

  async getAllClientsSummary(month: string) {
    const clients = await this.prisma.marketingClient.findMany({
      where: { isActive: true },
      include: { client: { select: { companyName: true } } },
    });

    return Promise.all(
      clients.map(async (mc) => {
        const summary = await this.getMonthlySummary(mc.id, month);
        return { clientName: mc.client?.companyName ?? 'Unknown', ...summary };
      }),
    );
  }
}
