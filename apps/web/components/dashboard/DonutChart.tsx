'use client';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
}

export function DonutChart({
  segments,
  size = 140,
  thickness = 28,
}: DonutChartProps): JSX.Element {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;

  let offset = -90;
  const paths = total > 0
    ? segments
        .filter((seg) => seg.value > 0)
        .map((seg, i) => {
          const pct = seg.value / total;
          const angle = pct * 360;
          const start = offset;
          const end = offset + angle;
          offset += angle;

          const toRad = (deg: number): number => (deg * Math.PI) / 180;
          const x1 = cx + r * Math.cos(toRad(start));
          const y1 = cy + r * Math.sin(toRad(start));
          const x2 = cx + r * Math.cos(toRad(end));
          const y2 = cy + r * Math.sin(toRad(end));
          const large = angle > 180 ? 1 : 0;

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
            />
          );
        })
    : [];

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth={thickness}
        />
        {paths}
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-cdy-muted">{seg.label}</span>
            <span className="ml-auto font-mono font-medium text-cdy-white">
              {total > 0
                ? `${((seg.value / total) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
