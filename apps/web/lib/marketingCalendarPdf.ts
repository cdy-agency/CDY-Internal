import { addDays, format, getISOWeek } from 'date-fns';
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

/** e.g. "Week-31-Jul-27-to-Aug-02-2026" — mirrors CalendarPdfService.weekFilenamePart on the backend. */
function weekFilenamePart(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const weekNumber = getISOWeek(weekStart);
  return `Week-${weekNumber}-${format(weekStart, 'MMM-dd')}-to-${format(weekEnd, 'MMM-dd-yyyy')}`;
}

export async function downloadClientCalendarPdf(
  clientId: string,
  clientName: string,
  weekStart: Date,
): Promise<void> {
  const week = format(weekStart, 'yyyy-MM-dd');
  const safeName = clientName.replace(/[^a-z0-9]+/gi, '-');
  await downloadBlob(
    `/marketing/clients/${clientId}/calendar/pdf?week=${week}`,
    `${safeName}-${weekFilenamePart(weekStart)}.pdf`,
  );
}

export async function downloadAllClientsCalendarPdf(weekStart: Date): Promise<void> {
  const week = format(weekStart, 'yyyy-MM-dd');
  await downloadBlob(
    `/marketing/calendar/pdf?week=${week}`,
    `Content-Calendar-${weekFilenamePart(weekStart)}.pdf`,
  );
}
