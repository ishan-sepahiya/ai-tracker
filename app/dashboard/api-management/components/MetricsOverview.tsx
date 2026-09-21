"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  ChevronDown,
  FolderKanban,
  Network,
  Server,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { OrganizationTree } from "@/lib/api-management/service";
import { getNewSince, getTotals } from "@/lib/api-management/stats";

const RANGES = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
] as const;

type Metric = {
  key: "organizations" | "departments" | "projects" | "environments";
  label: string;
  icon: LucideIcon;
  iconClass: string;
};

const METRICS: Metric[] = [
  {
    key: "organizations",
    label: "Total Organizations",
    icon: Building2,
    iconClass: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  {
    key: "departments",
    label: "Total Departments",
    icon: Network,
    iconClass: "bg-sky-50 text-sky-600 ring-sky-100",
  },
  {
    key: "projects",
    label: "Total Projects",
    icon: FolderKanban,
    iconClass: "bg-violet-50 text-violet-600 ring-violet-100",
  },
  {
    key: "environments",
    label: "Total Environments",
    icon: Server,
    iconClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
];

export default function MetricsOverview({
  organizations,
}: {
  organizations: OrganizationTree[];
}) {
  const [range, setRange] = useState<string>("30");
  const [now] = useState(() => Date.now());

  const totals = useMemo(() => getTotals(organizations), [organizations]);

  const selected = RANGES.find((r) => r.value === range) ?? RANGES[1];

  const added = useMemo(() => {
    const since = selected.days
      ? new Date(now - selected.days * 24 * 60 * 60 * 1000)
      : null;
    return getNewSince(organizations, since);
  }, [organizations, selected, now]);

  return (
    <section aria-label="Infrastructure overview" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Overview</h2>

        <label className="relative inline-flex items-center">
          <Calendar
            className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400"
            aria-hidden
          />
          <span className="sr-only">Date range</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm font-medium text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-dusk-blue focus:ring-2 focus:ring-dusk-blue/20"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400"
            aria-hidden
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map(({ key, label, icon: Icon, iconClass }) => {
          const delta = added[key];

          return (
            <div
              key={key}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${iconClass}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    delta > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                  title={`Created ${selected.label.toLowerCase()}`}
                >
                  {delta > 0 && <TrendingUp className="h-3 w-3" aria-hidden />}
                  {delta > 0 ? `+${delta}` : "No change"}
                </span>
              </div>

              <p className="mt-4 text-3xl font-semibold tracking-tight text-ink-black">
                {totals[key]}
              </p>
              <p className="mt-1 text-sm text-gray-500">{label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}