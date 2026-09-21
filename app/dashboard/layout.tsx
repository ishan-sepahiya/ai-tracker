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
          (await cookieStorePromise).getAll().map((c) => ({
            name: c.name,
            value: c.value,
          })),

        setAll: async () => {},
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user ?? null;
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getAuthedUser();

  if (!user) {
    redirect("/login");
  }

  const monthYear = monthYearUTC(new Date());

  /*
   * --------------------------------------------------------------------------
   * User / subscription information
   * --------------------------------------------------------------------------
   */

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
    ? supabaseAdmin
        .from("subscription_plans")
        .select("name")
        .eq("id", subscription.plan_id)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const { data: planRow } = await planPromise;

  const planName = planRow?.name ?? "trial";

  const planLabel =
    planName === "trial"
      ? "Trial"
      : planName[0].toUpperCase() + planName.slice(1);

  /*
   * --------------------------------------------------------------------------
   * Budget information
   * --------------------------------------------------------------------------
   */

  const [breakdown, budgetRows] = await Promise.all([
    aggregateByProvider(user.id, monthYear),

    supabaseAdmin
      .from("budgets")
      .select("monthly_limit_usd")
      .eq("user_id", user.id),
  ]);

  const monthSpend = breakdown.reduce(
    (sum, p) => sum + Number(p.total_cost_usd ?? 0),
    0
  );

  const monthlyLimit = (budgetRows.data ?? []).reduce(
    (sum, r) => sum + Number(r.monthly_limit_usd ?? 0),
    0
  );

  const progressPct =
    monthlyLimit > 0
      ? Math.min(100, (monthSpend / monthlyLimit) * 100)
      : 0;

  /*
   * --------------------------------------------------------------------------
   * Navigation
   * --------------------------------------------------------------------------
   */

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
    },
    {
      href: "/dashboard/stats",
      label: "Analytics",
    },
    {
      href: "/dashboard/api-management",
      label: "API Management",
    },
    {
      href: "/dashboard/providers",
      label: "Providers",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
    },
  ];

  const displayEmail = profile?.email ?? user.email ?? "";

  const userInitial = displayEmail
    ? displayEmail.charAt(0).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ================================================================== */}
      {/* TOP NAVIGATION                                                     */}
      {/* ================================================================== */}

      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">

        <div className="mx-auto flex min-h-[72px] w-full max-w-[1600px] items-center px-6">

          {/* -------------------------------------------------------------- */}
          {/* LOGO                                                           */}
          {/* -------------------------------------------------------------- */}

          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white shadow-sm">
              AI-t
            </div>

            <span className="text-lg font-bold tracking-tight text-gray-900">
              AI Tracker
            </span>
          </Link>

          {/* -------------------------------------------------------------- */}
          {/* NAVIGATION                                                     */}
          {/* -------------------------------------------------------------- */}

          <nav className="ml-10 hidden items-center gap-1 md:flex">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="
                  rounded-lg
                  px-4
                  py-2.5
                  text-sm
                  font-medium
                  text-gray-600
                  transition-colors
                  hover:bg-gray-100
                  hover:text-gray-900
                "
              >
                {route.label}
              </Link>
            ))}
          </nav>

          {/* -------------------------------------------------------------- */}
          {/* RIGHT SIDE                                                     */}
          {/* -------------------------------------------------------------- */}

          <div className="ml-auto flex items-center gap-3">

            {/* User information */}

            <div className="hidden items-center gap-3 rounded-lg px-2 py-1.5 sm:flex">

              <span className="max-w-[220px] truncate text-sm text-gray-600">
                {displayEmail}
              </span>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {userInitial}
              </div>

            </div>

            {/* Divider */}

            <div className="hidden h-7 w-px bg-gray-200 sm:block" />

            {/* Sign out */}

            <SignOutButton />

          </div>

        </div>

        {/* ---------------------------------------------------------------- */}
        {/* MOBILE NAVIGATION                                                */}
        {/* ---------------------------------------------------------------- */}

        <div className="border-t border-gray-100 px-4 py-2 md:hidden">

          <nav className="flex gap-1 overflow-x-auto">

            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="
                  shrink-0
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  font-medium
                  text-gray-600
                  transition-colors
                  hover:bg-gray-100
                  hover:text-gray-900
                "
              >
                {route.label}
              </Link>
            ))}

          </nav>

        </div>

      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT                                                       */}
      {/* ================================================================== */}

      <main className="min-h-[calc(100vh-72px)]">

        <div className="mx-auto w-full max-w-[1600px] px-6 py-8 lg:px-8">

          {children}

        </div>

      </main>

    </div>
  );
}