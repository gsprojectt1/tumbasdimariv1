import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-card', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-white overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}
