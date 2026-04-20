export default function Loading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 space-y-2">
            <div className="h-8 w-56 rounded-lg bg-gradient-to-r from-[#1897C6]/20 to-[#67BAC3]/20" />
            <div className="h-4 w-72 rounded bg-muted" />
          </div>
          <div className="h-9 w-full sm:w-36 rounded-md bg-muted" />
        </div>

        {/* Progress Bar Card */}
        <div className="mb-4 sm:mb-6 rounded-xl border bg-card shadow-sm">
          <div className="p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-10 rounded bg-muted" />
            </div>
            <div className="h-1.5 sm:h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/7 rounded-full bg-gradient-to-r from-[#1897C6]/30 to-[#67BAC3]/30" />
            </div>
          </div>
        </div>

        {/* Section Navigation Card */}
        <div className="mb-4 sm:mb-6 rounded-xl border bg-card shadow-sm">
          <div className="p-3 sm:p-4">
            <div className="flex gap-2 overflow-hidden">
              {/* Active section pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-[#1897C6]/30 to-[#67BAC3]/30 shrink-0">
                <div className="h-3.5 w-3.5 rounded-full bg-[#1897C6]/40" />
                <div className="h-3.5 w-16 rounded bg-[#1897C6]/30" />
              </div>
              {/* Rest of section pills */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-muted shrink-0"
                >
                  <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/20" />
                  <div className="h-3.5 w-14 rounded bg-muted-foreground/20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content Card */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">

            {/* Student Type select */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-10 w-full rounded-md bg-muted" />
              </div>
            </div>

            {/* First / Last name */}
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-10 w-full rounded-md bg-muted" />
                </div>
              ))}
            </div>

            {/* DOB / Gender */}
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-10 w-full rounded-md bg-muted" />
                </div>
              ))}
            </div>

            {/* Blood Group */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-10 w-full rounded-md bg-muted" />
              </div>
            </div>

          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
          <div className="h-10 w-full rounded-md bg-muted sm:flex-1" />
          <div className="h-10 w-full rounded-md bg-gradient-to-r from-[#1897C6]/30 to-[#67BAC3]/30 sm:flex-1" />
        </div>

      </div>
    </div>
  )
}