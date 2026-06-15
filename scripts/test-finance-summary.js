const { PrismaClient, InvoiceStatus, PaymentPlanStatus, ReconciliationStatus, RetainerStatus } = require('@prisma/client');
const { addDays } = require('date-fns');

const prisma = new PrismaClient();

async function run(name, fn) {
  try {
    const result = await fn();
    console.log(`OK ${name}:`, typeof result === 'object' ? JSON.stringify(result).slice(0, 120) : result);
  } catch (err) {
    console.error(`FAIL ${name}:`, err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  }
}

async function main() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await run('sumInvoices', () =>
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { deletedAt: null, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } },
    }),
  );

  await run('sumOutstandingBalance', () =>
    prisma.$queryRaw`
      SELECT COALESCE(SUM(
        i.total - COALESCE(
          (SELECT SUM(p.amount) FROM "Payment" p
           WHERE p."invoiceId" = i.id AND p."deletedAt" IS NULL),
          0
        )
      ), 0) AS total
      FROM "Invoice" i
      WHERE i."deletedAt" IS NULL
        AND i.status NOT IN ('PAID', 'WRITTEN_OFF', 'DRAFT')
    `,
  );

  await run('countPendingCommissions', () =>
    prisma.commissionRecord.count({
      where: {
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        status: 'PENDING',
      },
    }),
  );

  await run('countActivePaymentPlans', () =>
    prisma.paymentPlan.count({ where: { status: PaymentPlanStatus.ACTIVE } }),
  );

  await run('countPendingReconciliations', () =>
    prisma.bankStatement.count({ where: { status: ReconciliationStatus.IN_PROGRESS } }),
  );

  await run('countRetainersUpForRenewal', () =>
    prisma.retainerContract.count({
      where: {
        status: RetainerStatus.ACTIVE,
        endDate: { lte: addDays(new Date(), 30), not: null },
      },
    }),
  );

  await run('computeTaxOwed', async () => {
    const taxCollected = await prisma.invoice.aggregate({
      where: {
        status: InvoiceStatus.PAID,
        paidAt: { gte: currentMonthStart, lte: currentMonthEnd },
        taxAmount: { gt: 0 },
        deletedAt: null,
      },
      _sum: { taxAmount: true },
    });
    return taxCollected;
  });

  await run('ventureMtd', async () => {
    const [activeCount, incomeAgg, expenseAgg] = await Promise.all([
      prisma.venture.count({ where: { isActive: true } }),
      prisma.ventureIncome.aggregate({
        where: { date: { gte: currentMonthStart, lte: currentMonthEnd }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.ventureExpense.aggregate({
        where: { date: { gte: currentMonthStart, lte: currentMonthEnd }, deletedAt: null },
        _sum: { ventureAmount: true },
      }),
    ]);
    return { activeCount, incomeAgg, expenseAgg };
  });

  await run('cashFlow bills PARTIALLY_PAID', () =>
    prisma.bill.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        deletedAt: null,
      },
    }),
  );
}

main().finally(() => prisma.$disconnect());
