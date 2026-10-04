"use client";

import { useState } from "react";

type PieSlice = {
  label: string;
  value: number;
  color: string;
};

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number,
) {
  return {
    x:
      cx +
      radius * Math.cos(angleRad),

    y:
      cy +
      radius * Math.sin(angleRad),
  };
}

function describeDonutArc({
  cx,
  cy,
  outerR,
  innerR,
  startAngleRad,
  endAngleRad,
}: {
  cx: number;
  cy: number;
  outerR: number;
  innerR: number;
  startAngleRad: number;
  endAngleRad: number;
}) {
  const startOuter =
    polarToCartesian(
      cx,
      cy,
      outerR,
      startAngleRad,
    );

  const endOuter =
    polarToCartesian(
      cx,
      cy,
      outerR,
      endAngleRad,
    );

  const startInner =
    polarToCartesian(
      cx,
      cy,
      innerR,
      startAngleRad,
    );

  const endInner =
    polarToCartesian(
      cx,
      cy,
      innerR,
      endAngleRad,
    );

  const delta =
    endAngleRad -
    startAngleRad;

  const largeArc =
    delta > Math.PI ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

export default function PieChart({
  title,
  data,
  size = 200,
}: {
  title?: string;
  data: PieSlice[];
  size?: number;
}) {
  const [activeLabel, setActiveLabel] =
    useState<string | null>(null);

  const safeData = data.filter(
    (slice) =>
      Number.isFinite(
        slice.value,
      ) &&
      slice.value > 0,
  );

  const total =
    safeData.reduce(
      (sum, slice) =>
        sum +
        Number(
          slice.value,
        ),
      0,
    );

  const cx = size / 2;
  const cy = size / 2;

  const outerR =
    size * 0.42;

  const innerR =
    size * 0.25;

  let angle =
    -Math.PI / 2;

  const slices =
    total > 0
      ? safeData.map(
          (slice) => {
            const percentage =
              slice.value /
              total;

            const start =
              angle;

            const end =
              angle +
              percentage *
                Math.PI *
                2;

            angle = end;

            return {
              ...slice,
              start,
              end,
              percentage,
            };
          },
        )
      : [];

  const activeSlice =
    slices.find(
      (slice) =>
        slice.label ===
        activeLabel,
    );

  return (
    <div className="space-y-4">
      {title ? (
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Cost distribution
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* DONUT */}

        <div className="relative shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="Pie chart"
            className="overflow-visible"
          >
            {/* BACKGROUND RING */}

            <circle
              cx={cx}
              cy={cy}
              r={
                (outerR +
                  innerR) /
                2
              }
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={
                outerR -
                innerR
              }
            />

            {/* SLICES */}

            {slices.map(
              (slice) => {
                const active =
                  activeLabel ===
                  slice.label;

                return (
                  <path
                    key={
                      slice.label
                    }
                    d={describeDonutArc(
                      {
                        cx,
                        cy,
                        outerR:
                          active
                            ? outerR +
                              4
                            : outerR,
                        innerR,
                        startAngleRad:
                          slice.start,
                        endAngleRad:
                          slice.end,
                      },
                    )}
                    fill={
                      slice.color
                    }
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    onMouseEnter={() =>
                      setActiveLabel(
                        slice.label,
                      )
                    }
                    onMouseLeave={() =>
                      setActiveLabel(
                        null,
                      )
                    }
                    className="cursor-pointer transition-all duration-150"
                  />
                );
              },
            )}
          </svg>

          {/* CENTER */}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {activeSlice ? (
                <>
                  <p className="max-w-[100px] truncate text-xs font-medium text-slate-500">
                    {
                      activeSlice.label
                    }
                  </p>

                  <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                    $
                    {activeSlice.value.toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {(
                      activeSlice.percentage *
                      100
                    ).toFixed(
                      1,
                    )}
                    %
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">
                    $
                    {total.toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      },
                    )}
                  </p>

                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Total
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* LEGEND */}

        <div className="min-w-0 flex-1 space-y-2">
          {safeData
            .slice()
            .sort(
              (a, b) =>
                b.value -
                a.value,
            )
            .map(
              (slice) => {
                const percentage =
                  total > 0
                    ? (slice.value /
                        total) *
                      100
                    : 0;

                const active =
                  activeLabel ===
                  slice.label;

                return (
                  <div
                    key={
                      slice.label
                    }
                    onMouseEnter={() =>
                      setActiveLabel(
                        slice.label,
                      )
                    }
                    onMouseLeave={() =>
                      setActiveLabel(
                        null,
                      )
                    }
                    className={[
                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-all",
                      active
                        ? "bg-slate-50"
                        : "hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            slice.color,
                        }}
                      />

                      <span className="truncate text-sm font-medium text-slate-700">
                        {
                          slice.label
                        }
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {percentage.toFixed(
                          0,
                        )}
                        %
                      </p>

                      <p className="text-[11px] text-slate-400">
                        $
                        {slice.value.toLocaleString(
                          "en-US",
                          {
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>
                  </div>
                );
              },
            )}

          {!safeData.length ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-600">
                No provider data
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Cost distribution will appear here once usage is recorded.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}