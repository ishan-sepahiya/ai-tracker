export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-6 md:p-8">
      <div>
        <div className="h-6 w-40 animate-pulse rounded-full bg-gray-200" />
        <div className="mt-4 h-9 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-4 w-[500px] max-w-full animate-pulse rounded bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>

      <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </main>
  );
}