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

const NotificationsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

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

  const routes: Array<{ href: string; label: string; icon?: string }> = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/dashboard/usage", label: "Usage", icon: "📈" },
    { href: "/dashboard/providers", label: "Providers", icon: "🔌" },
    { href: "/dashboard/billing", label: "Billing", icon: "💳" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-[#FEFEFE]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
        <div className="py-8 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-8 h-full">
            {/* Sidebar */}
            <aside className="bg-[#476E66] text-white rounded-2xl p-6 space-y-6 border border-[#DFDFE2] shadow-sm lg:sticky top-8 h-fit">
              <div title="This month spend">
                <div className="text-xs text-white/80 uppercase tracking-wider font-semibold mb-2">Current Month</div>
                <div className="text-3xl font-bold tabular-nums text-white mb-2">${monthSpend.toFixed(2)}</div>
                <div className="text-xs text-white/80 mb-4">of ${monthlyLimit.toFixed(2)} budget</div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-[#708A83] rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <nav className="space-y-1">
                {routes.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="bg-white/10 hover:bg-[#708A83] flex items-center gap-3 p-4 rounded-xl text-white hover:text-white border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-[1.02] group"
                  >
                    <span className="text-lg">{r.icon}</span>
                    <span className="font-medium group-hover:translate-x-1 transition-transform">{r.label}</span>
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm overflow-hidden">
              {/* Top Bar */}
              <div className="bg-[#F4F4F4] p-6 border-b border-[#DFDFE2]">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-[#BEC0BF] truncate">Signed in as</div>
                      <div className="text-sm font-semibold text-[#111111] truncate max-w-[300px]">
                        {profile?.email ?? user.email ?? ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      title="Notifications" 
                      className="p-2 text-[#BEC0BF] hover:text-[#708A83] hover:bg-[#708A83]/20 rounded-xl transition-all duration-200 hover:scale-110"
                    >
                      <NotificationsIcon />
                    </button>
                    <div className="bg-white/50 backdrop-blur-sm px-4 py-2 text-sm text-[#BEC0BF] rounded-xl border border-[#DFDFE2]">
                      Plan: <span className="font-bold text-[#111111]">{planLabel}</span>
                    </div>
                    <SignOutButton />
                  </div>
                </div>
              </div>

              {/* Content */}
              <main className="p-8">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
