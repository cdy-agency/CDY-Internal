import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  format,
} from 'date-fns';
import type { DatePreset } from '@/components/finance/reports/ReportFilterBar';

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function buildPlPresets(): DatePreset[] {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonth = subMonths(now, 1);
  const qStart = startOfQuarter(now);
  const qEnd = endOfQuarter(now);
  const yearStart = startOfYear(now);

  return [
    {
      id: 'this-month',
      label: 'This Month',
      from: fmt(monthStart),
      to: fmt(now),
    },
    {
      id: 'last-month',
      label: 'Last Month',
      from: fmt(startOfMonth(lastMonth)),
      to: fmt(endOfMonth(lastMonth)),
    },
    {
      id: 'this-quarter',
      label: 'This Quarter',
      from: fmt(qStart),
      to: fmt(now),
    },
    {
      id: 'ytd',
      label: 'YTD',
      from: fmt(yearStart),
      to: fmt(now),
    },
    {
      id: 'custom',
      label: 'Custom',
      from: fmt(monthStart),
      to: fmt(monthEnd),
    },
  ];
}

export const SERVICE_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software_dev', label: 'Software Dev' },
  { value: 'branding', label: 'Branding' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'sales_services', label: 'Sales Services' },
] as const;

export function serviceTypeLabel(value: string): string {
  const found = SERVICE_TYPE_OPTIONS.find((o) => o.value === value);
  return found?.label ?? value.replace(/_/g, ' ');
}

export function currentMonthKey(): string {
  return format(new Date(), 'yyyy-MM');
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return format(d, 'yyyy-MM');
}

export function buildCrmReportPresets(): DatePreset[] {
  return buildPlPresets();
}

export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMMM yyyy');
}

export function crmFiltersToParams(filters: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  }
  return params;
}
