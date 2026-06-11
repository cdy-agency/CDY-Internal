import {
  PrismaClient,
  Role,
  InvoiceStatus,
  PaymentMethod,
  ExpenseCategory,
  BillStatus,
  CommissionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function clearAllData(): Promise<void> {
  await prisma.payrollLineItem.deleteMany();
  await prisma.payrollRun.deleteMany();
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
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
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
  }

  const passwordHash = await bcrypt.hash('CDY@2026!', 10);

  const ceo = await prisma.user.create({
    data: {
      email: 'ceo@cdy.com',
      passwordHash,
      firstName: 'Amara',
      lastName: 'Okafor',
      role: Role.CEO,
    },
  });

  const financeManager = await prisma.user.create({
    data: {
      email: 'finance@cdy.com',
      passwordHash,
      firstName: 'Kofi',
      lastName: 'Mensah',
      role: Role.FINANCE_MANAGER,
    },
  });

  const salesAgent = await prisma.user.create({
    data: {
      email: 'sales@cdy.com',
      passwordHash,
      firstName: 'Zara',
      lastName: 'Ndlovu',
      role: Role.SALES_AGENT,
    },
  });

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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

  void draftInvoice;
  void sentInvoice;
  void overdueInvoice;
  void salesAgent;

  process.stdout.write(
    'Seed complete: ceo@cdy.com, finance@cdy.com, sales@cdy.com (password: CDY@2026!)\n',
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
