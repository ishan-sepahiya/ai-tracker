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

  const routes: Array<{ href: string; label: string }> = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/providers", label: "Providers" },
    { href: "/dashboard/budget", label: "Budget" },
    { href: "/dashboard/alerts", label: "Alerts" },
    { href: "/dashboard/team", label: "Team" },
    { href: "/dashboard/billing", label: "Billing" },
    { href: "/dashboard/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-sm text-zinc-400 mb-4">This month</div>
              <div className="text-2xl font-semibold tabular-nums">${monthSpend.toFixed(2)}</div>
              <div className="text-xs text-zinc-500 mt-1">
                of ${monthlyLimit.toFixed(2)} budget
              </div>

              <div className="mt-4 h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-zinc-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="mt-5 border-t border-zinc-800 pt-4 space-y-2">
                {routes.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="block rounded-xl border border-transparent hover:border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:text-zinc-50"
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            </aside>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-zinc-400 truncate">Signed in</div>
                    <div className="text-sm font-medium text-zinc-50 truncate">
                      {profile?.email ?? user.email ?? ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100">
                    Plan: <span className="font-semibold">{planLabel}</span>
                  </div>
                  <SignOutButton />
                </div>
              </div>

              <main className="p-4 sm:p-6">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

