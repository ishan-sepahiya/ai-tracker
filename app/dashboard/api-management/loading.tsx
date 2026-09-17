export default function Loading() {
  return (
    <main className="space-y-8 p-6 md:p-8">
      <div>
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-4 w-[500px] max-w-full animate-pulse rounded bg-gray-100" />
      </div>

      <div className="space-y-6">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-72 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>
    </main>
  );
}