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

const MetricCard = ({ title, value, change, description }: { 
  title: string; 
  value: string | number; 
  change?: number; 
  description?: string;
}) => (
  <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm hover:shadow-md transition-all duration-200 p-8 group">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#BEC0BF] uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-[#111111]">{value}</p>
        {description && (
          <p className="text-sm text-[#BEC0BF]">{description}</p>
        )}
      </div>
      {change !== undefined && (
        <div className={`text-sm font-semibold px-3 py-1 rounded-xl ${
          change >= 0 
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200/50' 
            : 'bg-red-500/10 text-red-600 border border-red-200/50'
        }`}>
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
  </div>
);

export default async function DashboardPage() {
  const userId = await getAuthedUserId();

  const now = new Date();
  const monthYear = monthYearUTC(now);
  
  const [breakdown, providerRows, usageStats, budgetRows] = await Promise.all([
    aggregateByProvider(userId, monthYear),
    supabaseAdmin.from("providers").select("id,provider_name,display_name").eq("user_id", userId),
    supabaseAdmin.from("usage_records")
      .select("total_tokens,total_cost_usd", { count: 'exact', head: true })
      .eq("user_id", userId),
    supabaseAdmin.from("budgets").select("monthly_limit_usd").eq("user_id", userId),
  ]);

  const totalSpend = breakdown.reduce((sum, p) => sum + Number(p.total_cost_usd ?? 0), 0);
  const totalTokens = usageStats.data?.reduce((sum, r) => sum + Number(r.total_tokens ?? 0), 0) ?? 0;
  const activeProviders = providerRows.data?.length ?? 0;
  const monthlyBudget = budgetRows.data?.reduce((sum, r) => sum + Number(r.monthly_limit_usd ?? 0), 0) ?? 0;
  const budgetRemaining = Math.max(0, monthlyBudget - totalSpend);

  // Charts data (simplified)
  const pieData = breakdown.slice(0, 5).map((p, i) => ({
    label: p.provider_name,
    value: Number(p.total_cost_usd ?? 0),
    color: ['#708A83', '#476E66', '#DFDFE2', '#BEC0BF', '#FF6B6B'][i % 5],
  }));

  const linePoints = Array.from({length: 30}, (_, i) => ({
    x: `2024-${String(1 + i).padStart(2,'0')}-01`,
    y: 10 + Math.sin(i / 3) * 5 + i * 0.3
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#FEFEFE]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111111]">Dashboard</h1>
          <p className="text-[#BEC0BF]">Welcome back. Here's what's happening with your AI spend.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Spend" 
          value={`$${totalSpend.toFixed(2)}`}
          description={monthYear}
        />
        <MetricCard 
          title="Tokens Used" 
          value={totalTokens.toLocaleString()}
          description="this month"
        />
        <MetricCard 
          title="Active Providers" 
          value={activeProviders}
          change={5}
        />
        <MetricCard 
          title="Budget Remaining" 
          value={`$${budgetRemaining.toFixed(2)}`}
          description={monthlyBudget > 0 ? `${((budgetRemaining/monthlyBudget)*100).toFixed(0)}% left` : 'Set budget'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-8">
          <h2 className="text-lg font-medium text-[#111111] mb-6">Provider Breakdown</h2>
          <PieChart title="Cost distribution" data={pieData} />
        </div>
        <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-8">
          <h2 className="text-lg font-medium text-[#111111] mb-6">Daily Spend Trend</h2>
          <LineChart points={linePoints} />
        </div>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-medium text-[#111111]">Recent Usage</h2>
          <Link href="#" className="text-sm font-medium text-[#708A83] hover:text-[#476E66] transition-colors">
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#DFDFE2]">
                <th className="text-left py-4 pr-6 text-sm font-medium text-[#BEC0BF]">Model</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#BEC0BF]">Tokens</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#BEC0BF]">Cost</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#BEC0BF]">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFDFE2]/30">
              {[
                {model: 'gpt-4o', tokens: '12.4k', cost: '$2.34', requests: 45},
                {model: 'claude-3-opus', tokens: '8.7k', cost: '$4.12', requests: 23},
                {model: 'bedrock-titan', tokens: '5.2k', cost: '$1.89', requests: 67},
                {model: 'vertex-gemini', tokens: '3.1k', cost: '$0.76', requests: 34},
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[#F4F4F4] transition-colors">
                  <td className="py-4 pr-6 text-[#111111] font-medium">{row.model}</td>
                  <td className="py-4 px-6 text-[#BEC0BF]">{row.tokens}</td>
                  <td className="py-4 px-6 font-mono text-[#708A83] font-semibold">${row.cost}</td>
                  <td className="py-4 px-6 text-[#BEC0BF]">{row.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
