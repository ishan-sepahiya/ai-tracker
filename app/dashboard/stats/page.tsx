"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  aggregateByProvider,
  getDailySpend,
  computeForecast,
} from "@/lib/analysis/engine";

import LineChart from "@/app/_components/charts/LineChart";
import PieChart from "@/app/_components/charts/PieChart";

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
  return user.id;
}

const StatBox = ({ 
  label, 
  value, 
  icon, 
  trend,
  color = "blue"
}: { 
  label: string; 
  value: string; 
  icon: string;
  trend?: { value: number; direction: "up" | "down" };
  color?: "blue" | "green" | "orange" | "purple";
}) => {
  const bgColor = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    orange: "bg-orange-50",
    purple: "bg-purple-50",
  }[color];

  const textColor = {
    blue: "text-blue-700",
    green: "text-green-700",
    orange: "text-orange-700",
    purple: "text-purple-700",
  }[color];

  return (
    <div className={`${bgColor} rounded-lg p-4 border border-current border-opacity-20`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${textColor} opacity-75 mb-1`}>{label}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
      {trend && (
        <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${
          trend.direction === "up" ? "text-red-600" : "text-green-600"
        }`}>
          <span>{trend.direction === "up" ? "↑" : "↓"}</span>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
};

export default async function StatsPage() {
  const userId = await getAuthedUserId();

  const now = new Date();
  const monthYear = monthYearUTC(now);
  
  const [breakdown, budgetRows, usageRecords] = await Promise.all([
    aggregateByProvider(userId, monthYear),
    supabaseAdmin.from("budgets").select("monthly_limit_usd").eq("user_id", userId),
    supabaseAdmin
      .from("usage_records")
      .select("*")
      .eq("user_id", userId)
      .eq("month_year", monthYear),
  ]);

  const monthSpend = breakdown.reduce((sum, p) => sum + Number(p.total_cost_usd ?? 0), 0);
  const monthlyLimit = (budgetRows.data ?? []).reduce(
    (sum, r) => sum + Number(r.monthly_limit_usd ?? 0),
    0
  );
  const remainingBudget = Math.max(0, monthlyLimit - monthSpend);

  const dailySpend = await getDailySpend(userId);
  const forecast = await computeForecast(userId);

  // Calculate averages and stats
  const daysInMonth = dailySpend.length;
  const avgDailySpend = daysInMonth > 0 ? monthSpend / daysInMonth : 0;
  const maxDailySpend = Math.max(...dailySpend.map(d => d.total_cost_usd), 0);
  const minDailySpend = Math.min(...dailySpend.map(d => d.total_cost_usd), Infinity);

  // Get last month data for comparison
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthYear = monthYearUTC(lastMonth);
  const lastMonthBreakdown = await aggregateByProvider(userId, lastMonthYear);
  const lastMonthSpend = lastMonthBreakdown.reduce((sum, p) => sum + Number(p.total_cost_usd ?? 0), 0);
  const monthChange = lastMonthSpend > 0 ? ((monthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

  // Provider statistics
  const totalRecords = usageRecords.data?.length ?? 0;
  const uniqueModels = new Set(
    (usageRecords.data ?? []).map((r: any) => r.model).filter(Boolean)
  ).size;
  const uniqueProviders = breakdown.length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600">Detailed insights into your AI spending patterns</p>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox 
          label="Total Spend" 
          value={`$${monthSpend.toFixed(0)}`}
          icon="💰"
          trend={{ value: monthChange, direction: monthChange > 0 ? "up" : "down" }}
          color="blue"
        />
        <StatBox 
          label="Daily Average" 
          value={`$${avgDailySpend.toFixed(2)}`}
          icon="📊"
          color="green"
        />
        <StatBox 
          label="Forecast (EOD)" 
          value={`$${forecast.projected_total_usd.toFixed(0)}`}
          icon="🎯"
          color="purple"
        />
        <StatBox 
          label="Budget Remaining" 
          value={`$${remainingBudget.toFixed(0)}`}
          icon="💳"
          color="orange"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Daily Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Max Daily</span>
              <span className="font-bold text-gray-900">${maxDailySpend.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Min Daily</span>
              <span className="font-bold text-gray-900">${minDailySpend.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg Daily</span>
              <span className="font-bold text-gray-900">${avgDailySpend.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-gray-600">Days Tracked</span>
              <span className="font-bold text-gray-900">{daysInMonth}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Usage Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">API Calls</span>
              <span className="font-bold text-gray-900">{totalRecords.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Models Used</span>
              <span className="font-bold text-gray-900">{uniqueModels}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Providers</span>
              <span className="font-bold text-gray-900">{uniqueProviders}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-gray-600">Total Tokens</span>
              <span className="font-bold text-gray-900">
                {(usageRecords.data ?? [])
                  .reduce((sum: number, r: any) => sum + (Number(r.tokens_used) || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Budget Status</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Usage</span>
                <span className="text-gray-900 font-bold text-sm">
                  {((monthSpend / monthlyLimit) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  style={{ width: `${Math.min(100, (monthSpend / monthlyLimit) * 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-gray-600">Spent</p>
                <p className="text-lg font-bold text-blue-600">${monthSpend.toFixed(0)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xs text-gray-600">Remaining</p>
                <p className="text-lg font-bold text-green-600">${remainingBudget.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Spend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Daily Spending Trend</h2>
          <p className="text-sm text-gray-600 mb-6">Daily AI API spending throughout the month</p>
          <LineChart points={dailySpend.map(d => ({ x: d.date, y: d.total_cost_usd }))} />
        </div>

        {/* Provider Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Provider Distribution</h2>
          <p className="text-sm text-gray-600 mb-6">Cost breakdown by provider</p>
          <PieChart 
            data={breakdown.map(p => ({
              label: p.provider_name,
              value: p.total_cost_usd,
              color: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][breakdown.indexOf(p) % 5]
            }))}
          />
        </div>
      </div>

      {/* Top Models */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Top Models by Cost</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {breakdown.map((provider, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                <span>{provider.provider_name}</span>
                <span className="text-2xl">🔌</span>
              </h3>
              <div className="space-y-3">
                {(usageRecords.data ?? [])
                  .filter((r: any) => r.provider === provider.provider_name)
                  .slice(0, 3)
                  .map((record: any, j: number) => (
                    <div key={j} className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-600">{record.model}</span>
                      <span className="font-bold text-gray-900">${Number(record.total_cost_usd || 0).toFixed(4)}</span>
                    </div>
                  ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-sm">
                  <span className="text-gray-600">Total: </span>
                  <span className="font-bold text-gray-900">${Number(provider.total_cost_usd).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Added */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Recent API Calls</h2>
          <p className="text-sm text-gray-600">Latest usage records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(usageRecords.data ?? []).slice(0, 15).map((record: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.provider}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{record.model}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{Number(record.tokens_used || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">${Number(record.total_cost_usd || 0).toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
