import type { ExpenseCategory } from '@cdy/shared';

export interface ExpenseFilters {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  ventureId?: string;
  page?: number;
  limit?: number;
}
