import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { aggregateByProvider } from "@/lib/analysis/engine";
import SignOutButton from "@/app/_components/auth/SignOutButton";

function monthYearUTC(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getAuthedUser() {
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
  return data.user ?? null;
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const monthYear = monthYearUTC(new Date());

  const profilePromise = supabaseAdmin
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", user.id)
    .maybeSingle();

  const subscriptionPromise = supabaseAdmin
    .from("subscriptions")
    .select("plan_id,status,trial_ends_at,current_period_end")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    profilePromise,
    subscriptionPromise,
  ]);

  const planPromise = subscription?.plan_id
    ? supabaseAdmin.from("subscription_plans").select("name").eq("id", subscription.plan_id).maybeSingle()
    : Promise.resolve({ data: null });

  const { data: planRow } = await planPromise;

  const planName = planRow?.name ?? "trial";
  const planLabel = planName === "trial" ? "Trial" : planName[0].toUpperCase() + planName.slice(1);

  const [breakdown, budgetRows] = await Promise.all([
    aggregateByProvider(user.id, monthYear),
    supabaseAdmin.from("budgets").select("monthly_limit_usd").eq("user_id", user.id),
  ]);

  const monthSpend = breakdown.reduce((sum, p) => sum + Number(p.total_cost_usd ?? 0), 0);
  const monthlyLimit = (budgetRows.data ?? []).reduce(
    (sum, r) => sum + Number(r.monthly_limit_usd ?? 0),
    0
  );

  const progressPct = monthlyLimit > 0 ? Math.min(100, (monthSpend / monthlyLimit) * 100) : 0;

  const routes: Array<{ href: string; label: string; icon: string }> = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/dashboard/stats", label: "Analytics", icon: "📈" },
    { href: "/dashboard/providers", label: "Providers", icon: "🔌" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <span className="text-gray-900">AI Tracker</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100">
              <span className="text-sm text-gray-600">{profile?.email ?? user.email ?? ""}</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {(profile?.email ?? user.email ?? "").charAt(0).toUpperCase()}
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Budget Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-2">This Month</p>
              <p className="text-3xl font-bold text-gray-900 mb-3">${monthSpend.toFixed(0)}</p>
              <p className="text-sm text-gray-600 mb-3">of ${monthlyLimit.toFixed(0)} budget</p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">{progressPct.toFixed(0)}% used</p>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 mb-4">Navigation</p>
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors group"
                >
                  <span className="text-lg">{route.icon}</span>
                  <span className="text-sm font-medium">{route.label}</span>
                </Link>
              ))}
            </nav>

            {/* Plan Badge */}
            <div className="pt-4 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-2">Current Plan</p>
                <p className="text-lg font-bold text-blue-600 mb-2">{planLabel}</p>
                <button className="w-full text-xs font-medium text-blue-600 hover:text-blue-700 py-1.5 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors">
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
