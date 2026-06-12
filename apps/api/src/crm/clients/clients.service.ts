import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { CrmAuditService } from '../audit/crm-audit.service';
import { CrmActor } from '../common/crm-actor.interface';
import { buildCsvRow } from '../common/csv.util';

const OUTSTANDING_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmAuditService: CrmAuditService,
  ) {}

  async findAll(search?: string) {
    const clients = await this.prisma.client.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { companyName: 'asc' },
    });

    if (clients.length === 0) {
      return [];
    }

    const clientIds = clients.map((client) => client.id);

    const [invoicedTotals, outstandingTotals] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['clientId'],
        where: { clientId: { in: clientIds }, deletedAt: null },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['clientId'],
        where: {
          clientId: { in: clientIds },
          status: { in: OUTSTANDING_STATUSES },
          deletedAt: null,
        },
        _sum: { total: true },
      }),
    ]);

    const invoicedMap = new Map(
      invoicedTotals.map((row) => [
        row.clientId,
        {
          totalInvoiced: Number(row._sum.total ?? 0),
          invoiceCount: row._count.id,
        },
      ]),
    );

    const outstandingMap = new Map(
      outstandingTotals.map((row) => [
        row.clientId,
        Number(row._sum.total ?? 0),
      ]),
    );

    return clients.map((client) => ({
      ...client,
      financeSummary: {
        totalInvoiced: invoicedMap.get(client.id)?.totalInvoiced ?? 0,
        invoiceCount: invoicedMap.get(client.id)?.invoiceCount ?? 0,
        outstanding: outstandingMap.get(client.id) ?? 0,
      },
    }));
  }

  async search(query: string) {
    if (!query.trim()) {
      return [];
    }

    return this.prisma.client.findMany({
      where: {
        deletedAt: null,
        OR: [
          { companyName: { contains: query, mode: 'insensitive' } },
          { contactName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        country: true,
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        leads: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            contactName: true,
            stage: true,
            estimatedValue: true,
            convertedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const invoiceSummary = await this.prisma.invoice.aggregate({
      where: { clientId: id, deletedAt: null },
      _sum: { total: true },
      _count: { id: true },
    });

    const outstanding = await this.prisma.invoice.aggregate({
      where: {
        clientId: id,
        status: {
          in: OUTSTANDING_STATUSES,
        },
        deletedAt: null,
      },
      _sum: { total: true },
    });

    const paid = await this.prisma.invoice.aggregate({
      where: {
        clientId: id,
        status: InvoiceStatus.PAID,
        deletedAt: null,
      },
      _sum: { total: true },
    });

    const [activities, invoices] = await Promise.all([
      this.prisma.leadActivity.findMany({
        where: { lead: { clientId: id } },
        include: {
          lead: { select: { id: true, companyName: true } },
        },
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.invoice.findMany({
        where: { clientId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          dueDate: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);

    const performerIds = [...new Set(activities.map((a) => a.performedBy))];
    const performers =
      performerIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: performerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const performerMap = new Map(
      performers.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
    );

    return {
      ...client,
      financeSummary: {
        totalInvoiced: Number(invoiceSummary._sum.total ?? 0),
        invoiceCount: invoiceSummary._count.id,
        outstanding: Number(outstanding._sum.total ?? 0),
        paid: Number(paid._sum.total ?? 0),
      },
      activities: activities.map((activity) => ({
        ...activity,
        performedByName: performerMap.get(activity.performedBy) ?? 'Unknown',
        leadCompanyName: activity.lead.companyName,
        leadId: activity.lead.id,
      })),
      invoices: invoices.map((inv) => ({
        ...inv,
        total: Number(inv.total),
      })),
    };
  }

  async update(id: string, dto: UpdateClientDto, actor: CrmActor) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.client.update({
      where: { id },
      data: dto,
    });

    this.crmAuditService.log({
      userId: actor.userId,
      userEmail: actor.userEmail,
      action: 'client.updated',
      entityType: 'Client',
      entityId: id,
      previousValue: {
        companyName: existing.companyName,
        contactName: existing.contactName,
        email: existing.email,
      },
      newValue: dto,
      ipAddress: actor.ipAddress,
    });

    return updated;
  }

  async exportToCsv(search?: string): Promise<string> {
    const clients = await this.findAll(search);

    const managerIds = [
      ...new Set(clients.map((c) => c.assignedTo).filter(Boolean)),
    ] as string[];
    const managers =
      managerIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: managerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const managerMap = new Map(
      managers.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
    );

    const headers = [
      'ID',
      'Company Name',
      'Contact Name',
      'Email',
      'Phone',
      'Country',
      'Website',
      'Industry',
      'Assigned Manager',
      'Client Since',
      'Total Invoiced',
      'Total Outstanding',
      'Invoice Count',
    ];

    const rows = clients.map((client) =>
      buildCsvRow([
        client.id,
        client.companyName,
        client.contactName,
        client.email,
        client.phone,
        client.country,
        client.website,
        client.industry,
        client.assignedTo
          ? managerMap.get(client.assignedTo) ?? client.assignedTo
          : '',
        format(new Date(client.createdAt), 'yyyy-MM-dd'),
        client.financeSummary?.totalInvoiced ?? 0,
        client.financeSummary?.outstanding ?? 0,
        client.financeSummary?.invoiceCount ?? 0,
      ]),
    );

    return [buildCsvRow(headers), ...rows].join('\n');
  }
}
