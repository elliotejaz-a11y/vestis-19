import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border-y border-border/40">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* Image */}
          <Skeleton className="aspect-square w-full" />
          {/* Actions */}
          <div className="px-4 py-2.5 space-y-2">
            <div className="flex gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WardrobeSkeleton() {
  return (
    <div className="min-h-screen pb-24">
      <div className="px-5 pt-12 pb-4 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="px-5 pb-4 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-2xl" />
        <Skeleton className="h-10 flex-1 rounded-2xl" />
      </div>
      <div className="px-5 pb-3 flex gap-2 overflow-hidden">
        {["w-12", "w-16", "w-14", "w-20", "w-16", "w-14"].map((w, i) => (
          <Skeleton key={i} className={`h-8 ${w} rounded-full flex-shrink-0`} />
        ))}
      </div>
      <div className="px-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] rounded-2xl" />
            <div className="px-1 space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StoriesSkeleton() {
  return (
    <div className="flex gap-3 px-5 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-2 w-12" />
        </div>
      ))}
    </div>
  );
}
