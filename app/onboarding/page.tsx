"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markOnboardingComplete } from "@/lib/actions/onboarding";

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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelectPlan() {
    if (!selectedPlan) {
      setError("Please select a plan");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await markOnboardingComplete(selectedPlan);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete onboarding";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-gray-600">Select the plan that best fits your needs. You can upgrade or downgrade anytime.</p>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`rounded-lg border p-6 text-left transition-all ${
                selectedPlan === plan.id
                  ? "border-blue-500 bg-blue-50 shadow-lg"
                  : "border-gray-300 bg-white hover:border-gray-400"
              }`}
            >
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-6">{plan.price}</div>
              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSelectPlan}
            disabled={!selectedPlan || loading}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Setting up..." : "Continue to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

