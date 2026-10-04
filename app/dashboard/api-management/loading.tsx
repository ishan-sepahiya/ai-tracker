export default function Loading() {
  return (
    <main className="space-y-5 lg:-mx-2">
      {/* Header */}
      <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Tree */}
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />

        {/* Cards */}
        <div className="space-y-5">
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-slate-100" />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
