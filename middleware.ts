import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Turn this on once Razorpay billing is integrated.
  // When false: allow any authenticated user through to /dashboard/*.
  const BILLING_ENABLED = false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () =>
        req.cookies.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      setAll: (cookiesToSet) => {
        for (const c of cookiesToSet) {
          res.cookies.set({
            name: c.name,
            value: c.value,
            ...(c.options ?? {}),
          });
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check if user is trying to access dashboard without completing onboarding
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    // Get user's onboarding status from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .single();

    if (profileError || profile === null) {
      // Profile doesn't exist, redirect to onboarding
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    if (!profile.onboarding_completed) {
      // Onboarding not completed, redirect
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  // Only gate dashboard routes; never block auth/billing pages.
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (BILLING_ENABLED) {
      const userId = data.user.id;

      const { data: subscription, error: subscriptionError } =
        await supabaseAdmin
          .from("subscriptions")
          .select("status, trial_ends_at")
          .eq("owner_user_id", userId)
          .maybeSingle();

      if (subscriptionError) {
        // If subscription lookup fails, do not hard-block: send to onboarding.
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }

      if (!subscription) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }

      const now = new Date();
      const status = subscription.status as
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | null;
      const trialEndsAt = subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at)
        : null;

      if (
        status === "trialing" &&
        trialEndsAt &&
        trialEndsAt.getTime() < now.getTime()
      ) {
        return NextResponse.redirect(
          new URL("/billing?expired=true", req.url)
        );
      }

      if (status === "past_due") {
        return NextResponse.redirect(
          new URL("/billing?past_due=true", req.url)
        );
      }

      if (status === "cancelled") {
        return NextResponse.redirect(
          new URL("/billing?cancelled=true", req.url)
        );
      }

      if (
        status === "active" ||
        (status === "trialing" &&
          trialEndsAt &&
          trialEndsAt.getTime() > now.getTime())
      ) {
        return res;
      }

      // Default: send to onboarding if status is unexpected.
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};

