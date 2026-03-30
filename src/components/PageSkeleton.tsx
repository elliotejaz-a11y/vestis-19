import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="min-h-screen pb-24">
      <div className="px-5 pt-12 pb-4 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="px-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-2xl" />
          <Skeleton className="h-10 flex-1 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
