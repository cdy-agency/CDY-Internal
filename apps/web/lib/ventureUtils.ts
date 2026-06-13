import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface DatePreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

export function buildVenturePresets(): DatePreset[] {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  return [
    {
      id: 'this-month',
      label: 'This month',
      from: format(thisMonthStart, 'yyyy-MM-dd'),
      to: format(thisMonthEnd, 'yyyy-MM-dd'),
    },
    {
      id: 'last-month',
      label: 'Last month',
      from: format(lastMonthStart, 'yyyy-MM-dd'),
      to: format(lastMonthEnd, 'yyyy-MM-dd'),
    },
    {
      id: 'ytd',
      label: 'Year to date',
      from: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'),
      to: format(now, 'yyyy-MM-dd'),
    },
  ];
}

export const VENTURE_COLOR_PRESETS = [
  { name: 'Indigo', value: '6366F1' },
  { name: 'Purple', value: '8B5CF6' },
  { name: 'Teal', value: '14B8A6' },
  { name: 'Orange', value: 'F59E0B' },
  { name: 'Pink', value: 'EC4899' },
  { name: 'Yellow', value: 'EAB308' },
  { name: 'Green', value: '22C55E' },
  { name: 'Red', value: 'EF4444' },
] as const;

export const INCOME_CATEGORIES = [
  'Sales',
  'Service Fee',
  'Commission',
  'Other',
] as const;

export function ventureColorHex(color: string): string {
  return color.startsWith('#') ? color : `#${color}`;
}

export function exportCsv(filename: string, headers: string[], rows: string[][]): void {
  const escape = (value: string): string =>
    `"${value.replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
