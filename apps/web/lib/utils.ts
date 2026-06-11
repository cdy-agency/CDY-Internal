import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculateDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function getApiBaseUrl(): string {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3251/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

export function getUploadUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
