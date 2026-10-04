"use server";

import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureProfileRow } from "@/lib/auth/server";
import {
  aggregateByProvider,
  computeForecast,
  detectAnomalies,
  getDailySpend,
} from "@/lib/analysis/engine";

import PieChart from "@/app/_components/charts/PieChart";
import LineChart from "@/app/_components/charts/LineChart";

type UsageRow = {
  date: string;
  fetched_at: string | null;
  provider_id: string;
  total_cost_usd: number | null;
  total_tokens: number | null;
  request_count: number | null;
  raw_response: unknown;
  request_id: string | null;
  stop_reason: string | null;
};

type ProviderRow = {
  id: string;
  provider_name: string;
};

function monthYearUTC(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function monthLabel(monthYear: string) {
  const [year, month] = monthYear.split("-").map(Number);

  return new Date(
    Date.UTC(year, month - 1, 1),
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUsdCompact(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)}%`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractModel(rawResponse: unknown) {
  if (!rawResponse || typeof rawResponse !== "object") {
    return "Unknown model";
  }

  const obj = rawResponse as Record<string, unknown>;

  if (typeof obj.model === "string" && obj.model.trim()) {
    return obj.model;
  }

  if (
    typeof obj.model_name === "string" &&
    obj.model_name.trim()
  ) {
    return obj.model_name;
  }

  if (
    typeof obj.modelName === "string" &&
    obj.modelName.trim()
  ) {
    return obj.modelName;
  }

  return "Unknown model";
}

function Icon({
  children,
  className = "h-5 w-5",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  change,
  changeLabel,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  change?: number | null;
  changeLabel?: string;
  tone?: "default" | "positive" | "warning";
}) {
  const changeIsIncrease = (change ?? 0) > 0;

  const changeClass =
    change === null || change === undefined
      ? ""
      : changeIsIncrease
        ? "bg-red-50 text-red-700 ring-red-100"
        : change < 0
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  const iconClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex min-h-7 items-center gap-2">
        {change !== null && change !== undefined ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${changeClass}`}
          >
            <span>
              {changeIsIncrease
                ? "↑"
                : change < 0
                  ? "↓"
                  : "•"}
            </span>

            <span>{Math.abs(change).toFixed(1)}%</span>
          </span>
        ) : null}

        {changeLabel ? (
          <span className="text-xs text-slate-500">
            {changeLabel}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Icon className="h-5 w-5">
          <path d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" />
        </Icon>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

async function getAuthedUserId() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env");
  }

  const cookieStorePromise = cookies();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: async () =>
          (await cookieStorePromise)
            .getAll()
            .map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            })),
        setAll: async () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await ensureProfileRow(
      user.id,
      user.email ?? null,
    );
  } catch (error) {
    console.error(
      "Dashboard profile initialization failed:",
      error,
    );
  }

  return user.id;
}

export default async function DashboardPage() {
  const userId = await getAuthedUserId();

  const now = new Date();
  const currentMonth = monthYearUTC(now);

  const previousMonthDate = new Date(now);

  previousMonthDate.setUTCMonth(
    previousMonthDate.getUTCMonth() - 1,
  );

  const previousMonth = monthYearUTC(
    previousMonthDate,
  );

  const nextMonthDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1,
    ),
  );

  const nextMonth = monthYearUTC(
    nextMonthDate,
  );

  const [
    currentBreakdown,
    previousBreakdown,
    dailySpend,
    forecast,
    anomalies,
    budgetRows,
    usageResult,
    providerResult,
  ] = await Promise.all([
    aggregateByProvider(
      userId,
      currentMonth,
    ),

    aggregateByProvider(
      userId,
      previousMonth,
    ),

    getDailySpend(userId, 30),

    computeForecast(userId),

    detectAnomalies(userId),

    supabaseAdmin
      .from("budgets")
      .select("monthly_limit_usd")
      .eq("user_id", userId),

    supabaseAdmin
      .from("usage_records")
      .select(
        "date,fetched_at,provider_id,total_cost_usd,total_tokens,request_count,raw_response,request_id,stop_reason",
      )
      .eq("user_id", userId)
      .gte("date", `${currentMonth}-01`)
      .lt("date", `${nextMonth}-01`)
      .order("date", {
        ascending: false,
      })
      .order("fetched_at", {
        ascending: false,
      })
      .limit(12),

    supabaseAdmin
      .from("providers")
      .select("id,provider_name")
      .eq("user_id", userId),
  ]);

  if (usageResult.error) {
    throw new Error(
      usageResult.error.message,
    );
  }

  if (providerResult.error) {
    throw new Error(
      providerResult.error.message,
    );
  }

  const usageRows =
    (usageResult.data ?? []) as UsageRow[];

  const providerRows =
    (providerResult.data ?? []) as ProviderRow[];

  const providerNameById = new Map(
    providerRows.map((row) => [
      row.id,
      row.provider_name,
    ]),
  );

  const monthSpend =
    currentBreakdown.reduce(
      (sum, row) =>
        sum +
        Number(row.total_cost_usd ?? 0),
      0,
    );

  const previousMonthSpend =
    previousBreakdown.reduce(
      (sum, row) =>
        sum +
        Number(row.total_cost_usd ?? 0),
      0,
    );

  const monthChange =
    previousMonthSpend > 0
      ? ((monthSpend -
          previousMonthSpend) /
          previousMonthSpend) *
        100
      : null;

  const monthTokens =
    currentBreakdown.reduce(
      (sum, row) =>
        sum +
        Number(row.total_tokens ?? 0),
      0,
    );

  const monthRequests =
    currentBreakdown.reduce(
      (sum, row) =>
        sum +
        Number(row.request_count ?? 0),
      0,
    );

  const monthlyLimit =
    (budgetRows.data ?? []).reduce(
      (sum, row) =>
        sum +
        Number(
          row.monthly_limit_usd ?? 0,
        ),
      0,
    );

  const budgetUsedPct =
    monthlyLimit > 0
      ? (monthSpend / monthlyLimit) * 100
      : 0;

  const budgetRemaining = Math.max(
    0,
    monthlyLimit - monthSpend,
  );

  const todaySpend =
    dailySpend[dailySpend.length - 1]
      ?.total_cost_usd ?? 0;

  const lastSevenDaysSpend =
    dailySpend
      .slice(-7)
      .reduce(
        (sum, row) =>
          sum +
          Number(
            row.total_cost_usd ?? 0,
          ),
        0,
      );

  const lastSevenDaysTokens =
    dailySpend
      .slice(-7)
      .reduce(
        (sum, row) =>
          sum +
          Number(
            row.total_tokens ?? 0,
          ),
        0,
      );

  const trendPoints = dailySpend.map(
    (row) => ({
      x: row.date.slice(5),
      y: Number(
        row.total_cost_usd ?? 0,
      ),
    }),
  );

  const providerPie =
    currentBreakdown
      .filter(
        (row) =>
          Number(
            row.total_cost_usd ?? 0,
          ) > 0,
      )
      .slice(0, 6)
      .map((row, index) => ({
        label: row.provider_name,
        value: Number(
          row.total_cost_usd ?? 0,
        ),
        color: [
          "#0d1b2a",
          "#415a77",
          "#778da9",
          "#5f7895",
          "#9aabc0",
          "#b9c4d1",
        ][index],
      }));

  const maxProviderCost =
    Math.max(
      ...currentBreakdown.map((row) =>
        Number(
          row.total_cost_usd ?? 0,
        ),
      ),
      0,
    );

  const topModelsMap = new Map<
    string,
    {
      cost: number;
      tokens: number;
      requests: number;
    }
  >();

  for (const row of usageRows) {
    const model = extractModel(
      row.raw_response,
    );

    const current =
      topModelsMap.get(model) ?? {
        cost: 0,
        tokens: 0,
        requests: 0,
      };

    current.cost += Number(
      row.total_cost_usd ?? 0,
    );

    current.tokens += Number(
      row.total_tokens ?? 0,
    );

    current.requests += Number(
      row.request_count ?? 0,
    );

    topModelsMap.set(
      model,
      current,
    );
  }

  const topModels = Array.from(
    topModelsMap.entries(),
  )
    .map(([model, metrics]) => ({
      model,
      ...metrics,
    }))
    .sort(
      (a, b) =>
        b.cost - a.cost,
    )
    .slice(0, 5);

  const recentRows = usageRows
    .map((row) => ({
      ...row,
      provider:
        providerNameById.get(
          row.provider_id,
        ) ?? "Unknown provider",
      model: extractModel(
        row.raw_response,
      ),
    }))
    .slice(0, 8);

  const budgetTone =
    monthlyLimit <= 0
      ? "default"
      : budgetUsedPct >= 90
        ? "danger"
        : budgetUsedPct >= 75
          ? "warning"
          : "healthy";

  const budgetBarWidth =
    monthlyLimit > 0
      ? Math.min(100, budgetUsedPct)
      : 0;

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 sm:px-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-slate-100/80 to-transparent lg:block" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                AI usage overview
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                A clean view of spend, usage, budget health and
                recent AI activity across your connected providers.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Current period
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {monthLabel(
                    currentMonth,
                  )}
                </p>
              </div>

              <Link
                href="/dashboard/stats"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Open analytics

                <Icon className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </Icon>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KPI GRID */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Month spend"
          value={formatUsd(monthSpend)}
          description="Total cost recorded in the current month."
          change={monthChange}
          changeLabel={
            monthChange === null
              ? "No previous-month baseline"
              : "vs previous month"
          }
          icon={
            <Icon>
              <path d="M12 3v18" />
              <path d="M16.5 7.5A4.5 4.5 0 0 0 12 5c-2.5 0-4 1.4-4 3.2 0 2.2 2.1 3.1 4.6 3.8 2.5.7 4.4 1.6 4.4 3.8 0 2-1.8 3.4-4.5 3.4a5.5 5.5 0 0 1-5-3" />
            </Icon>
          }
        />

        <MetricCard
          label="Today's spend"
          value={formatUsd(todaySpend)}
          description={`${formatUsd(lastSevenDaysSpend)} spent across the last 7 days.`}
          icon={
            <Icon>
              <path d="M4 19V5" />
              <path d="M4 19h16" />
              <path d="m7 15 3-4 3 2 4-6" />
            </Icon>
          }
          tone={
            todaySpend > 0
              ? "positive"
              : "default"
          }
        />

        <MetricCard
          label="Requests"
          value={formatNumber(monthRequests)}
          description={`${formatNumber(monthTokens)} total tokens in the current month.`}
          icon={
            <Icon>
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="3"
              />
              <path d="m8 12 2.5 2.5L16 9" />
            </Icon>
          }
        />

        <MetricCard
          label="Budget remaining"
          value={
            monthlyLimit > 0
              ? formatUsd(
                  budgetRemaining,
                )
              : "Not set"
          }
          description={
            monthlyLimit > 0
              ? `${formatPercent(budgetUsedPct)} of the monthly budget is used.`
              : "Set a monthly budget to enable budget tracking."
          }
          icon={
            <Icon>
              <rect
                x="3"
                y="6"
                width="18"
                height="13"
                rx="2.5"
              />
              <path d="M7 6V4.8A1.8 1.8 0 0 1 8.8 3h6.4A1.8 1.8 0 0 1 17 4.8V6" />
              <path d="M3 11h18" />
            </Icon>
          }
          tone={
            budgetTone === "healthy"
              ? "positive"
              : budgetTone ===
                    "warning" ||
                budgetTone ===
                    "danger"
                ? "warning"
                : "default"
          }
        />
      </section>

      {/* TREND + BUDGET */}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeader
              eyebrow="Spending trend"
              title="30-day spend"
              description="Daily AI spend with the current day included."
            />

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                7-day spend
              </p>

              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatUsd(
                  lastSevenDaysSpend,
                )}
              </p>
            </div>
          </div>

          <div className="mt-6">
            {trendPoints.length ? (
              <LineChart
                points={trendPoints}
                height={300}
                stroke="#415a77"
              />
            ) : (
              <EmptyState
                title="No spend data yet"
                description="Once usage records are available, your daily spend trend will appear here."
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            eyebrow="Budget"
            title="Budget health"
            description="Current usage against your monthly limit."
          />

          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {monthlyLimit > 0
                    ? "Monthly limit"
                    : "Budget status"}
                </p>

                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {monthlyLimit > 0
                    ? formatUsd(
                        monthlyLimit,
                      )
                    : "No limit set"}
                </p>
              </div>

              <div
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  budgetTone ===
                  "danger"
                    ? "bg-red-100 text-red-700"
                    : budgetTone ===
                        "warning"
                      ? "bg-amber-100 text-amber-700"
                      : budgetTone ===
                          "healthy"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                }`}
              >
                {budgetTone ===
                "danger"
                  ? "High usage"
                  : budgetTone ===
                      "warning"
                    ? "Watch closely"
                    : budgetTone ===
                        "healthy"
                      ? "Healthy"
                      : "Not configured"}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Used</span>

                <span>
                  {monthlyLimit > 0
                    ? formatPercent(
                        budgetUsedPct,
                      )
                    : "—"}
                </span>
              </div>

              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-[width] ${
                    budgetTone ===
                    "danger"
                      ? "bg-red-500"
                      : budgetTone ===
                          "warning"
                        ? "bg-amber-500"
                        : "bg-slate-700"
                  }`}
                  style={{
                    width: `${budgetBarWidth}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Current
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatUsd(
                    monthSpend,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Forecast
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatUsd(
                    forecast.projected_total_usd,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROVIDERS + FORECAST */}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <SectionHeader
            eyebrow="Providers"
            title="Spend by provider"
            description="See where the current month's spend is concentrated."
            action={
              <Link
                href="/dashboard/providers"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                Manage providers

                <Icon className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </Icon>
              </Link>
            }
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
            <div className="flex justify-center">
              {providerPie.length ? (
                <PieChart
                  data={providerPie}
                  size={220}
                />
              ) : (
                <EmptyState
                  title="No provider data"
                  description="Provider cost distribution will appear after usage is recorded."
                />
              )}
            </div>

            <div className="space-y-4">
              {currentBreakdown.length ? (
                currentBreakdown
                  .slice(0, 5)
                  .map(
                    (
                      provider,
                    ) => {
                      const cost =
                        Number(
                          provider.total_cost_usd ??
                            0,
                        );

                      const share =
                        monthSpend >
                        0
                          ? (cost /
                              monthSpend) *
                            100
                          : 0;

                      const relativeToTop =
                        maxProviderCost >
                        0
                          ? (cost /
                              maxProviderCost) *
                            100
                          : 0;

                      return (
                        <div
                          key={
                            provider.provider_name
                          }
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {
                                  provider.provider_name
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatPercent(
                                  share,
                                )}{" "}
                                of spend
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-semibold text-slate-950">
                              {formatUsd(
                                cost,
                              )}
                            </p>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-700"
                              style={{
                                width: `${relativeToTop}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )
              ) : (
                <EmptyState
                  title="No provider usage"
                  description="Connect a provider and record your first request to see the breakdown."
                />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            eyebrow="Forecast"
            title="Month-end projection"
            description="Current trajectory based on recent usage."
          />

          <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-medium text-slate-400">
              Projected spend
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatUsd(
                forecast.projected_total_usd,
              )}
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
              <span className="text-slate-400">
                Days remaining
              </span>

              <span className="font-semibold text-white">
                {forecast.days_remaining}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Budget impact
              </span>

              <span
                className={
                  forecast.will_exceed
                    ? "font-semibold text-red-300"
                    : "font-semibold text-emerald-300"
                }
              >
                {forecast.monthly_limit_usd >
                0
                  ? formatPercent(
                      forecast.pct_of_budget,
                    )
                  : "No budget"}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <Icon className="h-4 w-4">
                  <path d="M12 3v18" />
                  <path d="M17 8.5A4.8 4.8 0 0 0 12 6c-2.5 0-4 1.2-4 3 0 2 1.8 2.7 4 3.3s4 1.3 4 3.5c0 1.8-1.6 3.2-4 3.2a5.4 5.4 0 0 1-4.8-2.6" />
                </Icon>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {forecast.will_exceed
                    ? "Forecast is above budget"
                    : "Forecast is within budget"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {forecast.will_exceed
                    ? "Your current trajectory suggests the monthly limit may be exceeded."
                    : "Current usage does not indicate a projected budget overrun."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODELS + SNAPSHOT */}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <SectionHeader
            eyebrow="Models"
            title="Top models by spend"
            description="Highest-cost models from current-month activity."
          />

          <div className="mt-6 overflow-x-auto">
            {topModels.length ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-3 py-3">
                      Model
                    </th>

                    <th className="px-3 py-3 text-right">
                      Requests
                    </th>

                    <th className="px-3 py-3 text-right">
                      Tokens
                    </th>

                    <th className="px-3 py-3 text-right">
                      Spend
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {topModels.map(
                    (
                      model,
                      index,
                    ) => (
                      <tr
                        key={
                          model.model
                        }
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-4">
                          <div className="flex min-w-[220px] items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                              {index +
                                1}
                            </span>

                            <span className="truncate font-semibold text-slate-800">
                              {
                                model.model
                              }
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-4 text-right text-slate-600">
                          {formatNumber(
                            model.requests,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right text-slate-600">
                          {formatNumber(
                            model.tokens,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right font-semibold text-slate-950">
                          {formatUsd(
                            model.cost,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="No model activity"
                description="Model-level cost data will appear after usage records are collected."
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            eyebrow="Snapshot"
            title="Usage at a glance"
            description="Helpful context for the current period."
          />

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Tokens this month
                </span>

                <Icon className="h-4 w-4 text-slate-400">
                  <path d="M7 7h10" />
                  <path d="M7 12h10" />
                  <path d="M7 17h10" />
                </Icon>
              </div>

              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatNumber(
                  monthTokens,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Tokens, last 7 days
                </span>

                <Icon className="h-4 w-4 text-slate-400">
                  <path d="M4 19V5" />
                  <path d="M4 19h16" />
                  <path d="m7 15 3-5 3 2 4-6" />
                </Icon>
              </div>

              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatNumber(
                  lastSevenDaysTokens,
                )}
              </p>
            </div>

            <Link
              href="/dashboard/api-management"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    API infrastructure
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Manage projects, environments and keys.
                  </p>
                </div>

                <Icon className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </Icon>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ALERTS */}

      {anomalies.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
          <SectionHeader
            eyebrow="Attention"
            title="Spending alerts"
            description={`${anomalies.length} unusual pattern${
              anomalies.length === 1
                ? ""
                : "s"
            } detected in the recent 30-day window.`}
          />

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {anomalies
              .slice(0, 3)
              .map(
                (
                  anomaly,
                  index,
                ) => {
                  const baseline =
                    Number(
                      anomaly.rolling_avg ??
                        0,
                    );

                  const multiplier =
                    baseline >
                    0
                      ? anomaly.spend /
                        baseline
                      : 0;

                  return (
                    <div
                      key={`${anomaly.date}-${index}`}
                      className="rounded-2xl border border-amber-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              anomaly.severity ===
                              "critical"
                                ? "bg-red-500"
                                : "bg-amber-500"
                            }`}
                          />

                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {
                              anomaly.severity
                            }
                          </span>
                        </div>

                        <span className="text-xs text-slate-400">
                          {formatDate(
                            anomaly.date,
                          )}
                        </span>
                      </div>

                      <p className="mt-3 text-lg font-semibold text-slate-950">
                        {formatUsd(
                          anomaly.spend,
                        )}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Approximately{" "}
                        {multiplier.toFixed(
                          1,
                        )}
                        × the preceding rolling average.
                      </p>
                    </div>
                  );
                },
              )}
          </div>
        </section>
      ) : null}

      {/* RECENT USAGE */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeader
          eyebrow="Activity"
          title="Recent usage"
          description="Latest recorded API activity for the current month."
          action={
            <Link
              href="/dashboard/stats"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              View detailed analytics

              <Icon className="h-4 w-4">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </Icon>
            </Link>
          }
        />

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            {recentRows.length ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-4 py-3">
                      Date
                    </th>

                    <th className="px-4 py-3">
                      Provider
                    </th>

                    <th className="px-4 py-3">
                      Model
                    </th>

                    <th className="px-4 py-3 text-right">
                      Tokens
                    </th>

                    <th className="px-4 py-3 text-right">
                      Cost
                    </th>

                    <th className="px-4 py-3">
                      Stop reason
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentRows.map(
                    (
                      row,
                      index,
                    ) => (
                      <tr
                        key={
                          row.request_id ??
                          `${row.date}-${row.provider_id}-${index}`
                        }
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {formatDate(
                            row.fetched_at ??
                              row.date,
                          )}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-800">
                          {
                            row.provider
                          }
                        </td>

                        <td className="max-w-[240px] truncate px-4 py-4 text-slate-600">
                          {
                            row.model
                          }
                        </td>

                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatNumber(
                            Number(
                              row.total_tokens ??
                                0,
                            ),
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-slate-950">
                          {formatUsdCompact(
                            Number(
                              row.total_cost_usd ??
                                0,
                            ),
                          )}
                        </td>

                        <td className="px-4 py-4 text-slate-500">
                          {row.stop_reason ??
                            "n/a"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="No usage recorded"
                description="Your latest API activity will appear here once the tracker receives usage records."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}