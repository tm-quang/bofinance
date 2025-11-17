import { Skeleton } from './Skeleton'

type CategoryListSkeletonProps = {
  count?: number
}

export const CategoryListSkeleton = ({ count = 6 }: CategoryListSkeletonProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <Skeleton variant="circular" width={56} height={56} />
          <Skeleton variant="rounded" height={14} width={60} />
        </div>
      ))}
    </div>
  )
}

