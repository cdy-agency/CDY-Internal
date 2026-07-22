import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArFiltersDto } from './dto/ar-filters.dto';
import { invoiceRemainingBalance } from '../common/invoice-balance.util';

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
        creditNotes: {
          where: { deletedAt: null },
          select: { amount: true, status: true },
        },
        client: { select: { companyName: true, contactName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const openInvoices = unpaidInvoices.filter(
      (inv) =>
        invoiceRemainingBalance({
          total: inv.total,
          payments: inv.payments,
          creditNotes: inv.creditNotes,
        }) > 0.001,
    );

    const clientMap = new Map<string, typeof openInvoices>();
    for (const inv of openInvoices) {
      const list = clientMap.get(inv.clientId) ?? [];
      list.push(inv);
      clientMap.set(inv.clientId, list);
    }

    let ledgerRows = Array.from(clientMap.entries()).map(
      ([clientId, invoices]: [string, typeof openInvoices]) => {
        const clientName =
          invoices[0]?.client?.companyName ??
          invoices[0]?.client?.contactName ??
          clientId;
        const totalOutstanding = invoices.reduce((sum, inv) => {
          return (
            sum +
            invoiceRemainingBalance({
              total: inv.total,
              payments: inv.payments,
              creditNotes: inv.creditNotes,
            })
          );
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
          clientName,
          invoiceCount: invoices.length,
          totalOutstanding: Number(totalOutstanding.toFixed(2)),
          oldestDueDate: oldestInvoice.dueDate.toISOString(),
          daysOldest: Math.max(0, daysOldest),
          riskLevel,
          invoices: invoices.map((inv) => {
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
              remaining: invoiceRemainingBalance({
                total: inv.total,
                payments: inv.payments,
                creditNotes: inv.creditNotes,
              }),
              dueDate: inv.dueDate.toISOString(),
              status: inv.status,
              daysOverdue,
            };
          }),
        };
      },
    );

    if (filters.riskLevel) {
      ledgerRows = ledgerRows.filter((r) => r.riskLevel === filters.riskLevel);
    }

    ledgerRows.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const totalAR = ledgerRows.reduce((s, r) => s + r.totalOutstanding, 0);
    const highRiskCount = ledgerRows.filter(
      (r) => r.riskLevel === 'HIGH',
    ).length;

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
    const unpaidInvoices = await this.prisma.invoice.findMany({
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
        payments: { where: { deletedAt: null }, select: { amount: true } },
        creditNotes: {
          where: { deletedAt: null },
          select: { amount: true, status: true },
        },
      },
    });

    const withBalance = unpaidInvoices
      .map((inv) =>
        invoiceRemainingBalance({
          total: inv.total,
          payments: inv.payments,
          creditNotes: inv.creditNotes,
        }),
      )
      .filter((remaining) => remaining > 0.001);

    return {
      totalOutstanding: Number(
        withBalance.reduce((s, r) => s + r, 0).toFixed(2),
      ),
      invoiceCount: withBalance.length,
    };
  }
}
