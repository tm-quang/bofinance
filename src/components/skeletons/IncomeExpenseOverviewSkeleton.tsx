import { Skeleton } from './Skeleton'

export const IncomeExpenseOverviewSkeleton = () => {
  return (
    <div className="space-y-3">
      {/* Bar Chart and Summary Section */}
      <div className="mb-3 flex items-center gap-5">
        {/* Bar Chart Skeleton - Left */}
        <div className="flex items-end h-[140px] w-[120px] shrink-0 gap-2">
          {/* Income bar skeleton */}
          <Skeleton variant="rounded" height={80} width={45} className="bg-emerald-200" />
          {/* Expense bar skeleton */}
          <Skeleton variant="rounded" height={100} width={45} className="bg-rose-200" />
        </div>

        {/* Summary Skeleton - Right */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton variant="rounded" height={16} width={80} />
            <Skeleton variant="rounded" height={16} width={100} className="bg-emerald-200" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton variant="rounded" height={16} width={80} />
            <Skeleton variant="rounded" height={16} width={100} className="bg-rose-200" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-slate-200 pt-3">
            <Skeleton variant="rounded" height={16} width={80} />
            <Skeleton variant="rounded" height={16} width={100} />
          </div>
        </div>
      </div>

      {/* Donut Chart Skeleton */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          {/* Donut chart circle skeleton */}
          <div className="relative flex items-center justify-center shrink-0">
            <Skeleton variant="circular" height={200} width={200} className="bg-slate-200" />
            {/* Inner circle (donut hole) overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-full h-[100px] w-[100px]" />
            </div>
          </div>

          {/* Legend skeleton */}
          <div className="flex-1 space-y-2 w-full sm:w-auto">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton variant="circular" height={12} width={12} />
                  <Skeleton variant="rounded" height={14} width={120} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton variant="rounded" height={14} width={80} />
                  <Skeleton variant="rounded" height={12} width={50} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

