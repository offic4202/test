import { Skeleton } from "@/components/ui/skeleton"

export function HomeSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-72 w-full rounded-3xl" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-56 w-44 shrink-0 rounded-2xl" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Opening the iptv-org directory…</p>
    </div>
  )
}

export function DirectorySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-64" />
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  )
}

export function WatchSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="aspect-video w-full rounded-3xl" />
    </div>
  )
}
