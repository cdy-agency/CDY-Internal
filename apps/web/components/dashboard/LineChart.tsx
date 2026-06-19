'use client';

interface LineChartSeries {
  label: string;
  color: string;
  data: number[];
}

interface LineChartProps {
  series: LineChartSeries[];
  labels: string[];
  height?: number;
}

export function LineChart({
  series,
  labels,
  height = 120,
}: LineChartProps): JSX.Element {
  const width = 400;
  const padding = { top: 10, right: 10, bottom: 24, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.data);
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 100;
  const minVal = rawMin * 0.9;
  const maxVal = rawMax > minVal ? rawMax * 1.1 : minVal + 100;
  const range = maxVal - minVal;

  const xScale = (i: number): number =>
    labels.length > 1 ? (i / (labels.length - 1)) * chartW : chartW / 2;
  const yScale = (v: number): number =>
    range > 0 ? chartH - ((v - minVal) / range) * chartH : chartH / 2;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
      >
        <g transform={`translate(${padding.left},${padding.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line
              key={i}
              x1={0}
              y1={chartH * t}
              x2={chartW}
              y2={chartH * t}
              stroke="#1e3a5f"
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          ))}

          {series.map((s, si) => {
            const points = s.data
              .map((v, i) => `${xScale(i)},${yScale(v)}`)
              .join(' ');
            return (
              <g key={si}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {s.data.map((v, i) => (
                  <circle
                    key={i}
                    cx={xScale(i)}
                    cy={yScale(v)}
                    r={3}
                    fill={s.color}
                  />
                ))}
              </g>
            );
          })}

          {labels.map((l, i) => (
            <text
              key={i}
              x={xScale(i)}
              y={chartH + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
            >
              {l}
            </text>
          ))}
        </g>
      </svg>

      <div className="mt-2 flex flex-wrap gap-4">
        {series.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-xs text-cdy-muted"
          >
            <div className="h-0.5 w-6" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
