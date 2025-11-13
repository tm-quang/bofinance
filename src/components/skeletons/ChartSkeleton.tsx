import { Skeleton } from './Skeleton'

export const ChartSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Chart circle */}
      <div className="flex items-center justify-center">
        <Skeleton variant="circular" height={192} width={192} className="sm:h-64 sm:w-64" />
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" height={16} width={16} />
              <Skeleton variant="rounded" height={14} width={100} />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton variant="rounded" height={14} width={80} />
              <Skeleton variant="rounded" height={12} width={40} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

