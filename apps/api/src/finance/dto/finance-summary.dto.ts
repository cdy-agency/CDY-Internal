import { FinanceSummaryMetrics, DataCutoffMeta } from '@cdy/shared';

export class FinanceSummaryDto implements FinanceSummaryMetrics {
  totalInvoiced!: number;
  totalCollected!: number;
  outstanding!: number;
  overdue!: number;
  totalExpenses!: number;
  netCashPosition!: number;
  totalDraftInvoices!: number;
  totalSentInvoices!: number;
  totalBillsPending!: number;
  totalBillsOverdue!: number;
  paymentsReceivedToday!: number;
  expensesThisWeek!: number;
  commissionsPending!: number;
  commissionsPendingValue!: number;
  activePaymentPlans!: number;
  creditNotesIssuedMTD!: number;
  creditNotesValueMTD!: number;
  pendingReconciliations!: number;
  totalMRR!: number;
  activeRetainers!: number;
  retainersUpForRenewal!: number;
  taxOwed!: number;
  blockedProjects!: number;
  totalClients!: number;
  newClientsThisMonth!: number;
  cashFlowAlert!: boolean;
  ventures!: {
    count: number;
    totalIncomeMTD: number;
    totalExpensesMTD: number;
  };
  totalActiveEmployees!: number;
  totalMonthlyPayroll!: number;
  previousMonth!: FinanceSummaryMetrics;
  // Dashboard aggregations
  revenueTrend!: number;
  collectionTrend!: number;
  outstandingTrend!: number;
  collectionRate!: number;
  monthlyRevenue!: number[];
  monthlyCollected!: number[];
  paidCount!: number;
  overdueCount!: number;
  partialCount!: number;
  expensesByCategory!: Array<{ category: string; amount: number }>;
  recentInvoices!: Array<{
    invoiceNumber: string;
    clientName: string;
    total: number;
    status: string;
  }>;
  topClients!: Array<{
    companyName: string;
    totalInvoiced: number;
    totalCollected: number;
    outstanding: number;
  }>;
  pendingLeaveRequests!: number;
  reserve!: {
    balance: number;
    currency: string;
    depositsThisMonth: number;
    withdrawalsThisMonth: number;
  };
  // Finance improvements — income overview
  directIncomeMTD?: number;
  totalIncome?: number;
  difference?: number;
  // Date-range filtered totals (returned when dateFrom/dateTo params supplied)
  rangeIncome?: number;
  rangeExpenses?: number;
  rangeBalance?: number;
  recentDueBills?: Array<{
    id: string;
    vendorName: string;
    amount: number;
    currency: string;
    dueDate: string;
    daysUntilDue: number;
  }>;
  monthlyComparison?: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  recentIncomeTransactions?: Array<{
    id: string;
    type: 'payment' | 'direct';
    description: string;
    clientName: string;
    amount: number;
    method: string;
    date: string;
  }>;
  recentExpenseTransactions?: Array<{
    id: string;
    vendorName: string;
    category: string;
    amount: number;
    currency: string;
    paymentMethod: string | null;
    date: string;
  }>;
  charts!: {
    incomeByService: Array<{
      service: string;
      label: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
    expenseByCategory: Array<{
      category: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
    paymentByMethod: Array<{
      method: string;
      label: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
    paymentMethodSummary: Array<{
      method: string;
      label: string;
      color: string;
      income: { amount: number; count: number };
      expenses: { amount: number; count: number };
      net: number;
    }>;
    totals: {
      income: number;
      expenses: number;
      payments: number;
    };
  };
  meta!: DataCutoffMeta;
}
