import type { ExpenseCategory } from '@cdy/shared';

export interface ExpenseFilters {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
