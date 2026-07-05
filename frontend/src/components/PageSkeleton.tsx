import { useTheme } from '../contexts/ThemeContext';

interface PageSkeletonProps {
  type?: 'table' | 'cards' | 'dashboard' | 'pos';
}

function Bone({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  const { isDark } = useTheme();
  return (
    <div
      className={`rounded ${className} ${animate ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }}
    />
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <Bone className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3 w-16" />
            <Bone className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Search bar */}
      <div className="flex items-center justify-between mb-3">
        <Bone className="h-8 w-48 rounded-lg" />
        <div className="flex gap-2">
          <Bone className="h-8 w-20 rounded-lg" />
          <Bone className="h-8 w-16 rounded-lg" />
        </div>
      </div>
      {/* Table header */}
      <div className="flex gap-4 py-3 border-b">
        <Bone className="h-4 w-8" />
        <Bone className="h-4 w-32" />
        <Bone className="h-4 w-24" />
        <Bone className="h-4 w-20" />
        <Bone className="h-4 w-16" />
      </div>
      {/* Table rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-50">
          <Bone className="h-4 w-8" />
          <Bone className="h-4 w-32" />
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-20" />
          <Bone className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Bone className="w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-24" />
              <Bone className="h-3 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <StatsSkeleton />
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 space-y-3">
            <Bone className="h-4 w-24" />
            <Bone className="h-8 w-32" />
            <Bone className="h-3 w-20" />
          </div>
        ))}
      </div>
    </>
  );
}

function POSSkeleton() {
  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex-1 space-y-3">
        {/* Title */}
        <Bone className="h-7 w-40" />
        {/* Scale */}
        <div className="bg-white rounded-lg shadow p-4">
          <Bone className="h-10 w-48 mb-2" />
          <Bone className="h-4 w-32" />
        </div>
        {/* Search */}
        <Bone className="h-10 w-full rounded-lg" />
        {/* Categories */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="flex">
                <Bone className="w-14 h-14" animate={false} />
                <div className="flex-1 p-2 space-y-1">
                  <Bone className="h-3 w-16" />
                  <Bone className="h-4 w-12" />
                  <Bone className="h-2 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ type = 'table' }: PageSkeletonProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Bone className="h-8 w-48" />
        <Bone className="h-10 w-36 rounded-lg" />
      </div>

      {type === 'dashboard' && <DashboardSkeleton />}
      {type === 'table' && (
        <>
          <StatsSkeleton />
          <TableSkeleton />
        </>
      )}
      {type === 'cards' && (
        <>
          <StatsSkeleton />
          <CardsSkeleton />
        </>
      )}
      {type === 'pos' && <POSSkeleton />}
    </div>
  );
}
