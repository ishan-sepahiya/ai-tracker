"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

import type { OnboardingProviderInput } from "@/lib/actions/onboarding";
import {
  connectAIProviders,
  saveNotificationPreferences,
  setMonthlyBudget,
  markOnboardingComplete,
} from "@/lib/actions/onboarding";
import { createProfile } from "@/lib/actions/auth";
import { supabase } from "@/lib/supabase-client";

type WizardStep = 0 | 1 | 2 | 3;

const SUBSCRIPTION_PLANS = [
  {
    id: "trial",
    name: "Trial",
    description: "Perfect for getting started",
    monthlyPrice: 0,
    features: ["1 AI provider", "1 team member", "$50 monthly limit", "Email alerts"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For active teams",
    monthlyPrice: 29,
    features: ["Unlimited providers", "5 team members", "$500 monthly limit", "Email alerts", "API access"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom for your needs",
    monthlyPrice: null,
    features: ["Unlimited everything", "Custom team members", "Custom budget", "Priority support"],
  },
];

const PROVIDERS: Array<{
  providerName: OnboardingProviderInput["providerName"];
  displayName: string;
}> = [
  { providerName: "openai", displayName: "OpenAI" },
  { providerName: "bedrock", displayName: "AWS Bedrock" },
  { providerName: "vertex", displayName: "GCP Vertex" },
  { providerName: "anthropic", displayName: "Anthropic" },
  { providerName: "other", displayName: "Other" },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Ensure profile is created when component mounts
  useEffect(() => {
    async function ensureProfile() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          console.error("Not authenticated");
          return;
        }

        // Try to create profile if it doesn't exist
        await createProfile(userData.user.id, userData.user.email ?? null);
      } catch (err) {
        // Profile might already exist or have a temporary error - don't block onboarding
        console.error("Profile creation error (non-blocking):", err);
      }
    }

    ensureProfile();
  }, []);

  const [selectedProviders, setSelectedProviders] = useState<
    Array<{ providerName: OnboardingProviderInput["providerName"]; displayName: string; apiKey: string }>
  >([]);

  const [monthlyLimitUsd, setMonthlyLimitUsd] = useState<number>(50);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [alertThresholdPct, setAlertThresholdPct] = useState<number>(80);

  const providerNames = useMemo(
    () => selectedProviders.map((p) => p.providerName),
    [selectedProviders]
  );

  function toggleProvider(providerName: OnboardingProviderInput["providerName"], displayName: string) {
    setError(null);
    setSelectedProviders((prev) => {
      const exists = prev.some((p) => p.providerName === providerName);
      if (exists) {
        return prev.filter((p) => p.providerName !== providerName);
      }
      return [...prev, { providerName, displayName, apiKey: "" }];
    });
  }

  async function onNextFromStep1() {
    setError(null);
    setLoading(true);
    try {
      const providers: OnboardingProviderInput[] = selectedProviders.map(
        (p) => ({
          providerName: p.providerName,
          displayName: p.displayName,
          apiKey: p.apiKey,
        })
      );
      await connectAIProviders({ providers });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect providers");
    } finally {
      setLoading(false);
    }
  }

  async function onNextFromStep2() {
    setError(null);
    setLoading(true);
    try {
      await setMonthlyBudget({
        monthlyLimitUsd,
        providerNames,
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save budget");
    } finally {
      setLoading(false);
    }
  }

  async function onFinish() {
    setError(null);
    setLoading(true);
    try {
      await saveNotificationPreferences({
        providerNames,
        alertThresholdPct,
        emailEnabled,
      });
      // Mark onboarding as completed
      await markOnboardingComplete();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notification preferences");
    } finally {
      setLoading(false);
    }
  }

  async function onSelectPlan() {
    setError(null);
    setLoading(true);
    try {
      // TODO: Save selected plan to database if needed
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-zinc-400">Onboarding</div>
        <div className="text-2xl font-semibold">Set up your usage tracking</div>
      </div>

      <div className="flex gap-3 items-center">
        {[0, 1, 2, 3].map((i) => {
          const active = step === i;
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={[
                  "w-8 h-8 rounded-full border flex items-center justify-center text-sm",
                  active
                    ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                    : step > i
                      ? "border-zinc-700 bg-zinc-900 text-zinc-200"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400",
                ].join(" ")}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
          <div className="text-lg font-medium">Choose Your Plan</div>
          <div className="text-sm text-zinc-400 mb-6">
            Select a plan to get started. You can upgrade anytime.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => {
                  setSelectedPlan(plan.id);
                  onSelectPlan();
                }}
                disabled={loading}
                className={[
                  "rounded-xl border p-6 text-left transition",
                  selectedPlan === plan.id
                    ? "border-zinc-500 bg-zinc-900/60"
                    : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700",
                ].join(" ")}
              >
                <div className="font-semibold text-zinc-50 mb-1">{plan.name}</div>
                <div className="text-xs text-zinc-400 mb-4">{plan.description}</div>
                <div className="text-lg font-bold text-zinc-50 mb-4">
                  {plan.monthlyPrice === null ? (
                    <span>Custom pricing</span>
                  ) : plan.monthlyPrice === 0 ? (
                    <span>Free</span>
                  ) : (
                    <span>${plan.monthlyPrice}/month</span>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                      <span className="text-zinc-500 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onSelectPlan}
            disabled={loading || !selectedPlan}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
          >
            {loading ? "Continuing..." : "Continue"}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="text-lg font-medium">Connect AI Providers</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDERS.map((p) => {
              const selected = selectedProviders.some((sp) => sp.providerName === p.providerName);
              return (
                <button
                  key={p.providerName}
                  type="button"
                  onClick={() => toggleProvider(p.providerName, p.displayName)}
                  className={[
                    "rounded-xl border px-4 py-3 text-left transition",
                    selected
                      ? "border-zinc-500 bg-zinc-900/60"
                      : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700",
                  ].join(" ")}
                >
                  <div className="font-medium text-zinc-50">{p.displayName}</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {selected ? "Selected" : "Connect"}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedProviders.length ? (
            <div className="space-y-4 pt-2">
              <div className="text-sm text-zinc-400">
                API keys are stored encrypted in `providers.api_key_encrypted`.
              </div>
              {selectedProviders.map((p) => (
                <div key={p.providerName} className="space-y-2">
                  <div className="text-sm text-zinc-200">{p.displayName} API key</div>
                  <input
                    type="password"
                    value={p.apiKey}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedProviders((prev) =>
                        prev.map((x) =>
                          x.providerName === p.providerName ? { ...x, apiKey: v } : x
                        )
                      );
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
                    placeholder="Paste your provider API key"
                    required
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onNextFromStep1}
              disabled={loading || selectedProviders.length === 0}
              className="flex-1 rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="text-lg font-medium">Set Monthly Budget</div>
          <div className="text-sm text-zinc-400">
            We’ll create one budget per selected provider.
          </div>

          <div className="space-y-2">
            <div className="text-sm text-zinc-200">Monthly limit (USD)</div>
            <input
              type="number"
              min={0}
              step={1}
              value={monthlyLimitUsd}
              onChange={(e) => setMonthlyLimitUsd(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(0)}
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-50 font-medium py-3 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNextFromStep2}
              disabled={loading || providerNames.length === 0}
              className="flex-1 rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="text-lg font-medium">Configure Notification Preferences</div>

          <div className="space-y-2">
            <div className="text-sm text-zinc-200">Email notifications</div>
            <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
              />
              <span className="text-sm text-zinc-100">
                Send alert emails when you cross the threshold
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-sm text-zinc-200">
                Threshold (% of monthly budget)
              </div>
              <div className="text-sm text-zinc-100 font-medium">
                {alertThresholdPct}%
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={alertThresholdPct}
              onChange={(e) => setAlertThresholdPct(Number(e.target.value))}
              className="w-full accent-zinc-300"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-50 font-medium py-3 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onFinish}
              disabled={loading || providerNames.length === 0}
              className="flex-1 rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
            >
              {loading ? "Finalizing..." : "Finish"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

