'use client';

interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  items: BarChartItem[];
  formatValue?: (v: number) => string;
}

export function BarChart({ items, formatValue }: BarChartProps): JSX.Element {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-cdy-muted">{item.label}</span>
            <span className="font-mono text-cdy-white">
              {formatValue ? formatValue(item.value) : String(item.value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? '#C41E3A',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
