import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-black text-zinc-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8">
        <div className="mb-6">
          <div className="text-sm tracking-wide text-zinc-400">
            AI Usage Tracking
          </div>
          <div className="text-2xl font-semibold">Get started</div>
        </div>
        {children}
      </div>
    </div>
  );
}

