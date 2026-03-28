"use client";

type PieSlice = {
  label: string;
  value: number;
  color: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeDonutArc(params: {
  cx: number;
  cy: number;
  outerR: number;
  innerR: number;
  startAngleRad: number;
  endAngleRad: number;
}) {
  const { cx, cy, outerR, innerR, startAngleRad, endAngleRad } = params;

  const startOuter = polarToCartesian(cx, cy, outerR, startAngleRad);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngleRad);
  const startInner = polarToCartesian(cx, cy, innerR, startAngleRad);
  const endInner = polarToCartesian(cx, cy, innerR, endAngleRad);

  const delta = endAngleRad - startAngleRad;
  const largeArc = delta % (Math.PI * 2) > Math.PI ? 1 : 0;

  const outerPath = `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`;
  const innerPath = `A ${innerR} ${innerR} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    outerPath,
    `L ${endInner.x} ${endInner.y}`,
    innerPath,
    "Z",
  ].join(" ");
}

export default function PieChart(props: {
  title?: string;
  data: PieSlice[];
  size?: number;
}) {
  const { title, data, size = 200 } = props;
  const total = data.reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.24;

  let angle = -Math.PI / 2;

  const slices = total <= 0 ? [] : data.map((slice) => {
    const value = Number.isFinite(slice.value) ? slice.value : 0;
    const pct = value / total;
    const start = angle;
    const end = angle + pct * Math.PI * 2;
    angle = end;
    return { ...slice, start, end };
  });

  return (
    <div className="space-y-4">
      {title ? (
        <div className="text-sm font-medium text-white/80" title={`Total spend by provider: $${total.toFixed(2)}`}>
          {title}
        </div>
      ) : null}

      <div className="flex items-center gap-6">
        <div className="relative group hover:scale-105 transition-transform duration-300">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
            <circle 
              cx={cx} 
              cy={cy} 
              r={(outerR + innerR) / 2} 
              fill="none" 
              stroke="#D9D9D9" 
              strokeWidth={outerR - innerR} 
              strokeOpacity="0.3"
            />
            {slices.map((s) => (
              <path
                key={s.label}
                d={describeDonutArc({
                  cx, cy, outerR, innerR, startAngleRad: s.start, endAngleRad: s.end,
                })}
                fill={s.color}
                stroke="#FFFFFF"
                strokeWidth="0.5"
                className="hover:scale-110 transition-transform duration-200"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center glass-card p-4 rounded-2xl">
              <div className="text-2xl font-bold text-white tabular-nums">
                {total > 0 ? `$${total.toFixed(0)}` : '$0'}
              </div>
              <div className="text-xs text-[#D9D9D9] uppercase tracking-wider">Total</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 flex-1 min-w-0">
          {data
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((s, i) => {
              const pct = total > 0 ? (s.value / total) * 100 : 0;
              return (
                <div 
                  key={s.label} 
                  className="flex items-center justify-between gap-3 group hover:bg-[#284B63]/20 p-2 rounded-xl transition-all duration-200"
                  title={`${s.label}: $${s.value.toFixed(2)} (${pct.toFixed(1)}%)`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-lg" 
                      style={{ backgroundColor: s.color }} 
                    />
                    <span className="text-sm text-white truncate">{s.label}</span>
                  </div>
                  <div className="text-sm font-mono text-[#D9D9D9] tabular-nums">
                    {pct.toFixed(0)}%
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
