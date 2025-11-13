import { Skeleton } from './Skeleton'

type CategoryCardSkeletonProps = {
  count?: number
}

export const CategoryCardSkeleton = ({ count = 6 }: CategoryCardSkeletonProps) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:gap-4 sm:p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Skeleton variant="rounded" height={40} width={40} className="sm:h-12 sm:w-12" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton variant="rounded" height={16} width={100} />
                <Skeleton variant="rounded" height={12} width={60} />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Skeleton variant="circular" height={32} width={32} />
              <Skeleton variant="circular" height={32} width={32} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

