"use client";

import { useEffect, useMemo, useState } from "react";

import LineChart from "@/app/_components/charts/LineChart";
import PieChart from "@/app/_components/charts/PieChart";

export type TimeFrame = "24h" | "7d" | "30d";

export interface SummaryData {
  range: string;
  request_count: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface ChartDataResponse {
  range: string;
  models?: string[];
  providers?: string[];
  data: any[];
}

export interface CacheSavingsResponse {
  range: string;
  saved_usd: number;
  cache_tokens: number;
}

export interface RequestRow {
  request_id: string;
  created_at: string;
  provider: string;
  model: string;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
}

export interface LatencyRow {
  model: string;
  latency: number;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function fetchJson<T>(path: string) {
  return fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
  }).then(async (res) => {
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || `Request failed ${res.status}`);
    }
    return res.json() as Promise<T>;
  });
}

type ProviderPieSlice = {
  label: string;
  value: number;
  color: string;
};

const PROVIDER_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#6366F1",
  "#14B8A6",
  "#F59E0B",
];

function getProviderTotals(data: ChartDataResponse | null): ProviderPieSlice[] {
  if (!data?.data?.length || !data.providers?.length) return [];
  const totals = new Map<string, number>();
  data.data.forEach((row: Record<string, number>) => {
    data.providers?.forEach((provider) => {
      const value = Number(row[provider] ?? 0);
      totals.set(provider, (totals.get(provider) ?? 0) + value);
    });
  });
  return Array.from(totals.entries())
    .map(([label, value], index) => ({
      label,
      value,
      color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
}

export default function AnalyticsDashboardClient() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("7d");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [velocityData, setVelocityData] = useState<ChartDataResponse | null>(null);
  const [marketShareData, setMarketShareData] = useState<ChartDataResponse | null>(null);
  const [stopReasonData, setStopReasonData] = useState<ChartDataResponse | null>(null);
  const [scatterData, setScatterData] = useState<ChartDataResponse | null>(null);
  const [cacheSavingsData, setCacheSavingsData] = useState<CacheSavingsResponse | null>(null);
  const [latencyData, setLatencyData] = useState<LatencyRow[] | null>(null);
  const [requestRows, setRequestRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const providerTotals = useMemo(() => getProviderTotals(marketShareData), [marketShareData]);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        const [summary, velocity, marketShare, stopReasons, scatter, cache, latency, requests] = await Promise.all([
          fetchJson<SummaryData>(`/api/analytics/summary?range=${timeFrame}`),
          fetchJson<ChartDataResponse>(`/api/analytics/stacked-tokens?range=${timeFrame}`),
          fetchJson<ChartDataResponse>(`/api/analytics/market-share?range=${timeFrame}`),
          fetchJson<ChartDataResponse>(`/api/analytics/stop-reasons?range=${timeFrame}`),
          fetchJson<ChartDataResponse>(`/api/analytics/token-scatter?range=${timeFrame}`),
          fetchJson<CacheSavingsResponse>(`/api/analytics/cache-savings?range=${timeFrame}`),
          fetchJson<{ range: string; data: LatencyRow[] }>(`/api/analytics/model-latency?range=${timeFrame}`),
          fetchJson<{ rows: RequestRow[] }>(`/api/analytics/requests?range=${timeFrame}`),
        ]);

        if (aborted) return;
        setSummaryData(summary);
        setVelocityData(velocity);
        setMarketShareData(marketShare);
        setStopReasonData(stopReasons);
        setScatterData(scatter);
        setCacheSavingsData(cache);
        setLatencyData(latency.data ?? null);
        setRequestRows(requests.rows ?? []);
      } catch (err) {
        if (aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      aborted = true;
    };
  }, [timeFrame]);

  const dailyTokens = useMemo(() => {
    if (!velocityData?.data) return [];
    return velocityData.data.map((row) => {
      const total = velocityData.models?.reduce((sum, model) => sum + Number(row[model] ?? 0), 0) ?? 0;
      return { x: row.date, y: total };
    });
  }, [velocityData]);

  const stopReasons = stopReasonData?.data ?? [];
  const latencyRows = latencyData ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Insights driven from Supabase usage records and secure API access.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["24h", "7d", "30d"] as TimeFrame[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeFrame(value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${timeFrame === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.15em] text-slate-500">Requests</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summaryData ? summaryData.request_count.toLocaleString() : "—"}</p>
          <p className="mt-2 text-sm text-slate-500">Total API requests in range</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.15em] text-slate-500">Cost</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summaryData ? formatUsd(summaryData.total_cost) : "—"}</p>
          <p className="mt-2 text-sm text-slate-500">Estimated spend from usage records</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.15em] text-slate-500">Tokens</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summaryData ? formatCompact(summaryData.total_tokens) : "—"}</p>
          <p className="mt-2 text-sm text-slate-500">Total prompt + completion tokens</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.15em] text-slate-500">Cache savings</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{cacheSavingsData ? formatUsd(cacheSavingsData.saved_usd) : "—"}</p>
          <p className="mt-2 text-sm text-slate-500">{cacheSavingsData ? `${formatCompact(cacheSavingsData.cache_tokens)} cached tokens` : "—"}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Token Velocity</h2>
              <p className="text-sm text-slate-500">Daily token consumption across connected models.</p>
            </div>
          </div>
          <div className="h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400">Loading chart…</div>
            ) : dailyTokens.length ? (
              <LineChart points={dailyTokens} />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">No usage data available yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Provider Share</h2>
            <p className="text-sm text-slate-500">Distribution of trackable tokens by provider.</p>
          </div>
          <div className="h-[320px]">
            {providerTotals.length ? (
              <PieChart data={providerTotals} />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">No provider data yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Recent Requests</h2>
            <p className="text-sm text-slate-500">Most recent calls from the same authenticated session.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm text-slate-700">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Stop Reason</th>
                </tr>
              </thead>
              <tbody>
                {requestRows.map((row) => (
                  <tr key={`${row.request_id}-${row.created_at}`} className="border-t border-slate-200">
                    <td className="px-4 py-4 font-mono text-slate-600">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                    <td className="px-4 py-4 text-slate-700">{row.provider}</td>
                    <td className="px-4 py-4 text-slate-700">{row.model}</td>
                    <td className="px-4 py-4 text-slate-700">{formatCompact(row.input_tokens + row.output_tokens)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{formatUsd(row.total_cost_usd)}</td>
                    <td className="px-4 py-4 text-slate-600">{row.stop_reason || "n/a"}</td>
                  </tr>
                ))}
                {!loading && !requestRows.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No recent requests recorded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Latency by Model</h2>
            <p className="text-sm text-slate-500">Average response time from recent usage rows.</p>
          </div>
          <div className="space-y-3">
            {latencyRows.length ? (
              latencyRows.map((row) => (
                <div key={row.model} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-900">{row.model}</span>
                    <span className="text-sm text-slate-700">{row.latency.toFixed(0)} ms</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">No latency data available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
