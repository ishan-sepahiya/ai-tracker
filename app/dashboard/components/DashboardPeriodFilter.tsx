"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type Period = "7d" | "30d" | "90d";

const options: Array<{
  value: Period;
  label: string;
}> = [
  {
    value: "7d",
    label: "7 Days",
  },
  {
    value: "30d",
    label: "30 Days",
  },
  {
    value: "90d",
    label: "90 Days",
  },
];

export default function DashboardPeriodFilter({
  value,
}: {
  value: Period;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectPeriod(period: Period) {
    const params = new URLSearchParams(
      searchParams,
    );

    if (period === "30d") {
      params.delete("period");
    } else {
      params.set(
        "period",
        period,
      );
    }

    const query = params.toString();

    router.replace(
      query
        ? `${pathname}?${query}`
        : pathname,
      {
        scroll: false,
      },
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1"
      aria-label="Dashboard date range"
    >
      {options.map(
        (option) => {
          const active =
            option.value ===
            value;

          return (
            <button
              key={
                option.value
              }
              type="button"
              aria-pressed={
                active
              }
              onClick={() =>
                selectPeriod(
                  option.value,
                )
              }
              className={[
                "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all sm:px-4",
                active
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-slate-900",
              ].join(" ")}
            >
              {
                option.label
              }
            </button>
          );
        },
      )}
    </div>
  );
}