import type { PaymentMethod } from '@cdy/shared';

export interface PaymentFilters {
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  method?: PaymentMethod;
  page?: number;
  limit?: number;
}
