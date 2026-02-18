import { Skeleton } from '@/components/ui/skeleton'

export function JobDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-3">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-48" />
        {/* Titulo + badges */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        {/* Metadata row */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>

      {/* Pipeline skeleton */}
      <div className="hidden md:flex items-center gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-2 flex-1 rounded-full" />
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        {/* Tab triggers */}
        <div className="flex gap-2 border-b border-border pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-md" />
          ))}
        </div>
        {/* Tab content */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-40 w-full rounded-md" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-md" />
            <Skeleton className="h-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
