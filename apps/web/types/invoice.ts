export type {
  InvoiceRecord,
  InvoiceDetail,
  InvoicePayment,
  PaginatedInvoices,
  LineItem,
} from '@cdy/shared';

export interface InvoiceFilters {
  status?: string[];
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  ventureId?: string;
  page?: number;
  limit?: number;
}

export interface CreateInvoicePayload {
  clientId: string;
  projectId?: string;
  currency?: string;
  dueDate: string;
  taxRate?: number;
  notes?: string;
  ventureId?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}
