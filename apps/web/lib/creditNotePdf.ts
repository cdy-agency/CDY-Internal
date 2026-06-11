import api from '@/lib/api';

export async function downloadCreditNotePdf(
  creditNoteId: string,
  creditNoteNumber: string,
): Promise<void> {
  const response = await api.get(`/credit-notes/${creditNoteId}/pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${creditNoteNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
