export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4">
      <div className="h-10 w-52 rounded-xl bg-zinc-900/60 animate-pulse" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="h-56 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        <div className="h-56 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        <div className="h-56 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
      </div>
      <div className="h-64 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
    </div>
  );
}

