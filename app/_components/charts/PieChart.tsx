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

  // Sweep flag 1 draws clockwise in SVG with our angle convention.
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
  const { title, data, size = 180 } = props;
  const total = data.reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.26;

  let angle = -Math.PI / 2; // start at top

  const slices = total <= 0 ? [] : data.map((slice) => {
    const value = Number.isFinite(slice.value) ? slice.value : 0;
    const pct = value / total;
    const start = angle;
    const end = angle + pct * Math.PI * 2;
    angle = end;
    return {
      ...slice,
      start,
      end,
    };
  });

  return (
    <div className="space-y-4">
      {title ? <div className="text-sm text-zinc-400">{title}</div> : null}

      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="#27272a" strokeWidth={outerR-innerR} />
            {slices.map((s) => (
              <path
                key={s.label}
                d={describeDonutArc({
                  cx,
                  cy,
                  outerR,
                  innerR,
                  startAngleRad: s.start,
                  endAngleRad: s.end,
                })}
                fill={s.color}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-zinc-100">
                {total > 0 ? "$" : ""}
                {total.toFixed(0)}
              </div>
              <div className="text-xs text-zinc-500">Total</div>
            </div>
          </div>
        </div>

        <div className="space-y-2 flex-1">
          {data
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((s) => {
              const pct = total > 0 ? (s.value / total) * 100 : 0;
              return (
                <div key={s.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-zinc-200 truncate max-w-[180px]">{s.label}</span>
                  </div>
                  <div className="text-sm text-zinc-300 tabular-nums">
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

