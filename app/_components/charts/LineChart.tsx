"use client";

import { useId, useMemo, useState } from "react";

type ChartPoint = {
  x: string;
  y: number;
};

export default function LineChart({
  points,
  height = 220,
  stroke = "#3C6E71",
  valueFormatter,
}: {
  points: ChartPoint[];
  height?: number;
  stroke?: string;
  valueFormatter?: (value: number) => string;
}) {
  const gradientId = useId().replace(/:/g, "");

  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const width = 680;

  const safePoints = useMemo(
    () =>
      points.filter(
        (point) =>
          typeof point.x === "string" &&
          Number.isFinite(point.y),
      ),
    [points],
  );

  const ys = safePoints.map(
    (point) => point.y,
  );

  const minY = ys.length
    ? Math.min(...ys)
    : 0;

  const maxY = ys.length
    ? Math.max(...ys)
    : 1;

  const span =
    maxY - minY <= 0
      ? 1
      : maxY - minY;

  const padLeft = 44;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;

  const innerW =
    width - padLeft - padRight;

  const innerH =
    height - padTop - padBottom;

  function xAt(index: number) {
    if (safePoints.length <= 1) {
      return padLeft;
    }

    return (
      padLeft +
      (index /
        (safePoints.length - 1)) *
        innerW
    );
  }

  function yAt(value: number) {
    const t =
      (value - minY) / span;

    return (
      padTop +
      (1 - t) * innerH
    );
  }

  const linePath = safePoints
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xAt(
          index,
        ).toFixed(2)} ${yAt(
          point.y,
        ).toFixed(2)}`,
    )
    .join(" ");

  const areaPath = safePoints.length
    ? `${linePath} L ${xAt(
        safePoints.length - 1,
      )} ${padTop + innerH} L ${xAt(
        0,
      )} ${padTop + innerH} Z`
    : "";

  const activePoint =
    activeIndex !== null
      ? safePoints[activeIndex]
      : null;

  const tooltipLeft =
    activeIndex !== null &&
    safePoints.length > 1
      ? Math.min(
          88,
          Math.max(
            12,
            (activeIndex /
              (safePoints.length - 1)) *
              100,
          ),
        )
      : 50;

  const formatValue =
    valueFormatter ??
    ((value: number) =>
      value.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 4,
        },
      ));

  function handleMouseMove(
    event: React.MouseEvent<SVGSVGElement>,
  ) {
    if (!safePoints.length) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const relativeX =
      event.clientX - rect.left;

    const viewBoxX =
      (relativeX / rect.width) *
      width;

    const rawIndex =
      ((viewBoxX - padLeft) /
        innerW) *
      (safePoints.length - 1);

    const nearestIndex =
      Math.round(
        Math.max(
          0,
          Math.min(
            safePoints.length - 1,
            rawIndex,
          ),
        ),
      );

    setActiveIndex(
      nearestIndex,
    );
  }

  function handleMouseLeave() {
    setActiveIndex(null);
  }

  return (
    <div className="relative space-y-3">
      {/* TOOLTIP */}

      {activePoint ? (
        <div
          className="pointer-events-none absolute top-2 z-20 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `${tooltipLeft}%`,
          }}
        >
          <p className="whitespace-nowrap text-xs font-medium text-slate-500">
            {activePoint.x}
          </p>

          <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-slate-950">
            {formatValue(
              activePoint.y,
            )}
          </p>
        </div>
      ) : null}

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="overflow-visible"
      >
        <defs>
          <linearGradient
            id={`line-fill-${gradientId}`}
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={stroke}
              stopOpacity="0.22"
            />

            <stop
              offset="100%"
              stopColor={stroke}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* HORIZONTAL GRID */}

        {[0, 0.25, 0.5, 0.75, 1].map(
          (t) => {
            const y =
              padTop +
              t * innerH;

            return (
              <line
                key={t}
                x1={padLeft}
                x2={
                  width -
                  padRight
                }
                y1={y}
                y2={y}
                stroke="#CBD5E1"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
            );
          },
        )}

        {/* Y AXIS LABELS */}

        {[0, 0.5, 1].map(
          (t) => {
            const value =
              maxY -
              t * span;

            const y =
              padTop +
              t * innerH;

            return (
              <text
                key={t}
                x={4}
                y={y + 4}
                fontSize="10"
                fill="#94A3B8"
              >
                {formatValue(value)}
              </text>
            );
          },
        )}

        {/* AREA */}

        {safePoints.length > 1 ? (
          <path
            d={areaPath}
            fill={`url(#line-fill-${gradientId})`}
          />
        ) : null}

        {/* LINE */}

        {safePoints.length > 1 ? (
          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* ACTIVE GUIDE */}

        {activeIndex !==
          null &&
        activePoint ? (
          <>
            <line
              x1={xAt(
                activeIndex,
              )}
              x2={xAt(
                activeIndex,
              )}
              y1={padTop}
              y2={
                padTop +
                innerH
              }
              stroke={stroke}
              strokeOpacity="0.18"
              strokeDasharray="4 4"
            />

            <circle
              cx={xAt(
                activeIndex,
              )}
              cy={yAt(
                activePoint.y,
              )}
              r="8"
              fill={stroke}
              fillOpacity="0.12"
            />

            <circle
              cx={xAt(
                activeIndex,
              )}
              cy={yAt(
                activePoint.y,
              )}
              r="5"
              fill="#FFFFFF"
              stroke={stroke}
              strokeWidth="3"
            />
          </>
        ) : null}

        {/* DATA POINTS */}

        {safePoints.map(
          (point, index) => {
            const active =
              activeIndex ===
              index;

            return (
              <circle
                key={`${point.x}-${index}`}
                cx={xAt(index)}
                cy={yAt(point.y)}
                r={
                  active
                    ? 5
                    : 3.5
                }
                fill={
                  active
                    ? "#FFFFFF"
                    : stroke
                }
                stroke={
                  stroke
                }
                strokeWidth={
                  active
                    ? 3
                    : 2
                }
                className="transition-all duration-150"
              />
            );
          },
        )}
      </svg>

      {/* X AXIS LABELS */}

      <div className="flex items-center justify-between px-11 text-[11px] text-slate-400">
        <span>
          {safePoints[0]
            ?.x ?? ""}
        </span>

        {safePoints.length >
        2 ? (
          <span>
            {
              safePoints[
                Math.floor(
                  (safePoints.length -
                    1) /
                    2,
                )
              ]?.x
            }
          </span>
        ) : null}

        <span>
          {safePoints.at(
            -1,
          )?.x ?? ""}
        </span>
      </div>

      {!safePoints.length ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-400">
            No data available
          </p>
        </div>
      ) : null}
    </div>
  );
}