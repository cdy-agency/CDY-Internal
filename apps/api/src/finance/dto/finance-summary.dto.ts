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
  totalActiveEmployees!: number;
  totalMonthlyPayroll!: number;
  previousMonth!: FinanceSummaryMetrics;
}
