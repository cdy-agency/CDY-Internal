import {
  PrismaClient,
  InvoiceStatus,
  PaymentMethod,
  ExpenseCategory,
  BillStatus,
  CommissionStatus,
  LeadSource,
  PipelineStage,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedRbac, getRoleIdByKey } from './seeds/rbac.seed';

const prisma = new PrismaClient();

async function clearAllData(): Promise<void> {
  await prisma.ventureExpense.deleteMany();
  await prisma.ventureIncome.deleteMany();
  await prisma.venture.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.pipelineStageHistory.deleteMany();
  await prisma.lead.deleteMany();
<<<<<<< HEAD
=======
  await prisma.invoiceReminder.deleteMany();
  await prisma.employeeSalary.deleteMany();
  await prisma.balanceSheetEntry.deleteMany();
  await prisma.financeSetting.deleteMany();
  await prisma.budgetIncreaseRequest.deleteMany();
  await prisma.projectBudget.deleteMany();
  await prisma.taxPayment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceReminder.deleteMany();
  await prisma.commissionRecord.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.itAuditLog.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  await seedRbac(prisma);

  const forceReseed = process.env.SEED_FORCE === 'true';

  if (!forceReseed) {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      process.stdout.write('Seed skipped: database already contains users\n');
      return;
    }
  } else {
    process.stdout.write('SEED_FORCE=true — wiping and reseeding database\n');
    await clearAllData();
    await seedRbac(prisma);
  }

  const passwordHash = await bcrypt.hash('CDY@2026!', 10);

  const ceoRoleId = await getRoleIdByKey(prisma, 'CEO');
  const financeRoleId = await getRoleIdByKey(prisma, 'FINANCE_MANAGER');
  const salesRoleId = await getRoleIdByKey(prisma, 'SALES_AGENT');
  const itRoleId = await getRoleIdByKey(prisma, 'IT');

  const ceo = await prisma.user.create({
    data: {
      email: 'ceo@cdy.com',
      passwordHash,
      firstName: 'Amara',
      lastName: 'Okafor',
      roleId: ceoRoleId,
    },
  });

  const financeManager = await prisma.user.create({
    data: {
      email: 'finance@cdy.com',
      passwordHash,
      firstName: 'Kofi',
      lastName: 'Mensah',
      roleId: financeRoleId,
    },
  });

  const salesAgent = await prisma.user.create({
    data: {
      email: 'sales@cdy.com',
      passwordHash,
      firstName: 'Zara',
      lastName: 'Ndlovu',
      roleId: salesRoleId,
    },
  });

  await prisma.user.create({
    data: {
      email: 'it@cdy.com',
      passwordHash,
      firstName: 'Ian',
      lastName: 'Tech',
      roleId: itRoleId,
    },
  });

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const legacyClientIds = [
    'client-001',
    'client-002',
    'client-003',
    'client-004',
    'client-005',
  ];

  for (const clientId of legacyClientIds) {
    await prisma.client.create({
      data: {
        id: clientId,
        companyName: clientId.replace('client-', 'Client '),
        contactName: 'Legacy Contact',
        email: `${clientId}@legacy.cdy.local`,
        createdBy: financeManager.id,
      },
    });
  }

  const sampleClients = await Promise.all([
    prisma.client.create({
      data: {
        companyName: 'Acme Corp Rwanda',
        contactName: 'Sarah Ingabire',
        email: 'sarah@acme.rw',
        country: 'RW',
        createdBy: salesAgent.id,
        assignedTo: salesAgent.id,
      },
    }),
    prisma.client.create({
      data: {
        companyName: 'BritAid Rwanda',
        contactName: 'Peter Mugisha',
        email: 'peter@britaid.rw',
        country: 'RW',
        createdBy: salesAgent.id,
        assignedTo: salesAgent.id,
      },
    }),
  ]);

  const sampleLeads = [
    {
      contactName: 'James Kabera',
      companyName: 'TechStart Rwanda',
      email: 'james@techstart.rw',
      stage: PipelineStage.NEGOTIATION,
      source: LeadSource.REFERRAL,
      estimatedValue: 24000,
      serviceInterest: 'software_dev',
      qualityScore: 82,
    },
    {
      contactName: 'Amina Uwera',
      companyName: 'Kigali Media Ltd',
      email: 'amina@kigalimedia.rw',
      stage: PipelineStage.PROPOSAL_SENT,
      source: LeadSource.WEBSITE,
      estimatedValue: 8500,
      serviceInterest: 'marketing',
      qualityScore: 65,
    },
    {
      contactName: 'Blaise Nkurunziza',
      companyName: 'Eco Ventures',
      email: 'blaise@eco.rw',
      stage: PipelineStage.CONTACTED,
      source: LeadSource.SOCIAL_MEDIA,
      estimatedValue: 15000,
      serviceInterest: 'branding',
      qualityScore: 55,
    },
    {
      contactName: 'Claire Mutoni',
      companyName: 'GreenField Inc',
      email: 'claire@greenfield.rw',
      stage: PipelineStage.NEW,
      source: LeadSource.COLD_OUTREACH,
      estimatedValue: 5000,
      serviceInterest: 'marketing',
      qualityScore: 35,
    },
    {
      contactName: 'David Habimana',
      companyName: 'Inzozi Tech',
      email: 'david@inzozi.rw',
      stage: PipelineStage.NEW,
      source: LeadSource.EVENT,
      estimatedValue: 30000,
      serviceInterest: 'software_dev',
      qualityScore: 70,
    },
  ];

  for (const lead of sampleLeads) {
    const created = await prisma.lead.create({
      data: {
        ...lead,
        assignedTo: salesAgent.id,
        createdBy: salesAgent.id,
      },
    });

    await prisma.pipelineStageHistory.create({
      data: {
        leadId: created.id,
        fromStage: null,
        toStage: PipelineStage.NEW,
        movedBy: salesAgent.id,
      },
    });
  }

  void sampleClients;

  const draftInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'CDY-2026-0001',
      clientId: 'client-001',
      status: InvoiceStatus.DRAFT,
      lineItems: [
        { description: 'Brand Strategy', quantity: 1, unitPrice: 5000, amount: 5000 },
      ],
      subtotal: 5000,
      taxRate: 0,
      taxAmount: 0,
      total: 5000,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      serviceType: 'branding',
      createdBy: financeManager.id,
      createdAt: currentMonthStart,
    },
  });

  const sentInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'CDY-2026-0002',
      clientId: 'client-002',
      status: InvoiceStatus.SENT,
      lineItems: [
        { description: 'Web Development', quantity: 1, unitPrice: 15000, amount: 15000 },
      ],
      subtotal: 15000,
      taxRate: 0,
      taxAmount: 0,
      total: 15000,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 28),
      sentAt: currentMonthStart,
      serviceType: 'software_dev',
      createdBy: financeManager.id,
      createdAt: currentMonthStart,
    },
  });

  const paidInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'CDY-2026-0003',
      clientId: 'client-003',
      status: InvoiceStatus.PAID,
      lineItems: [
        { description: 'Marketing Campaign', quantity: 1, unitPrice: 25000, amount: 25000 },
      ],
      subtotal: 25000,
      taxRate: 0,
      taxAmount: 0,
      total: 25000,
      dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      sentAt: lastMonthStart,
      paidAt: new Date(now.getFullYear(), now.getMonth(), 5),
      serviceType: 'marketing',
      createdBy: financeManager.id,
      createdAt: currentMonthStart,
    },
  });

  const overdueInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'CDY-2026-0004',
      clientId: 'client-004',
      status: InvoiceStatus.OVERDUE,
      lineItems: [
        { description: 'Consulting Services', quantity: 1, unitPrice: 8000, amount: 8000 },
      ],
      subtotal: 8000,
      taxRate: 0,
      taxAmount: 0,
      total: 8000,
      dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      sentAt: lastMonthStart,
      serviceType: 'sales_services',
      createdBy: financeManager.id,
      createdAt: lastMonthStart,
    },
  });

  const partialInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'CDY-2026-0005',
      clientId: 'client-005',
      status: InvoiceStatus.PARTIALLY_PAID,
      lineItems: [
        { description: 'Software Development', quantity: 1, unitPrice: 20000, amount: 20000 },
      ],
      subtotal: 20000,
      taxRate: 0,
      taxAmount: 0,
      total: 20000,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
      sentAt: currentMonthStart,
      serviceType: 'software_dev',
      createdBy: financeManager.id,
      createdAt: currentMonthStart,
    },
  });

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await prisma.commissionRule.createMany({
    data: [
      {
        agentId: salesAgent.id,
        serviceType: 'marketing',
        ratePercent: 8,
        createdBy: financeManager.id,
      },
      {
        agentId: salesAgent.id,
        serviceType: null,
        ratePercent: 5,
        createdBy: financeManager.id,
      },
    ],
  });

  await prisma.commissionRecord.createMany({
    data: [
      {
        agentId: salesAgent.id,
        dealId: 'deal-001',
        dealValue: 25000,
        serviceType: 'marketing',
        ratePercent: 8,
        calculatedAmount: 2000,
        month: monthKey,
        status: CommissionStatus.PENDING,
      },
      {
        agentId: salesAgent.id,
        dealId: 'deal-002',
        dealValue: 15000,
        serviceType: 'software_dev',
        ratePercent: 5,
        calculatedAmount: 750,
        month: monthKey,
        status: CommissionStatus.APPROVED,
        approvedBy: financeManager.id,
        approvedAt: now,
      },
    ],
  });

  await prisma.payment.createMany({
    data: [
      {
        invoiceId: paidInvoice.id,
        amount: 15000,
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'PAY-001',
        paidAt: new Date(now.getFullYear(), now.getMonth(), 3),
        recordedBy: financeManager.id,
      },
      {
        invoiceId: paidInvoice.id,
        amount: 10000,
        method: PaymentMethod.MOBILE_MONEY,
        reference: 'PAY-002',
        paidAt: new Date(now.getFullYear(), now.getMonth(), 5),
        recordedBy: financeManager.id,
      },
      {
        invoiceId: partialInvoice.id,
        amount: 10000,
        method: PaymentMethod.CARD,
        reference: 'PAY-003',
        paidAt: new Date(now.getFullYear(), now.getMonth(), 10),
        recordedBy: financeManager.id,
      },
    ],
  });

  await prisma.expense.createMany({
    data: [
      {
        vendorName: 'CloudHost Pro',
        category: ExpenseCategory.SOFTWARE,
        amount: 450,
        date: new Date(now.getFullYear(), now.getMonth(), 2),
        projectId: 'proj-001',
        createdBy: financeManager.id,
      },
      {
        vendorName: 'Office Supplies Co',
        category: ExpenseCategory.OFFICE,
        amount: 320,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        createdBy: financeManager.id,
      },
      {
        vendorName: 'Marketing Agency',
        category: ExpenseCategory.MARKETING,
        amount: 2500,
        date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        createdBy: financeManager.id,
      },
      {
        vendorName: 'Freelance Dev',
        category: ExpenseCategory.SUPPLIER,
        amount: 2600,
        date: new Date(now.getFullYear(), now.getMonth(), 6),
        projectId: 'proj-002',
        createdBy: financeManager.id,
      },
    ],
  });

  const fiveDaysFromNow = new Date(now);
  fiveDaysFromNow.setDate(now.getDate() + 5);

  await prisma.bill.createMany({
    data: [
      {
        vendorName: 'Internet Provider',
        category: 'Utilities',
        amount: 250,
        dueDate: fiveDaysFromNow,
        status: BillStatus.UNPAID,
        createdBy: financeManager.id,
      },
      {
        vendorName: 'Equipment Rental',
        category: 'Equipment',
        amount: 1200,
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
        status: BillStatus.UNPAID,
        createdBy: financeManager.id,
      },
    ],
  });

  const printing = await prisma.venture.create({
    data: {
      name: 'CDY Printing',
      description: 'Printing and branded materials',
      color: '6366F1',
      createdBy: financeManager.id,
    },
  });

  const events = await prisma.venture.create({
    data: {
      name: 'CDY Events',
      description: 'Event planning and catering services',
      color: 'F59E0B',
      createdBy: financeManager.id,
    },
  });

  await prisma.ventureIncome.createMany({
    data: [
      {
        ventureId: printing.id,
        description: 'Branded flyers — Acme Corp',
        amount: 1200,
        category: 'Sales',
        date: new Date('2026-06-15'),
        createdBy: financeManager.id,
      },
      {
        ventureId: printing.id,
        description: 'Business cards — TechStart',
        amount: 800,
        category: 'Sales',
        date: new Date('2026-06-10'),
        createdBy: financeManager.id,
      },
      {
        ventureId: events.id,
        description: 'Team lunch catering — CDY',
        amount: 3500,
        category: 'Service Fee',
        date: new Date('2026-06-12'),
        createdBy: financeManager.id,
      },
    ],
  });

  await prisma.ventureExpense.createMany({
    data: [
      {
        ventureId: printing.id,
        description: 'Paper & ink stock',
        totalAmount: 800,
        ventureShare: 100,
        ventureAmount: 800,
        category: ExpenseCategory.SUPPLIER,
        date: new Date(now.getFullYear(), now.getMonth(), 14),
        isShared: false,
        createdBy: financeManager.id,
      },
      {
        ventureId: printing.id,
        description: 'Office rent share',
        totalAmount: 2400,
        ventureShare: 25,
        ventureAmount: 600,
        category: ExpenseCategory.OFFICE,
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        isShared: true,
        cdyShare: 75,
        createdBy: financeManager.id,
      },
    ],
  });

  void draftInvoice;
  void sentInvoice;
  void overdueInvoice;
  void ceo;

  process.stdout.write(
    'Seed complete: ceo@cdy.com, finance@cdy.com, sales@cdy.com, it@cdy.com (password: CDY@2026!)\n',
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
