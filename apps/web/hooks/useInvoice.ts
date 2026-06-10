'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, InvoiceDetail } from '@cdy/shared';

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async (): Promise<InvoiceDetail> => {
      const response = await api.get<ApiResponse<InvoiceDetail>>(`/invoices/${id}`);
      return response.data.data;
    },
    enabled: Boolean(id),
  });
}
