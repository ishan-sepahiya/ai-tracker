"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase-client";
import { createProfile } from "@/lib/actions/auth";

type SignupState = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignupPage() {
  const router = useRouter();
  const nextPath = "/onboarding";

  const [state, setState] = useState<SignupState>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (state.password !== state.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (state.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: state.email.trim(),
        password: state.password,
      });

      if (signUpError) throw signUpError;

      const user = data.user;
      if (user) {
        try {
          await createProfile(user.id, user.email ?? null);
        } catch (err) {
          // Profile creation failed, but we can still continue
          // The profile will be created when they confirm their email
          console.error("Profile creation during signup failed:", err);
          setError("Signup initiated. Please check your email to confirm.");
          setLoading(false);
          return;
        }
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
      } else {
        // Email confirmation required
        setError("Please check your email to confirm your signup");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
              Sign in
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
              <h1 className="text-4xl font-bold mb-3">Start free today</h1>
              <p className="text-gray-600">Monitor your AI spending across all providers</p>
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={state.password}
                  onChange={(e) =>
                    setState((s) => ({ ...s, password: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={state.confirmPassword}
                  onChange={(e) =>
                    setState((s) => ({ ...s, confirmPassword: e.target.value }))
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

              <div className="flex items-start gap-3 text-xs text-gray-600">
                <input type="checkbox" id="terms" className="mt-1" required />
                <label htmlFor="terms">
                  I agree to the <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a> and{" "}
                  <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Create free account"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or sign up with</span>
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
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Right - Info */}
        <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-6 py-12">
          <div className="max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Get started in 3 minutes</h2>
              <p className="text-gray-600 leading-relaxed">
                Sign up, connect your AI provider APIs, and start tracking costs immediately.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  num: "1",
                  title: "Create your account",
                  desc: "Quick signup with email or Google"
                },
                {
                  num: "2",
                  title: "Connect providers",
                  desc: "Add OpenAI, Anthropic, AWS, GCP keys"
                },
                {
                  num: "3",
                  title: "Start tracking",
                  desc: "See your AI spending in real-time"
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex-shrink-0">
                    {item.num}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-300">
              <p className="text-sm text-gray-600 mb-4">
                <strong>No credit card required.</strong> Get your 1 month free trial today.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
