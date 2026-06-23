'use client';

import type { ReactNode } from 'react';
import { TrendBadge } from './TrendBadge';
import { QualityBadge } from './QualityBadge';

type BadgeVariant = 'green' | 'blue' | 'amber' | 'red' | 'gray';

interface MetricHeroProps {
  value: string | number;
  label: string;
  trend?: number;
  trendLabel?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  icon?: ReactNode;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  lg: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
  md: 'text-base sm:text-xl md:text-2xl lg:text-3xl',
  sm: 'text-sm sm:text-lg md:text-xl lg:text-2xl',
} as const;

export function MetricHero({
  value,
  label,
  trend,
  trendLabel,
  badge,
  badgeVariant,
  isLoading,
  size = 'lg',
}: MetricHeroProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-2 h-10 w-32 rounded bg-cdy-navy" />
        <div className="h-3 w-40 rounded bg-cdy-navy" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex flex-wrap items-baseline gap-2 min-w-0">
        <span className={`${SIZES[size]} font-bold tracking-tight text-cdy-white font-mono whitespace-nowrap overflow-hidden text-ellipsis min-w-0`}>
          {value}
        </span>
        {trend !== undefined && <TrendBadge value={trend} />}
        {badge && <QualityBadge label={badge} variant={badgeVariant} />}
      </div>
      <span className="text-sm text-cdy-muted">{label}</span>
      {trendLabel && (
        <span className="text-xs text-cdy-dim">{trendLabel}</span>
      )}
    </div>
  );
}
