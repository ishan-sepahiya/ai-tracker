"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-6">
      <div className="rounded-2xl border border-red-900 bg-red-950/30 p-5">
        <div className="text-sm text-red-200 font-semibold">Something went wrong</div>
        <div className="mt-2 text-sm text-red-100">
          {error.message || "Unknown error"}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
          >
            Go to login
          </button>
        </div>
      </div>
    </div>
  );
}

