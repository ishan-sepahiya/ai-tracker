export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-56 rounded-xl bg-zinc-900/60 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        <div className="h-64 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
      </div>
      <div className="h-20 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
    </div>
  );
}

