import type { BillStatus } from '@cdy/shared';

export interface BillFilters {
  status?: BillStatus;
  overdue?: boolean;
  page?: number;
  limit?: number;
}
