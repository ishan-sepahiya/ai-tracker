"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("API Management error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          ⚠️
        </div>

        <h1 className="mt-4 text-lg font-semibold text-ink-black">
          Could not load API Management
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Something went wrong while loading your organization
          infrastructure.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-prussian-blue px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}