import { FinanceSummaryMetrics } from '@cdy/shared';

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
}
