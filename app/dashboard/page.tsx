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
  <div className="glass-card p-8 rounded-2xl border border-[#D9D9D9]/30 hover:shadow-xl transition-all duration-200 group">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#D9D9D9] uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {description && (
          <p className="text-sm text-[#D9D9D9]">{description}</p>
        )}
      </div>
      {change !== undefined && (
        <div className={`text-sm font-semibold px-3 py-1 rounded-xl ${
          change >= 0 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/50 border' 
            : 'bg-red-500/20 text-red-400 border-red-400/50 border'
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
    color: ['#3C6E71', '#284B63', '#D9D9D9', '#FFFFFF', '#FF6B6B'][i % 5],
  }));

  const linePoints = Array.from({length: 30}, (_, i) => ({
    x: `2024-${String(1 + i).padStart(2,'0')}-01`,
    y: 10 + Math.sin(i / 3) * 5 + i * 0.3
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="text-[#D9D9D9]">Welcome back. Here's what's happening with your AI spend.</p>
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
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-lg font-medium text-white mb-6">Provider Breakdown</h2>
          <PieChart title="Cost distribution" data={pieData} />
        </div>
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-lg font-medium text-white mb-6">Daily Spend Trend</h2>
          <LineChart points={linePoints} />
        </div>
      </div>

      {/* Usage Table */}
      <div className="glass-card p-8 rounded-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-medium text-white">Recent Usage</h2>
          <Link href="#" className="text-sm font-medium text-[#3C6E71] hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D9D9D9]/30">
                <th className="text-left py-4 pr-6 text-sm font-medium text-[#D9D9D9]">Model</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#D9D9D9]">Tokens</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#D9D9D9]">Cost</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#D9D9D9]">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D9D9]/10">
              {[
                {model: 'gpt-4o', tokens: '12.4k', cost: '$2.34', requests: 45},
                {model: 'claude-3-opus', tokens: '8.7k', cost: '$4.12', requests: 23},
                {model: 'bedrock-titan', tokens: '5.2k', cost: '$1.89', requests: 67},
                {model: 'vertex-gemini', tokens: '3.1k', cost: '$0.76', requests: 34},
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[#284B63]/20 transition-colors">
                  <td className="py-4 pr-6 text-white font-medium">{row.model}</td>
                  <td className="py-4 px-6 text-[#D9D9D9]">{row.tokens}</td>
                  <td className="py-4 px-6 font-mono text-[#3C6E71] font-semibold">${row.cost}</td>
                  <td className="py-4 px-6 text-[#D9D9D9]">{row.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
