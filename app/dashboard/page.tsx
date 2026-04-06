"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureProfileRow } from "@/lib/auth/server";
import { ensureTrialSubscriptionAndOwnerTeamMember } from "@/lib/actions/subscriptions";
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
  
  // Ensure profile and subscription exist
  try {
    await ensureProfileRow(user.id, user.email ?? null);
    await ensureTrialSubscriptionAndOwnerTeamMember(user.id);
  } catch (err) {
    console.error("Profile/subscription creation failed in dashboard:", err);
    // Don't block dashboard access if profile creation fails
  }
  
  return user.id;
}

const MetricCard = ({ 
  title, 
  value, 
  change, 
  description,
  icon 
}: { 
  title: string; 
  value: string | number; 
  change?: number; 
  description?: string;
  icon?: string;
}) => {
  const isPositive = (change ?? 0) >= 0;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="text-xs text-gray-600 mt-2">{description}</p>
          )}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
      
      {change !== undefined && (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
          isPositive 
            ? 'bg-red-50 text-red-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(change)}%</span>
        </div>
      )}
    </div>
  );
};

export default async function DashboardPage() {
  const userId = await getAuthedUserId();

  const now = new Date();
  const monthYear = monthYearUTC(now);
  
  const [breakdown, providerRows, usageStats, budgetRows] = await Promise.all([
    aggregateByProvider(userId, monthYear),
    supabaseAdmin
      .from("usage_records")
      .select("provider, total_cost_usd")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .order("total_cost_usd", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("usage_records")
      .select("*")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin.from("budgets").select("monthly_limit_usd").eq("user_id", userId),
  ]);

  const monthSpend = breakdown.reduce((sum, p) => sum + Number(p.total_cost_usd ?? 0), 0);
  const monthlyLimit = (budgetRows.data ?? []).reduce(
    (sum, r) => sum + Number(r.monthly_limit_usd ?? 0),
    0
  );
  const remainingBudget = Math.max(0, monthlyLimit - monthSpend);
  const budgetUsedPct = monthlyLimit > 0 ? (monthSpend / monthlyLimit) * 100 : 0;

  const dailySpend = await getDailySpend(userId);
  const forecast = await computeForecast(userId);
  const anomalies = await detectAnomalies(userId);
  const comparisons = await compareProviderCosts(userId, monthYear);

  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthYear = monthYearUTC(lastMonth);
  const lastMonthBreakdown = await aggregateByProvider(userId, lastMonthYear);
  const lastMonthSpend = lastMonthBreakdown.reduce((sum, p) => sum + Number(p.total_cost_usd ?? 0), 0);

  const monthChange = lastMonthSpend > 0 ? ((monthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;
  const currentDaySpend = dailySpend[dailySpend.length - 1]?.total_cost_usd ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Track your AI spending across all providers</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 mb-1">Current Month</p>
          <p className="text-3xl font-bold text-gray-900">{monthYear.split('-').join('/')}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Spend" 
          value={`$${monthSpend.toFixed(2)}`}
          icon="💰"
          change={monthChange}
          description={`vs ${lastMonthSpend > 0 ? '+' : ''}${monthChange.toFixed(1)}% last month`}
        />
        <MetricCard 
          title="Today's Spend" 
          value={`$${currentDaySpend.toFixed(2)}`}
          icon="📊"
          description="Today's usage"
        />
        <MetricCard 
          title="Budget Remaining" 
          value={`$${remainingBudget.toFixed(2)}`}
          icon="💳"
          change={-budgetUsedPct}
          description={`${budgetUsedPct.toFixed(0)}% of budget used`}
        />
        <MetricCard 
          title="Forecast (EOD)" 
          value={`$${forecast.projected_total_usd.toFixed(2)}`}
          icon="🎯"
          description="Predicted month-end spend"
        />
      </div>

      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Daily Spend</h2>
              <p className="text-sm text-gray-600">Daily AI API spending this month</p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
          <LineChart points={dailySpend.map(d => ({ x: d.date, y: d.total_cost_usd }))} />
        </div>

        {/* Provider Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Provider Split</h2>
              <p className="text-sm text-gray-600">Cost distribution</p>
            </div>
            <div className="text-3xl">🔌</div>
          </div>
          <PieChart 
            data={breakdown.map((p, i) => ({
              label: p.provider_name,
              value: p.total_cost_usd,
              color: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][i % 5]
            }))}
          />
          <div className="mt-6 space-y-3">
            {breakdown.slice(0, 4).map((provider, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{provider.provider_name}</span>
                <span className="font-medium text-gray-900">${Number(provider.total_cost_usd ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anomalies and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Anomalies Detected</h2>
                <p className="text-sm text-gray-600">{anomalies.length} unusual spending pattern(s)</p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
            <div className="space-y-3">
              {anomalies.slice(0, 3).map((anomaly, i) => (
                <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-orange-900 mb-1">
                    {new Date(anomaly.date).toLocaleDateString()} - ${anomaly.spend.toFixed(2)}
                  </p>
                  <p className="text-xs text-orange-700">
                    {anomaly.severity === 'critical' ? '🔴 Critical' : '🟠 Warning'} - {Math.round((anomaly.spend / anomaly.rolling_avg) * 100)}% above average
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Providers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Top Providers</h2>
              <p className="text-sm text-gray-600">Highest spenders this month</p>
            </div>
            <div className="text-3xl">🏆</div>
          </div>
          <div className="space-y-4">
            {breakdown.slice(0, 4).map((provider, i) => {
              const providerCost = Number(provider.total_cost_usd ?? 0);
              const maxCost = Math.max(...breakdown.map(p => Number(p.total_cost_usd ?? 0)));
              const percentage = maxCost > 0 ? (providerCost / maxCost) * 100 : 0;
              
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{provider.provider_name}</span>
                    <span className="text-sm font-bold text-gray-900">${providerCost.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Usage */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Recent Usage</h2>
          <p className="text-sm text-gray-600">Latest API calls and costs</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(usageStats.data ?? []).map((stat: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.provider}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{stat.model}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{Number(stat.tokens_used ?? 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">${Number(stat.total_cost_usd ?? 0).toFixed(4)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(stat.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
