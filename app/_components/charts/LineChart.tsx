"use client";

export default function LineChart(props: {
  points: Array<{ x: string; y: number }>;
  height?: number;
  stroke?: string;
}) {
  const { points, height = 220, stroke = "#a1a1aa" } = props;
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
    <div className="space-y-2">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 1, 2, 3].map((i) => {
          const y = padTop + (i / 3) * innerH;
          return (
            <line
              key={i}
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="#3f3f46"
              strokeOpacity="0.35"
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
        <path d={d} fill="none" stroke={stroke} strokeWidth="2.5" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={p.x} cx={xAt(i)} cy={yAt(p.y)} r={3.2} fill={stroke} stroke="#09090b" strokeWidth="2" />
        ))}
      </svg>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{points[0]?.x ?? ""}</span>
        <span>{lastLabel ? `Last: ${lastLabel}` : ""}</span>
      </div>
    </div>
  );
}

