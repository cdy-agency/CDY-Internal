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
  previousMonth!: FinanceSummaryMetrics;
}
