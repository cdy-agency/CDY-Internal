import api from '@/lib/api';

async function downloadBlob(url: string, filename: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

/** week: an ISO date (YYYY-MM-DD) anywhere in the target week; defaults to the current week. */
export async function downloadClientCalendarPdf(
  clientId: string,
  clientName: string,
  week?: string,
): Promise<void> {
  const qs = week ? `?week=${week}` : '';
  const safeName = clientName.replace(/[^a-z0-9]+/gi, '-');
  await downloadBlob(
    `/marketing/clients/${clientId}/calendar/pdf${qs}`,
    `${safeName}-content-calendar.pdf`,
  );
}

export async function downloadAllClientsCalendarPdf(week?: string): Promise<void> {
  const qs = week ? `?week=${week}` : '';
  await downloadBlob(
    `/marketing/calendar/pdf${qs}`,
    `content-calendar${week ? `-${week}` : ''}.pdf`,
  );
}
