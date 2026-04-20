export default function Loading() {
  return (
    <div className="space-y-6">

      {/* ── Header skeleton ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-11 w-full sm:w-44 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* ── Stats cards skeleton ── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border-2 bg-card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg sm:rounded-xl bg-muted animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-7 w-12 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table card skeleton ── */}
      <div className="rounded-xl border-2 bg-card">
        {/* Card header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>

        <div className="p-3 sm:p-6 space-y-4">
          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="h-10 sm:h-11 flex-1 rounded-lg bg-muted animate-pulse" />
            <div className="h-10 sm:h-11 w-full sm:w-44 rounded-lg bg-muted animate-pulse" />
          </div>

          {/* Table */}
          <div className="rounded-xl border-2 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 h-14 bg-muted/30 border-b-2">
              {[40, 20, 15, 15, 10].map((w, i) => (
                <div
                  key={i}
                  className="h-4 rounded bg-muted animate-pulse"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>

            {/* Table rows */}
            {[...Array(6)].map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="flex items-center gap-4 px-4 py-4 border-b last:border-0"
                style={{ animationDelay: `${rowIdx * 80}ms` }}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 flex-[2]">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-muted animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                {/* Code */}
                <div className="h-4 rounded bg-muted animate-pulse hidden md:block" style={{ width: '15%' }} />
                {/* Type badge */}
                <div className="h-7 w-20 rounded-lg bg-muted animate-pulse hidden lg:block" />
                {/* Employment */}
                <div className="h-4 w-20 rounded bg-muted animate-pulse hidden xl:block" />
                {/* Date */}
                <div className="h-4 w-24 rounded bg-muted animate-pulse hidden sm:block" />
                {/* Status */}
                <div className="h-4 w-14 rounded bg-muted animate-pulse" />
                {/* Actions */}
                <div className="flex justify-end gap-1.5 ml-auto">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
            <div className="flex items-center gap-3">
              <div className="h-8 w-16 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}