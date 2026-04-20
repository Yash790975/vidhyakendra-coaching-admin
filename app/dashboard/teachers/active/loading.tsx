import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Back button skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Teacher Profile Card skeleton */}
        <Card className="border-2 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="flex justify-center sm:justify-start">
                <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shrink-0" />
              </div>
              {/* Info */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-64 rounded-lg" />
                    <Skeleton className="h-4 w-48 rounded" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats skeleton */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-7 w-14 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          {/* Tab triggers */}
          <Skeleton className="h-12 w-full rounded-lg" />

          {/* Tab content - overview cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-2">
                <CardHeader className="p-4 sm:p-6">
                  <Skeleton className="h-6 w-40 rounded" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="col-span-2 h-4 w-full rounded" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Address card skeleton */}
          <Card className="border-2">
            <CardHeader className="p-4 sm:p-6">
              <Skeleton className="h-6 w-24 rounded" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-4 w-3/4 rounded" />
            </CardContent>
          </Card>

          {/* Identity docs skeleton */}
          <Card className="border-2">
            <CardHeader className="p-4 sm:p-6">
              <Skeleton className="h-6 w-40 rounded" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-7 w-14 rounded" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}