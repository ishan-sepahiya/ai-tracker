import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

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

  // Check authentication
  try {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } catch (err) {
    console.error("Auth check error:", err);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Allow all authenticated requests through for now
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};

