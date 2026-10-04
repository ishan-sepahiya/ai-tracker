"use server";

import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  KeyRound,
  Layers3,
  WalletCards,
} from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureProfileRow } from "@/lib/auth/server";
import {
  aggregateByProvider,
  computeForecast,
  detectAnomalies,
} from "@/lib/analysis/engine";

import PieChart from "@/app/_components/charts/PieChart";
import LineChart from "@/app/_components/charts/LineChart";
import DashboardPeriodFilter from "@/app/dashboard/components/DashboardPeriodFilter";

type Period = "7d" | "30d" | "90d";

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

const PERIODS: Record<
  Period,
  {
    days: number;
    label: string;
  }
> = {
  "7d": {
    days: 7,
    label: "Last 7 days",
  },
  "30d": {
    days: 30,
    label: "Last 30 days",
  },
  "90d": {
    days: 90,
    label: "Last 90 days",
  },
};

const PIE_COLORS = [
  "#0d1b2a",
  "#415a77",
  "#778da9",
  "#5f7895",
  "#9aabc0",
  "#b9c4d1",
];

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthYearUTC(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function monthLabel(monthYear: string) {
  const [year, month] = monthYear
    .split("-")
    .map(Number);

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

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatPercent(value: number) {
  return `${value.toFixed(
    value >= 100 ? 0 : 1,
  )}%`;
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function extractModel(rawResponse: unknown) {
  if (
    !rawResponse ||
    typeof rawResponse !== "object"
  ) {
    return "Unknown model";
  }

  const object =
    rawResponse as Record<
      string,
      unknown
    >;

  if (
    typeof object.model === "string" &&
    object.model.trim()
  ) {
    return object.model;
  }

  if (
    typeof object.model_name === "string" &&
    object.model_name.trim()
  ) {
    return object.model_name;
  }

  if (
    typeof object.modelName === "string" &&
    object.modelName.trim()
  ) {
    return object.modelName;
  }

  return "Unknown model";
}

function getDateBounds(
  days: number,
  now: Date,
) {
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ),
  );

  const start = new Date(end);

  start.setUTCDate(
    start.getUTCDate() - days,
  );

  return {
    start: formatDateISO(start),
    end: formatDateISO(end),
  };
}

function buildDailySeries(
  rows: UsageRow[],
  days: number,
  now: Date,
) {
  const { start } = getDateBounds(
    days,
    now,
  );

  const startDate = new Date(
    `${start}T00:00:00.000Z`,
  );

  const buckets = new Map<
    string,
    {
      cost: number;
      tokens: number;
    }
  >();

  for (
    let index = 0;
    index < days;
    index++
  ) {
    const date = new Date(
      startDate,
    );

    date.setUTCDate(
      date.getUTCDate() + index,
    );

    buckets.set(
      formatDateISO(date),
      {
        cost: 0,
        tokens: 0,
      },
    );
  }

  for (const row of rows) {
    const bucket = buckets.get(
      row.date,
    );

    if (!bucket) {
      continue;
    }

    bucket.cost += Number(
      row.total_cost_usd ?? 0,
    );

    bucket.tokens += Number(
      row.total_tokens ?? 0,
    );
  }

  return Array.from(
    buckets.entries(),
  ).map(
    ([date, values]) => ({
      date,
      ...values,
    }),
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?:
    | "default"
    | "positive"
    | "warning";
}) {
  const iconClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
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

      <p className="mt-4 text-sm leading-5 text-slate-500">
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
        <Activity className="h-5 w-5" />
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
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    throw new Error(
      "Missing Supabase env",
    );
  }

  const cookieStorePromise =
    cookies();

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll: async () =>
            (
              await cookieStorePromise
            )
              .getAll()
              .map(
                (cookie) => ({
                  name: cookie.name,
                  value:
                    cookie.value,
                }),
              ),
          setAll: async () => {},
        },
      },
    );

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

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

export default async function DashboardPage(
  props: {
    searchParams?: Promise<{
      period?: string;
    }>;
  },
) {
  const userId =
    await getAuthedUserId();

  const searchParams =
    await props.searchParams;

  const requestedPeriod =
    searchParams?.period;

  const period: Period =
    requestedPeriod === "7d" ||
    requestedPeriod === "90d"
      ? requestedPeriod
      : "30d";

  const periodConfig =
    PERIODS[period];

  const now = new Date();

  const currentMonth =
    monthYearUTC(now);

  const nextMonthDate =
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1,
      ),
    );

  const nextMonth =
    monthYearUTC(
      nextMonthDate,
    );

  const bounds =
    getDateBounds(
      periodConfig.days,
      now,
    );

  const [
    usageResult,
    providerResult,
    budgetResult,
    currentMonthBreakdown,
    forecast,
    anomalies,
  ] = await Promise.all([
    supabaseAdmin
      .from("usage_records")
      .select(
        "date,fetched_at,provider_id,total_cost_usd,total_tokens,request_count,raw_response,request_id,stop_reason",
      )
      .eq(
        "user_id",
        userId,
      )
      .gte(
        "date",
        bounds.start,
      )
      .lt(
        "date",
        bounds.end,
      )
      .order(
        "date",
        {
          ascending: false,
        },
      )
      .order(
        "fetched_at",
        {
          ascending: false,
        },
      )
      .limit(5000),

    supabaseAdmin
      .from("providers")
      .select(
        "id,provider_name",
      )
      .eq(
        "user_id",
        userId,
      ),

    supabaseAdmin
      .from("budgets")
      .select(
        "monthly_limit_usd",
      )
      .eq(
        "user_id",
        userId,
      ),

    aggregateByProvider(
      userId,
      currentMonth,
    ),

    computeForecast(
      userId,
    ),

    detectAnomalies(
      userId,
    ),
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

  if (budgetResult.error) {
    throw new Error(
      budgetResult.error.message,
    );
  }

  const usageRows =
    (usageResult.data ??
      []) as UsageRow[];

  const providerRows =
    (providerResult.data ??
      []) as ProviderRow[];

  const providerNameById =
    new Map(
      providerRows.map(
        (provider) => [
          provider.id,
          provider.provider_name,
        ],
      ),
    );

  /*
   * PERIOD METRICS
   */

  const periodSpend =
    usageRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.total_cost_usd ??
            0,
        ),
      0,
    );

  const periodTokens =
    usageRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.total_tokens ??
            0,
        ),
      0,
    );

  const periodRequests =
    usageRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.request_count ??
            0,
        ),
      0,
    );

  const avgDailySpend =
    periodConfig.days > 0
      ? periodSpend /
        periodConfig.days
      : 0;

  /*
   * CURRENT MONTH BUDGET
   */

  const monthlyLimit =
    (
      budgetResult.data ??
      []
    ).reduce(
      (sum, row) =>
        sum +
        Number(
          row.monthly_limit_usd ??
            0,
        ),
      0,
    );

  const monthSpend =
    currentMonthBreakdown.reduce(
      (sum, row) =>
        sum +
        Number(
          row.total_cost_usd ??
            0,
        ),
      0,
    );

  const budgetUsedPct =
    monthlyLimit > 0
      ? (monthSpend /
          monthlyLimit) *
        100
      : 0;

  const budgetRemaining =
    Math.max(
      0,
      monthlyLimit -
        monthSpend,
    );

  const budgetTone =
    monthlyLimit <= 0
      ? "default"
      : budgetUsedPct >= 90
        ? "warning"
        : "positive";

  /*
   * DAILY TREND
   */

  const dailySeries =
    buildDailySeries(
      usageRows,
      periodConfig.days,
      now,
    );

  const trendPoints =
    dailySeries.map(
      (row) => ({
        x: row.date.slice(5),
        y: row.cost,
      }),
    );

  /*
   * PROVIDER BREAKDOWN
   */

  const providerMap =
    new Map<
      string,
      {
        cost: number;
        tokens: number;
        requests: number;
      }
    >();

  for (const row of usageRows) {
    const current =
      providerMap.get(
        row.provider_id,
      ) ?? {
        cost: 0,
        tokens: 0,
        requests: 0,
      };

    current.cost += Number(
      row.total_cost_usd ??
        0,
    );

    current.tokens += Number(
      row.total_tokens ??
        0,
    );

    current.requests += Number(
      row.request_count ??
        0,
    );

    providerMap.set(
      row.provider_id,
      current,
    );
  }

  const providerBreakdown =
    Array.from(
      providerMap.entries(),
    )
      .map(
        ([
          providerId,
          metrics,
        ]) => ({
          providerId,
          provider:
            providerNameById.get(
              providerId,
            ) ??
            "Unknown provider",
          ...metrics,
        }),
      )
      .sort(
        (a, b) =>
          b.cost - a.cost,
      );

  const providerPie =
    providerBreakdown
      .filter(
        (provider) =>
          provider.cost > 0,
      )
      .slice(0, 6)
      .map(
        (
          provider,
          index,
        ) => ({
          label:
            provider.provider,
          value:
            provider.cost,
          color:
            PIE_COLORS[
              index
            ],
        }),
      );

  /*
   * TOP MODELS
   */

  const topModelsMap =
    new Map<
      string,
      {
        cost: number;
        tokens: number;
        requests: number;
      }
    >();

  for (const row of usageRows) {
    const model =
      extractModel(
        row.raw_response,
      );

    const current =
      topModelsMap.get(
        model,
      ) ?? {
        cost: 0,
        tokens: 0,
        requests: 0,
      };

    current.cost += Number(
      row.total_cost_usd ??
        0,
    );

    current.tokens += Number(
      row.total_tokens ??
        0,
    );

    current.requests += Number(
      row.request_count ??
        0,
    );

    topModelsMap.set(
      model,
      current,
    );
  }

  const topModels =
    Array.from(
      topModelsMap.entries(),
    )
      .map(
        ([model, metrics]) => ({
          model,
          ...metrics,
        }),
      )
      .sort(
        (a, b) =>
          b.cost - a.cost,
      )
      .slice(0, 5);

  /*
   * RECENT USAGE
   */

  const recentRows =
    usageRows
      .slice(0, 8)
      .map((row) => ({
        ...row,
        provider:
          providerNameById.get(
            row.provider_id,
          ) ??
          "Unknown provider",
        model:
          extractModel(
            row.raw_response,
          ),
      }));

  const periodLabel =
    periodConfig.label;

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
                Monitor AI spend, usage, providers and budget
                health from one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

              <DashboardPeriodFilter
                value={period}
              />

              <Link
                href="/dashboard/stats"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Open analytics
                <ArrowRight className="h-4 w-4" />
              </Link>

            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">

            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {periodLabel}
            </span>

            <span className="h-1 w-1 rounded-full bg-slate-300" />

            <span>
              {bounds.start}
              {" → "}
              {formatDateISO(
                new Date(
                  `${bounds.end}T00:00:00.000Z`,
                ),
              )}
            </span>

          </div>
        </div>
      </section>

      {/* KPI */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          label="Period spend"
          value={formatUsd(
            periodSpend,
          )}
          description={`Average ${formatUsd(avgDailySpend)} per day across ${periodConfig.days} days.`}
          icon={
            <CircleDollarSign className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Requests"
          value={formatNumber(
            periodRequests,
          )}
          description={`Recorded API requests in the ${periodLabel.toLowerCase()}.`}
          icon={
            <Activity className="h-5 w-5" />
          }
          tone={
            periodRequests > 0
              ? "positive"
              : "default"
          }
        />

        <MetricCard
          label="Tokens"
          value={formatNumber(
            periodTokens,
          )}
          description="Input and output token volume in the selected range."
          icon={
            <Layers3 className="h-5 w-5" />
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
              ? `${formatPercent(budgetUsedPct)} of the current monthly budget is used.`
              : "Set a monthly budget to enable budget tracking."
          }
          icon={
            <WalletCards className="h-5 w-5" />
          }
          tone={
            budgetTone
          }
        />

      </section>

      {/* TREND + BUDGET */}

      <section className="grid gap-6 xl:grid-cols-3">

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

          <SectionHeader
            eyebrow="Spending trend"
            title={`${periodLabel} spend`}
            description="Daily spend for the selected range."
            action={
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Period total
                </p>

                <p className="mt-1 text-base font-semibold text-slate-900">
                  {formatUsd(
                    periodSpend,
                  )}
                </p>
              </div>
            }
          />

          <div className="mt-6">
            {trendPoints.length ? (
              <LineChart
                points={trendPoints}
                height={300}
                stroke="#415a77"
                valueFormat="usd"
              />
            ) : (
              <EmptyState
                title="No spend data"
                description="The selected period does not contain any recorded usage."
              />
            )}
          </div>

        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <SectionHeader
            eyebrow="Budget"
            title="Budget health"
            description="Budget is always measured against the current month."
          />

          <div className="mt-6 rounded-3xl bg-slate-50 p-5">

            <div className="flex items-end justify-between gap-4">

              <div>
                <p className="text-xs font-medium text-slate-500">
                  {monthlyLimit > 0
                    ? monthLabel(
                        currentMonth,
                      )
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
                  budgetTone === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : budgetTone === "positive"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {budgetTone ===
                "warning"
                  ? "Watch closely"
                  : budgetTone ===
                      "positive"
                    ? "Healthy"
                    : "Not configured"}
              </div>

            </div>

            <div className="mt-6">

              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>
                  Used this month
                </span>

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
                  className={`h-full rounded-full ${
                    budgetTone ===
                    "warning"
                      ? "bg-amber-500"
                      : "bg-slate-700"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      budgetUsedPct,
                    )}%`,
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
                  Remaining
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {monthlyLimit > 0
                    ? formatUsd(
                        budgetRemaining,
                      )
                    : "—"}
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
            description={`Provider distribution for the ${periodLabel.toLowerCase()}.`}
            action={
              <Link
                href="/dashboard/providers"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                Manage providers
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">

            <div className="flex justify-center">
              {providerPie.length ? (
                <PieChart
                  data={providerPie}
                  size={210}
                />
              ) : (
                <EmptyState
                  title="No provider usage"
                  description="Provider distribution will appear after your first recorded request."
                />
              )}
            </div>

            <div className="space-y-4">

              {providerBreakdown.length ? (
                providerBreakdown
                  .slice(0, 5)
                  .map(
                    (
                      provider,
                    ) => {
                      const share =
                        periodSpend >
                        0
                          ? (provider.cost /
                              periodSpend) *
                            100
                          : 0;

                      const topCost =
                        providerBreakdown[0]
                          ?.cost ??
                        0;

                      const relative =
                        topCost > 0
                          ? (provider.cost /
                              topCost) *
                            100
                          : 0;

                      return (
                        <div
                          key={
                            provider.providerId
                          }
                        >
                          <div className="flex items-center justify-between gap-4">

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {
                                  provider.provider
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatPercent(
                                  share,
                                )}{" "}
                                of period spend
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-semibold text-slate-950">
                              {formatUsd(
                                provider.cost,
                              )}
                            </p>

                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-700"
                              style={{
                                width: `${relative}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )
              ) : (
                <EmptyState
                  title="No provider data"
                  description="Connect a provider and record usage to populate this section."
                />
              )}

            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <SectionHeader
            eyebrow="Forecast"
            title="Month-end projection"
            description="Forecast remains based on the current month's trajectory."
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
                {
                  forecast.days_remaining
                }
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
                {forecast.will_exceed ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>

              <div>

                <p className="text-sm font-semibold text-slate-800">
                  {forecast.will_exceed
                    ? "Forecast is above budget"
                    : "Forecast is within budget"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {forecast.will_exceed
                    ? "Current spending trajectory suggests a possible monthly overrun."
                    : "Current spending trajectory is not projecting a monthly budget overrun."}
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
            description={`Highest-cost models in the ${periodLabel.toLowerCase()}.`}
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
                description="Model-level spend will appear after usage is recorded."
              />
            )}

          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <SectionHeader
            eyebrow="Snapshot"
            title="Selected period"
            description="Quick context for the active date range."
          />

          <div className="mt-6 space-y-3">

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Spend
                </span>

                <CircleDollarSign className="h-4 w-4 text-slate-400" />
              </div>

              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatUsd(
                  periodSpend,
                )}
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Average daily spend
                </span>

                <Activity className="h-4 w-4 text-slate-400" />
              </div>

              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatUsd(
                  avgDailySpend,
                )}
              </p>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Providers
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatNumber(
                    providerBreakdown.length,
                  )}
                </p>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Models
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatNumber(
                    topModelsMap.size,
                  )}
                </p>

              </div>

            </div>

            <Link
              href="/dashboard/api-management"
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <KeyRound className="h-4 w-4" />
                </div>

                <div>

                  <p className="text-sm font-semibold text-slate-800">
                    API infrastructure
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Projects, environments and keys
                  </p>

                </div>

              </div>

              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />

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
              anomalies.length ===
              1
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
                  const average =
                    Number(
                      anomaly.rolling_avg ??
                        0,
                    );

                  const multiplier =
                    average > 0
                      ? anomaly.spend /
                        average
                      : 0;

                  return (
                    <div
                      key={`${anomaly.date}-${index}`}
                      className="rounded-2xl border border-amber-200 bg-white p-4"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-2">

                          {anomaly.severity ===
                          "critical" ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                          )}

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
          description={`Latest recorded API activity within the ${periodLabel.toLowerCase()}.`}
          action={
            <Link
              href="/dashboard/stats"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              View detailed analytics
              <ArrowRight className="h-4 w-4" />
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
                          {formatUsd(
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
                description="No API activity exists in the selected date range."
              />
            )}

          </div>
        </div>
      </section>

    </div>
  );
}