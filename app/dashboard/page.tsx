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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`glass-card animate-pulse rounded-2xl ${className}`}>
    <div className="h-4 bg-[#D9D9D9]/30 rounded-lg"></div>
  </div>
);

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
    "#3C6E71",
    "#284B63",
    "#D9D9D9",
    "#FFFFFF",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#F7DC6F",
  ].map(c => c === '#D9D9D9' || c === '#FFFFFF' ? c : `${c}CC`);  // Semi-transparent for pie

  const pieData = (providerCosts ?? []).map((p, i) => ({
    label: p.provider_name,
    value: Number(p.total_cost_usd ?? 0),
    color: palette[i % palette.length],
  }));

  const linePoints = (dailySpend ?? []).map((d) => ({
    x: d.date,
    y: Number(d.total_cost_usd ?? 0),
  }));

  // Filters
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

  const providerIdFilter = providerIdParam && providerIdParam !== "all" ? providerIdParam : null;

  let countQuery = supabaseAdmin
    .from("usage_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);

  if (providerIdFilter) countQuery = countQuery.eq("provider_id", providerIdFilter);

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

  if (providerIdFilter) usageQuery = usageQuery.eq("provider_id", providerIdFilter);

  const { data: usageRows } = await usageQuery.order("date", { ascending: false }).range(offset, offset + pageSize - 1);

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
    ? { label: "Will exceed", color: "bg-red-500/20 border-red-400 text-red-100" }
    : forecast.pct_of_budget >= 80
      ? { label: "At risk", color: "bg-amber-500/20 border-amber-400 text-amber-100" }
      : { label: "On track", color: "bg-emerald-500/20 border-emerald-400 text-emerald-100" };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="glass-card p-8 rounded-3xl border border-[#D9D9D9]/30 mb-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-sm text-[#D9D9D9] mb-2" title="Current month overview">Dashboard</div>
            <div className="text-4xl font-bold bg-gradient-to-r from-white to-[#D9D9D9] bg-clip-text text-transparent">
              Usage Overview
            </div>
          </div>
          <div className="text-sm text-[#D9D9D9]" title={`${monthYear}`}>
            {monthYear} • {currentSpend.toFixed(2)} USD
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Total Spend Card */}
        <section className="xl:col-span-1 glass-card p-8 rounded-3xl hover:shadow-3xl transition-all duration-300 group" title="Total spending this month">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="text-sm text-[#D9D9D9] uppercase tracking-wider font-semibold" title="Cumulative spend across all providers">Total Spend</div>
              <div className="text-4xl font-bold tabular-nums text-white">
                ${currentSpend.toFixed(2)}
              </div>
            </div>
            <div className={`glass-card px-4 py-3 text-sm font-semibold rounded-2xl ${pctChange >= 0 ? 'bg-green-500/20 border-green-400 text-green-100' : 'bg-red-500/20 border-red-400 text-red-100'}`} title={`MoM change: ${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`}>
              {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(0)}% MoM
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-xs text-[#D9D9D9] mb-4">
              <span>Budget progress</span>
              <span className="tabular-nums font-semibold">{progressPctClamped.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#D9D9D9]/20 overflow-hidden group-hover:shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-[#3C6E71] to-[#284B63] rounded-full transition-all duration-1000"
                style={{ width: `${progressPctClamped}%` }} 
              />
            </div>
            <div className="mt-3 text-xs text-[#D9D9D9] tabular-nums text-center">
              {monthlyLimit > 0 ? `$${monthlyLimit.toFixed(2)} limit` : "Set budget in Settings"}
            </div>
          </div>
        </section>

        {/* Provider Pie */}
        <section className="xl:col-span-2 glass-card p-8 rounded-3xl hover:shadow-3xl transition-all duration-300" title="Cost breakdown by AI provider">
          <div className="flex items-center justify-between gap-6 mb-2">
            <div>
              <div className="text-sm text-[#D9D9D9] uppercase tracking-wider font-semibold">Provider Breakdown</div>
              <div className="text-xl font-bold text-white">Share of spend</div>
            </div>
          </div>
          <PieChart data={pieData} />
        </section>

        {/* Daily Line */}
        <section className="xl:col-span-2 glass-card p-8 rounded-3xl hover:shadow-3xl transition-all duration-300" title="Daily cost trend (last 30 days)">
          <div className="mb-6">
            <div className="text-sm text-[#D9D9D9] uppercase tracking-wider font-semibold mb-1">Daily Spend</div>
            <div className="text-xl font-bold text-white">Trend analysis</div>
          </div>
          <LineChart points={linePoints} stroke="#3C6E71" />
        </section>

        {/* Forecast */}
        <section className="xl:col-span-1 glass-card p-8 rounded-3xl hover:shadow-3xl transition-all duration-300 group" title={`Projected end-of-month: $${forecast.projected_total_usd.toFixed(2)} (${forecast.days_remaining} days left)`}>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-sm text-[#D9D9D9] uppercase tracking-wider font-semibold">Forecast</div>
              <div className="text-xl font-bold text-white">EOM Projection</div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-xs font-bold border-2 ${forecastPill.color} glass-card transition-all group-hover:scale-110`}>
              {forecastPill.label}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-[#D9D9D9]/20">
              <span className="text-sm text-[#D9D9D9]">Projected total</span>
              <span className="text-lg font-bold tabular-nums text-white">${forecast.projected_total_usd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#D9D9D9]/20">
              <span className="text-sm text-[#D9D9D9]">Days remaining</span>
              <span className="text-lg font-bold tabular-nums text-white">{forecast.days_remaining}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#D9D9D9]">Budget usage</span>
              <span className="text-lg font-bold tabular-nums text-white">{forecast.pct_of_budget.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#D9D9D9]/20 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#3C6E71] to-[#284B63] rounded-full" 
                style={{ width: `${Math.min(100, forecast.pct_of_budget)}%` }} 
              />
            </div>
          </div>
        </section>

        {/* Anomalies */}
        <section className="xl:col-span-3 glass-card p-8 rounded-3xl hover:shadow-3xl transition-all duration-300" title="Unusual spending spikes detected by AI">
          <div className="flex items-center justify-between gap-6 mb-6">
            <div>
              <div className="text-sm text-[#D9D9D9] uppercase tracking-wider font-semibold">Anomalies</div>
              <div className="text-xl font-bold text-white">Spending spikes</div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold text-white ${anomalies.length ? 'bg-[#3C6E71]/80' : 'bg-[#D9D9D9]/20 text-[#D9D9D9]'}`}>
              {anomalies.length ? `${anomalies.length} flagged` : "No anomalies"}
            </div>
          </div>

          {anomalies.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D9D9D9]/20">
                    <th className="py-4 text-left text-[#D9D9D9] font-semibold">Date</th>
                    <th className="py-4 text-left text-[#D9D9D9] font-semibold">Spike Amount</th>
                    <th className="py-4 text-left text-[#D9D9D9] font-semibold">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D9D9]/10">
                  {anomalies.map((a, i) => {
                    const spike = a.spend - a.rolling_avg;
                    const severity = a.severity === "critical" ? "CRITICAL" : "WARNING";
                    const color = a.severity === "critical" ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10";
                    return (
                      <tr key={a.date} className={`glass-card hover:bg-[#284B63]/20 transition-colors ${i % 2 ? 'bg-[#284B63]/10' : ''}`}>
                        <td className="py-4 tabular-nums text-white font-mono">{a.date}</td>
                        <td className="py-4 tabular-nums text-white font-semibold">${spike.toFixed(2)}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
                            {severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-2xl text-center text-[#D9D9D9]">
              <div className="text-4xl mb-4">🎉</div>
              <div>No anomalies detected. Your spending looks healthy!</div>
            </div>
          )}
        </section>

        {/* Usage Table */}
        <section className="xl:col-span-3 glass-card p-8 rounded-3xl hover:shadow-3xl transition-all duration-300" title="Detailed usage records with filters">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <div className="text-sm text-[#D9D9D9] uppercase tracking-wider font-semibold">Drill Down</div>
              <div className="text-xl font-bold text-white">Model Usage Details</div>
            </div>
          </div>

          {/* Filters */}
          <form method="GET" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8 p-6 glass-card rounded-2xl border border-[#D9D9D9]/20">
            <div className="space-y-2">
              <label className="text-xs text-[#D9D9D9] font-medium">Provider</label>
              <select
                name="provider"
                defaultValue={providerIdParam}
                className="w-full glass-card px-4 py-3 rounded-xl border border-[#D9D9D9]/30 text-white focus:border-[#3C6E71] focus:outline-none transition-all"
              >
                <option value="all">All Providers</option>
                {(providerRows ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name ?? p.provider_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#D9D9D9] font-medium">From</label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="w-full glass-card px-4 py-3 rounded-xl border border-[#D9D9D9]/30 text-white focus:border-[#3C6E71] focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#D9D9D9] font-medium">To</label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="w-full glass-card px-4 py-3 rounded-xl border border-[#D9D9D9]/30 text-white focus:border-[#3C6E71] focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <button
                type="submit"
                className="premium-btn w-full py-3 px-6 rounded-xl font-semibold text-sm uppercase tracking-wide shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Apply Filters
              </button>
            </div>
          </form>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D9D9D9]/20">
                  <th className="py-4 text-left text-[#D9D9D9] font-semibold">Date</th>
                  <th className="py-4 text-left text-[#D9D9D9] font-semibold">Provider</th>
                  <th className="py-4 text-left text-[#D9D9D9] font-semibold">Model</th>
                  <th className="py-4 text-left text-[#D9D9D9] font-semibold">Tokens</th>
                  <th className="py-4 text-left text-[#D9D9D9] font-semibold">Source</th>
                  <th className="py-4 text-left text-[#D9D9D9] font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D9D9]/10">
                {drillRows.length ? (
                  drillRows.map((r, i) => (
                    <tr 
                      key={`${r.date}-${r.providerKey}-${r.model}-${r.source}`} 
                      className={`glass-card hover:bg-[#284B63]/30 transition-all duration-200 ${i % 2 ? 'bg-[#284B63]/5' : ''}`}
                    >
                      <td className="py-5 tabular-nums text-white font-mono" title={r.date}>{r.date}</td>
                      <td className="py-5 text-[#D9D9D9] font-semibold" title={r.provider}>{r.provider}</td>
                      <td className="py-5 text-white/80" title={r.model}>{r.model}</td>
                      <td className="py-5 tabular-nums text-[#D9D9D9] font-mono" title={`${r.tokens.toLocaleString()} tokens`}>{r.tokens.toLocaleString()}</td>
                      <td className="py-5">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            r.source === "sdk"
                              ? "border-[#3C6E71] bg-[#3C6E71]/20 text-[#3C6E71]"
                              : "border-[#D9D9D9]/50 bg-[#D9D9D9]/10 text-[#D9D9D9]"
                          }`}
                          title={r.source === 'sdk' ? 'SDK ingestion' : 'Cron sync'}
                        >
                          {r.source.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-5 tabular-nums font-mono text-white font-semibold">
                        {r.cost == null ? (
                          <span className="text-[#D9D9D9]">-</span>
                        ) : (
                          <span title={`$${Number(r.cost).toFixed(4)}`} className="text-[#3C6E71]">${Number(r.cost).toFixed(4)}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="glass-card p-12 rounded-3xl mx-auto max-w-md text-[#D9D9D9]">
                        <div className="text-5xl mb-4">🔍</div>
                        <div className="text-lg font-semibold text-white mb-2">No usage records</div>
                        <div>Try adjusting filters or connect your first AI provider</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalRows > pageSize && (
            <div className="mt-8 flex items-center justify-between gap-4 glass-card p-4 rounded-2xl">
              <div className="text-sm text-[#D9D9D9]">
                Page {page} of {pageCount} ({totalRows.toLocaleString()} total records)
              </div>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={{
                      pathname: "/dashboard",
                      query: { provider: providerIdFilter ?? "all", from, to, page: page - 1 },
                    }}
                    className="premium-btn px-4 py-2 text-sm font-semibold"
                  >
                    ← Prev
                  </Link>
                ) : null}
                {page < pageCount ? (
                  <Link
                    href={{
                      pathname: "/dashboard",
                      query: { provider: providerIdFilter ?? "all", from, to, page: page + 1 },
                    }}
                    className="premium-btn px-4 py-2 text-sm font-semibold"
                  >
                    Next →
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
