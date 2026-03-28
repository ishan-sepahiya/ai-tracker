"use client";

export default function LineChart(props: {
  points: Array<{ x: string; y: number }>;
  height?: number;
  stroke?: string;
}) {
  const { points, height = 220, stroke = '#3C6E71' } = props;
  const width = 680;

  const ys = points.map((p) => p.y).filter((n) => Number.isFinite(n));
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const span = maxY - minY <= 0 ? 1 : maxY - minY;

  const padLeft = 36;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 32;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  function xAt(i: number) {
    if (points.length <= 1) return padLeft;
    return padLeft + (i / (points.length - 1)) * innerW;
  }

  function yAt(y: number) {
    const t = (y - minY) / span;
    return padTop + (1 - t) * innerH;
  }

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(p.y).toFixed(2)}`)
    .join(" ");

  const last = points.at(-1);
  const lastLabel = last ? last.x.slice(5) : "";

  return (
    <div className="space-y-3">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = padTop + t * innerH;
          return (
            <line
              key={t}
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="#D9D9D9"
              strokeOpacity="0.3"
              strokeWidth="1"
            />
          );
        })}

        {/* Area */}
        {points.length ? (
          <path
            d={`${d} L ${xAt(points.length - 1)} ${padTop + innerH} L ${xAt(0)} ${padTop + innerH} Z`}
            fill="url(#line-fill)"
          />
        ) : null}

        {/* Line */}
        {points.length ? (
          <path d={d} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {/* Points */}
        {points.map((p, i) => (
          <g key={p.x}>
            <circle cx={xAt(i)} cy={yAt(p.y)} r={4} fill={stroke} stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" />
            <circle cx={xAt(i)} cy={yAt(p.y)} r={2} fill={stroke} />
          </g>
        ))}
      </svg>

      <div className="flex items-center justify-between text-xs text-[#D9D9D9]">
        <span title="Start date">{points[0]?.x ?? ""}</span>
        <span title="End date">{lastLabel ? `Last: ${lastLabel}` : ""}</span>
      </div>
    </div>
  );
}
