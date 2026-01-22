import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="group relative block rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Skeleton className="absolute inset-0" />
      </div>
      <div className="p-4 flex flex-col">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6 mt-2" />
        <Skeleton className="h-4 w-2/5 mt-3" />
        <div className="mt-3">
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
