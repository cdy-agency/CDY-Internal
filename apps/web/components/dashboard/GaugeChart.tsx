'use client';

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
}

export function GaugeChart({
  value,
  max = 100,
  label,
}: GaugeChartProps): JSX.Element {
  const pct = Math.min(value / max, 1);
  const color =
    pct >= 0.8 ? '#4ADE80' : pct >= 0.6 ? '#FBBF24' : '#F87171';
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circumference = Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={140} height={80} viewBox="0 0 140 80">
        <path
          d={`M 16 70 A ${r} ${r} 0 0 1 124 70`}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d={`M 16 70 A ${r} ${r} 0 0 1 124 70`}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text
          x={70}
          y={65}
          textAnchor="middle"
          fontSize={22}
          fontWeight="bold"
          fill="#f8fafc"
          fontFamily="monospace"
        >
          {value}
        </text>
      </svg>
      {label && (
        <span className="text-xs text-cdy-muted">{label}</span>
      )}
      <div className="flex w-full justify-between text-xs text-cdy-dim">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
