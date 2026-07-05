import { cn } from './tokens';

export interface SkeletonProps {
  /** Tailwind width (e.g. "w-24", "w-full") */
  width?: string;
  /** Tailwind height (e.g. "h-4", "h-10") */
  height?: string;
  /** Border radius (default rounded) */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const ROUND: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-lg',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

export function Skeleton({ width = 'w-full', height = 'h-4', rounded = 'md', className }: SkeletonProps) {
  return <div className={cn('skeleton-pulse', width, height, ROUND[rounded], className)} />;
}

export function SkeletonText({ lines = 3, lastLineWidth = 'w-2/3', className }: { lines?: number; lastLineWidth?: string; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="h-3" width={i === lines - 1 ? lastLineWidth : 'w-full'} />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <Skeleton width="w-10" height="h-10" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-20" height="h-2.5" />
          <Skeleton width="w-28" height="h-5" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height="h-3" width={i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-20'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? 'w-24' : 'w-16'} height="h-3" />
        ))}
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
      <Skeleton width="w-10" height="h-10" rounded="lg" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-3/5" height="h-4" />
        <Skeleton width="w-2/5" height="h-3" />
      </div>
      <Skeleton width="w-20" height="h-6" rounded="lg" />
    </div>
  );
}

export function SkeletonFilterBar() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton width="w-24" height="h-4" />
        <Skeleton width="w-16" height="h-4" rounded="full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Skeleton height="h-10" />
        <Skeleton height="h-10" />
        <Skeleton height="h-10" />
      </div>
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="space-y-2">
        <Skeleton width="w-40" height="h-6" />
        <Skeleton width="w-64" height="h-3" />
      </div>
      <Skeleton width="w-32" height="h-9" rounded="lg" />
    </div>
  );
}

export function SkeletonStatsRow({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => <SkeletonStatCard key={i} />)}
    </div>
  );
}
