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

const PLANS = [
  {
    id: "trial",
    name: "Trial",
    description: "Perfect for getting started",
    price: "Free",
    features: ["5 AI providers", "Real-time usage tracking", "Basic alerts"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For power users",
    price: "$29/month",
    features: ["All providers", "Advanced analytics", "Priority alerts", "Team collaboration"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For organizations",
    price: "Custom",
    features: ["Unlimited everything", "Dedicated support", "Custom integrations", "SLA"],
  },
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

  async function onSelectPlan() {
    if (!selectedPlan) {
      setError("Please select a plan");
      return;
    }
    setError(null);
    setStep(1);
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
      
      // Mark onboarding as complete with selected plan
      if (selectedPlan) {
        await markOnboardingComplete(selectedPlan);
      }
      
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
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
          <div className="text-lg font-medium">Select Your Plan</div>
          <div className="text-sm text-zinc-400">
            Choose the plan that best fits your needs. You can upgrade or downgrade anytime.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={[
                  "rounded-xl border p-6 text-left transition flex flex-col gap-3",
                  selectedPlan === plan.id
                    ? "border-zinc-500 bg-zinc-900/60"
                    : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700",
                ].join(" ")}
              >
                <div>
                  <div className="font-semibold text-zinc-50 text-lg">{plan.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{plan.description}</div>
                </div>
                <div className="text-xl font-bold text-zinc-50">{plan.price}</div>
                <div className="flex-1" />
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                      <span className="text-zinc-500 mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onSelectPlan}
              disabled={loading || !selectedPlan}
              className="flex-1 rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
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
              onClick={() => setStep(0)}
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-50 font-medium py-3 disabled:opacity-60"
            >
              Back
            </button>
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

      {step === 2 ? (
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
              onClick={() => setStep(1)}
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

      {step === 3 ? (
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
              onClick={() => setStep(2)}
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

