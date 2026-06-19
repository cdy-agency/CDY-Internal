'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  color = '#C41E3A',
}: ProgressBarProps): JSX.Element {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-cdy-muted">{label}</span>
          <span className="font-mono text-cdy-white">{value}</span>
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
