'use client';

interface TrendBadgeProps {
  value: number;
}

export function TrendBadge({ value }: TrendBadgeProps): JSX.Element {
  const isPositive = value >= 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-sm font-medium ${
        isPositive ? 'text-[var(--cdy-success)]' : 'text-[var(--cdy-danger)]'
      }`}
    >
      {isPositive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}
