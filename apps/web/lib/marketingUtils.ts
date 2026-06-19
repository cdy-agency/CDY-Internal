import { ContentStatus } from '@cdy/shared';

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

export const STATUS_CONFIG: Record<ContentStatus, StatusConfig> = {
  [ContentStatus.DRAFT]: {
    label: 'Draft',
    color: 'text-slate-400',
    bg: 'bg-slate-900',
    dot: '#94a3b8',
  },
  [ContentStatus.READY]: {
    label: 'Ready',
    color: 'text-blue-400',
    bg: 'bg-blue-950',
    dot: '#60a5fa',
  },
  [ContentStatus.APPROVED]: {
    label: 'Approved',
    color: 'text-green-400',
    bg: 'bg-green-950',
    dot: '#4ade80',
  },
  [ContentStatus.PUBLISHED]: {
    label: 'Published',
    color: 'text-cdy-red',
    bg: 'bg-red-950/50',
    dot: '#C41E3A',
  },
  [ContentStatus.REJECTED]: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-950',
    dot: '#f87171',
  },
  [ContentStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'text-cdy-muted',
    bg: 'bg-cdy-navy',
    dot: '#64748b',
  },
};

export const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.DRAFT]: [ContentStatus.READY, ContentStatus.CANCELLED],
  [ContentStatus.READY]: [
    ContentStatus.APPROVED,
    ContentStatus.REJECTED,
    ContentStatus.DRAFT,
    ContentStatus.CANCELLED,
  ],
  [ContentStatus.APPROVED]: [ContentStatus.PUBLISHED, ContentStatus.CANCELLED],
  [ContentStatus.REJECTED]: [ContentStatus.DRAFT, ContentStatus.CANCELLED],
  [ContentStatus.PUBLISHED]: [],
  [ContentStatus.CANCELLED]: [],
};

export const STATUS_ACTION_LABELS: Partial<Record<ContentStatus, string>> = {
  [ContentStatus.READY]: 'Mark Ready',
  [ContentStatus.APPROVED]: 'Approve',
  [ContentStatus.PUBLISHED]: 'Mark Published',
  [ContentStatus.REJECTED]: 'Reject',
  [ContentStatus.DRAFT]: 'Move to Draft',
  [ContentStatus.CANCELLED]: 'Cancel',
};

export function deliveryRateColor(rate: number): string {
  if (rate >= 90) return 'text-green-400';
  if (rate >= 70) return 'text-amber-400';
  return 'text-red-400';
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string): string {
  const [year, mon] = month.split('-');
  const d = new Date(parseInt(year), parseInt(mon) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function prevMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(year, mon - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(year, mon, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function platformShort(platform: string): string {
  const map: Record<string, string> = {
    instagram: 'IG',
    facebook: 'FB',
    linkedin: 'LI',
    tiktok: 'TK',
    twitter: 'TW',
  };
  return map[platform] ?? platform.toUpperCase().slice(0, 2);
}
