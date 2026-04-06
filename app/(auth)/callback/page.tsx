"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { createProfile } from "@/lib/actions/auth";

function AuthCallbackContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get the hash params from the URL
        // Supabase sends tokens in URL hash like: #access_token=...&token_type=bearer&type=...
        console.log("[AuthCallback] Handling callback");
        
        // Check if we have an active session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError);
          throw sessionError;
        }

        if (!sessionData?.session) {
          console.log("[AuthCallback] No session found, redirecting to login");
          router.push("/login");
          return;
        }

        const user = sessionData.session.user;
        console.log("[AuthCallback] User authenticated:", user.id);

        // Create profile if it doesn't exist
        try {
          await createProfile(user.id, user.email ?? null);
          console.log("[AuthCallback] Profile created successfully");
        } catch (profileErr) {
          console.error("[AuthCallback] Profile creation error:", profileErr);
          // Don't block - profile might already exist
        }

        // Redirect to onboarding
        console.log("[AuthCallback] Redirecting to onboarding");
        await router.push("/onboarding");
        router.refresh();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Authentication failed";
        console.error("[AuthCallback] Error:", errorMsg);
        setError(errorMsg);
        
        // Redirect to login after delay
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } finally {
        setLoading(false);
      }
    }

    handleCallback();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login in 3 seconds...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
