"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  aggregateByProvider,
  compareProviderCosts,
  computeForecast,
  detectAnomalies,
  getDailySpend,
} from "@/lib/analysis/engine";

import PieChart from "@/app/_components/charts/PieChart";
import LineChart from "@/app/_components/charts/LineChart";

function monthYearUTC(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonthYearUTC(d: Date) {
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return monthYearUTC(prev);
}

function toISODateUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function extractModel(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const model =
    (typeof obj.model === "string" ? obj.model : null) ??
    (typeof obj.model_name === "string" ? obj.model_name : null) ??
    (typeof obj.modelName === "string" ? obj.modelName : null);
  if (model) return model;
  // Best-effort look for nested shapes (sdk adapters vary).
  const usage = obj.usage as Record<string, unknown> | undefined;
  if (!usage) return null;
  return (
    (typeof usage.model === "string" ? usage.model : null) ??
    (typeof usage.model_name === "string" ? usage.model_name : null) ??
    (typeof usage.modelName === "string" ? usage.modelName : null)
  );
}

async function getAuthedUserId() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase env");

  const cookieStorePromise = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () =>
        (await cookieStorePromise).getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      setAll: async () => {},
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) redirect("/login");
  return data.user.id;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const userId = await getAuthedUserId();

  const now = new Date();
  const monthYear = monthYearUTC(now);
  const prevMonthYear = lastMonthYearUTC(now);

  const [
    currentBreakdown,
    prevBreakdown,
    providerCosts,
    dailySpend,
    forecast,
    anomalies,
  ] = await Promise.all([
    aggregateByProvider(userId, monthYear),
    aggregateByProvider(userId, prevMonthYear),
    compareProviderCosts(userId, monthYear),
    getDailySpend(userId, 30),
    computeForecast(userId),
    detectAnomalies(userId),
  ]);

  const currentSpend = currentBreakdown.reduce(
    (sum, p) => sum + Number(p.total_cost_usd ?? 0),
    0
  );
  const prevSpend = prevBreakdown.reduce(
    (sum, p) => sum + Number(p.total_cost_usd ?? 0),
    0
  );

  const pctChange =
    prevSpend > 0
      ? ((currentSpend - prevSpend) / prevSpend) * 100
      : currentSpend > 0
        ? 100
        : 0;

  const { data: budgetRows } = await supabaseAdmin
    .from("budgets")
    .select("monthly_limit_usd")
    .eq("user_id", userId);

  const monthlyLimit = (budgetRows ?? []).reduce(
    (sum, r) => sum + Number(r.monthly_limit_usd ?? 0),
    0
  );

  const progressPct = monthlyLimit > 0 ? (currentSpend / monthlyLimit) * 100 : 0;
  const progressPctClamped = Math.min(100, Math.max(0, progressPct));

  const palette = [
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#a78bfa",
    "#14b8a6",
    "#f97316",
    "#60a5fa",
  ];

  const pieData = (providerCosts ?? []).map((p, i) => ({
    label: p.provider_name,
    value: Number(p.total_cost_usd ?? 0),
    color: palette[i % palette.length],
  }));

  const linePoints = (dailySpend ?? []).map((d) => ({
    x: d.date,
    y: Number(d.total_cost_usd ?? 0),
  }));

  // Drill-down filters (GET query params)
  const providerIdParam = typeof searchParams?.provider === "string" ? searchParams.provider : "all";
  const fromParam = typeof searchParams?.from === "string" ? searchParams.from : null;
  const toParam = typeof searchParams?.to === "string" ? searchParams.to : null;
  const pageParam = typeof searchParams?.page === "string" ? searchParams.page : "1";

  const pageSize = 20;
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);

  const defaultTo = toISODateUTC(now);
  const defaultFrom = toISODateUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29)));
  const from = fromParam ?? defaultFrom;
  const to = toParam ?? defaultTo;

  const { data: providerRows } = await supabaseAdmin
    .from("providers")
    .select("id,provider_name,display_name")
    .eq("user_id", userId);

  const providerById = new Map(
    (providerRows ?? []).map((p) => [p.id, { name: p.display_name ?? p.provider_name, provider_name: p.provider_name }])
  );

  const providerIdFilter =
    providerIdParam && providerIdParam !== "all" ? providerIdParam : null;

  let countQuery = supabaseAdmin
    .from("usage_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);

  if (providerIdFilter) {
    countQuery = countQuery.eq("provider_id", providerIdFilter);
  }

  const { count: totalCount } = await countQuery;
  const totalRows = totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const offset = (page - 1) * pageSize;

  let usageQuery = supabaseAdmin
    .from("usage_records")
    .select("date,provider_id,total_tokens,total_cost_usd,source,raw_response")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);

  if (providerIdFilter) {
    usageQuery = usageQuery.eq("provider_id", providerIdFilter);
  }

  const { data: usageRows } = await usageQuery
    .order("date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const drillRows = (usageRows ?? []).map((r) => {
    const model = extractModel(r.raw_response);
    return {
      date: r.date,
      provider: providerById.get(r.provider_id as string)?.name ?? r.provider_id,
      providerKey: r.provider_id as string,
      model: model ?? "Unknown",
      tokens: Number(r.total_tokens ?? 0),
      source: (r.source ?? "cron") as "sdk" | "cron",
      cost: r.total_cost_usd,
    };
  });

  const forecastPill = forecast.will_exceed
    ? { label: "Will exceed", color: "bg-red-950/60 border-red-900 text-red-200" }
    : forecast.pct_of_budget >= 80
      ? { label: "At risk", color: "bg-amber-950/50 border-amber-900 text-amber-200" }
      : { label: "On track", color: "bg-emerald-950/50 border-emerald-900 text-emerald-200" };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-sm text-zinc-400">Dashboard</div>
          <div className="text-3xl font-semibold">Usage overview</div>
        </div>
        <div className="text-sm text-zinc-400">
          {monthYear} season
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Total Spend */}
        <section className="xl:col-span-1 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm text-zinc-400">Total Spend</div>
              <div className="text-3xl font-semibold tabular-nums">
                ${currentSpend.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100">
              {pctChange >= 0 ? "+" : ""}
              {pctChange.toFixed(0)}% MoM
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>Budget progress</span>
              <span className="tabular-nums">
                {monthlyLimit > 0 ? progressPctClamped.toFixed(0) : "0"}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div className="h-full bg-zinc-200" style={{ width: `${progressPctClamped}%` }} />
            </div>
            <div className="mt-2 text-xs text-zinc-500 tabular-nums">
              {monthlyLimit > 0
                ? `Limit: $${monthlyLimit.toFixed(2)}`
                : "No monthly budget set yet"}
            </div>
          </div>
        </section>

        {/* Provider Breakdown */}
        <section className="xl:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-zinc-400">Provider Breakdown</div>
              <div className="text-xl font-semibold">Share of spend</div>
            </div>
          </div>

          <div className="mt-4">
            <PieChart
              title="Providers"
              data={pieData}
            />
          </div>
        </section>

        {/* Daily Spend */}
        <section className="xl:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div>
            <div className="text-sm text-zinc-400">Daily Spend</div>
            <div className="text-xl font-semibold">Last 30 days</div>
          </div>
          <div className="mt-4">
            <LineChart points={linePoints} />
          </div>
        </section>

        {/* Forecast */}
        <section className="xl:col-span-1 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-zinc-400">Forecast</div>
              <div className="text-xl font-semibold">End-of-month estimate</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${forecastPill.color}`}>
              {forecastPill.label}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-zinc-200">
              <span>Projected total</span>
              <span className="tabular-nums font-semibold">
                ${forecast.projected_total_usd.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-200">
              <span>Days remaining</span>
              <span className="tabular-nums font-semibold">{forecast.days_remaining}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-200">
              <span>Budget usage</span>
              <span className="tabular-nums font-semibold">{forecast.pct_of_budget.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-zinc-200"
                style={{ width: `${Math.min(100, Math.max(0, forecast.pct_of_budget))}%` }}
              />
            </div>
          </div>
        </section>

        {/* Anomalies */}
        <section className="xl:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-zinc-400">Anomaly Details</div>
              <div className="text-xl font-semibold">Spending spikes</div>
            </div>
            <div className="text-sm text-zinc-500">{anomalies.length ? `${anomalies.length} flagged` : "No anomalies detected"}</div>
          </div>

          {anomalies.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Spike amount</th>
                    <th className="py-2">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {anomalies.map((a) => {
                    const spike = a.spend - a.rolling_avg;
                    const badge =
                      a.severity === "critical"
                        ? "border-red-900 bg-red-950/50 text-red-200"
                        : "border-amber-900 bg-amber-950/50 text-amber-200";

                    return (
                      <tr key={a.date}>
                        <td className="py-3 text-zinc-100 tabular-nums">{a.date}</td>
                        <td className="py-3 text-zinc-200 tabular-nums">${spike.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-semibold ${badge}`}>
                            {a.severity.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* Drill Down */}
        <section className="xl:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-zinc-400">Drill Down</div>
              <div className="text-xl font-semibold">Usage records</div>
            </div>
          </div>

          <form method="GET" className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Provider</label>
              <select
                name="provider"
                defaultValue={providerIdParam}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-zinc-100"
              >
                <option value="all">All providers</option>
                {(providerRows ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name ?? p.provider_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500">From</label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500">To</label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-2"
              >
                Apply
              </button>
            </div>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Provider</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Tokens</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {drillRows.length ? (
                  drillRows.map((r) => (
                    <tr key={`${r.date}-${r.providerKey}-${r.model}-${r.source}-${r.tokens}`}>
                      <td className="py-3 text-zinc-200 tabular-nums">{r.date}</td>
                      <td className="py-3 text-zinc-100">{r.provider}</td>
                      <td className="py-3 text-zinc-300">{r.model}</td>
                      <td className="py-3 text-zinc-200 tabular-nums">{r.tokens.toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-semibold ${
                            r.source === "sdk"
                              ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                              : "border-zinc-800 bg-zinc-950 text-zinc-100"
                          }`}
                        >
                          {r.source}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-200 tabular-nums">
                        {r.cost == null ? "—" : `$${Number(r.cost).toFixed(4)}`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-zinc-500">
                      No usage records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="text-sm text-zinc-500">
              Page {page} of {pageCount} ({totalRows} records)
            </div>

            <div className="flex items-center gap-3">
              {page > 1 ? (
                <Link
                  href={{
                    pathname: "/dashboard",
                    query: {
                      provider: providerIdFilter ?? "all",
                      from,
                      to,
                      page: page - 1,
                    },
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
                >
                  Prev
                </Link>
              ) : null}

              {page < pageCount ? (
                <Link
                  href={{
                    pathname: "/dashboard",
                    query: {
                      provider: providerIdFilter ?? "all",
                      from,
                      to,
                      page: page + 1,
                    },
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

