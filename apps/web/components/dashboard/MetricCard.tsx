'use client';

import { TrendBadge } from './TrendBadge';

interface MetricCardProps {
  value: string | number;
  label: string;
  trend?: number;
  trendLabel?: string;
  isLoading?: boolean;
}

export function MetricCard({
  value,
  label,
  trend,
  trendLabel,
  isLoading,
}: MetricCardProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-5">
        <div className="mb-2 h-8 w-24 rounded bg-cdy-navy" />
        <div className="h-3 w-32 rounded bg-cdy-navy" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-bold font-mono tracking-tight text-cdy-white">
          {value}
        </span>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <p className="mt-1 text-sm text-cdy-muted">{label}</p>
      {trendLabel && (
        <p className="mt-0.5 text-xs text-cdy-dim">{trendLabel}</p>
      )}
    </div>
  );
}
