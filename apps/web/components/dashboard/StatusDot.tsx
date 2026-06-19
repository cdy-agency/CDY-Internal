'use client';

const COLORS = {
  active: '#10b981',
  inactive: '#475569',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const;

type DotStatus = keyof typeof COLORS;

interface StatusDotProps {
  status: DotStatus;
  label: string;
}

export function StatusDot({ status, label }: StatusDotProps): JSX.Element {
  return (
    <span className="flex items-center gap-1.5 text-sm text-cdy-muted">
      <span
        className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: COLORS[status] }}
      />
      {label}
    </span>
  );
}
