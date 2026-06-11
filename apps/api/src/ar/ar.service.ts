import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArFiltersDto } from './dto/ar-filters.dto';

export type ArRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CURRENT';

@Injectable()
export class ArService {
  private readonly logger = new Logger(ArService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLedger(filters: ArFiltersDto) {
    const now = new Date();

    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        status: filters.overdueOnly
          ? InvoiceStatus.OVERDUE
          : {
              in: [
                InvoiceStatus.SENT,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE,
              ],
            },
        deletedAt: null,
        ...(filters.clientId && {
          clientId: { contains: filters.clientId, mode: 'insensitive' as const },
        }),
      },
      include: {
        payments: {
          where: { deletedAt: null },
          select: { amount: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const clientMap = new Map<string, typeof unpaidInvoices>();
    for (const inv of unpaidInvoices) {
      const list = clientMap.get(inv.clientId) ?? [];
      list.push(inv);
      clientMap.set(inv.clientId, list);
    }

    let ledgerRows = Array.from(clientMap.entries()).map(([clientId, invoices]) => {
      const totalOutstanding = invoices.reduce((sum, inv) => {
        const paid = inv.payments.reduce(
          (ps, p) => ps + Number(p.amount),
          0,
        );
        return sum + (Number(inv.total) - paid);
      }, 0);

      const oldestInvoice = invoices[0];
      const daysOldest = Math.floor(
        (now.getTime() - oldestInvoice.dueDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const riskLevel: ArRiskLevel =
        daysOldest > 60
          ? 'HIGH'
          : daysOldest > 30
            ? 'MEDIUM'
            : daysOldest > 0
              ? 'LOW'
              : 'CURRENT';

      return {
        clientId,
        invoiceCount: invoices.length,
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
        oldestDueDate: oldestInvoice.dueDate.toISOString(),
        daysOldest: Math.max(0, daysOldest),
        riskLevel,
        invoices: invoices.map((inv) => {
          const paid = inv.payments.reduce(
            (s, p) => s + Number(p.amount),
            0,
          );
          const daysOverdue = Math.max(
            0,
            Math.floor(
              (now.getTime() - inv.dueDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            total: Number(inv.total),
            remaining: Number((Number(inv.total) - paid).toFixed(2)),
            dueDate: inv.dueDate.toISOString(),
            status: inv.status,
            daysOverdue,
          };
        }),
      };
    });

    if (filters.riskLevel) {
      ledgerRows = ledgerRows.filter((r) => r.riskLevel === filters.riskLevel);
    }

    ledgerRows.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const totalAR = ledgerRows.reduce((s, r) => s + r.totalOutstanding, 0);
    const highRiskCount = ledgerRows.filter((r) => r.riskLevel === 'HIGH').length;

    this.logger.debug(`AR ledger: ${ledgerRows.length} clients`);

    return {
      asOf: now.toISOString(),
      totalAR: Number(totalAR.toFixed(2)),
      clientCount: ledgerRows.length,
      highRiskCount,
      ledger: ledgerRows,
    };
  }

  async getSummary() {
    const result = await this.prisma.invoice.aggregate({
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
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      totalOutstanding: Number(result._sum.total ?? 0),
      invoiceCount: result._count.id,
    };
  }
}
