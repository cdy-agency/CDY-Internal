import api from '@/lib/api';

export async function downloadInvoicePdf(
  invoiceId: string,
  invoiceNumber: string,
): Promise<void> {
  const response = await api.get(`/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
