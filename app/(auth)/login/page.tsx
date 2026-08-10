"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase-client";
import { createProfile } from "@/lib/actions/auth";

type LoginState = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const nextPath = "/onboarding";

  const [state, setState] = useState<LoginState>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ensure profile exists on mount if already logged in
useEffect(() => {
  async function ensureProfile() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // A missing session is normal on the login page.
      if (userError) {
        if (userError.name === "AuthSessionMissingError") {
          return;
        }

        console.error("Error getting user:", userError);
        return;
      }

      // User is already authenticated.
      if (user) {
        console.log(
          "User already logged in, redirecting to onboarding"
        );

        await createProfile(
          user.id,
          user.email ?? null
        );

        router.push(nextPath);
        router.refresh();
      }
    } catch (err) {
      console.error("Unexpected profile sync error:", err);
    }
  }

  ensureProfile();
}, [router, nextPath]);


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("Attempting login with email:", state.email.trim());
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: state.email.trim(),
        password: state.password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        throw signInError;
      }

      console.log("Sign in successful, user ID:", data.user?.id);

      // Profile will be created automatically on onboarding/dashboard page
      // Don't wait for it here - just redirect
      console.log("Redirecting to:", nextPath);
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      console.error("Login error:", errorMsg, err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <span>AI Tracker</span>
          </Link>
          <div className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-600 font-medium hover:text-blue-700">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 min-h-[calc(100vh-81px)]">
        {/* Left - Form */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-3">Welcome back</h1>
              <p className="text-gray-600">Sign in to your account to track your AI spending</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={state.email}
                  onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                    Password
                  </label>
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                    Forgot?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={state.password}
                  onChange={(e) =>
                    setState((s) => ({ ...s, password: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or continue with</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              No account?{" "}
              <Link href="/signup" className="text-blue-600 font-medium hover:text-blue-700">
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Right - Info */}
        <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-6 py-12">
          <div className="max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Track your AI spending in seconds</h2>
              <p className="text-gray-600 leading-relaxed">
                Monitor costs across OpenAI, Anthropic, AWS, GCP and more. Set budgets, get alerts, optimize spending.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: "📊",
                  title: "Real-time Dashboard",
                  desc: "See all your AI costs at a glance"
                },
                {
                  icon: "🔔",
                  title: "Smart Alerts",
                  desc: "Know when you're approaching limits"
                },
                {
                  icon: "📈",
                  title: "Forecasting",
                  desc: "Predict your month-end spending"
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-3xl">{item.icon}</div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
