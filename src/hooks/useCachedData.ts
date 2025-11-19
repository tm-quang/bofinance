/**
 * Custom hook to fetch and cache data
 * ADAPTER: Wraps TanStack Query for backward compatibility
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export interface UseCachedDataOptions<T> {
  /** Cache key (function name) */
  cacheKey: string
  /** Parameters for cache key generation */
  params?: Record<string, unknown>
  /** Function to fetch data */
  fetchFn: () => Promise<T>
  /** Time to live in milliseconds (staleTime) */
  ttl?: number
  /** Stale threshold in milliseconds (staleTime) */
  staleThreshold?: number
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean
  /** Whether to refetch when params change (default: true) */
  refetchOnParamsChange?: boolean
  /** Initial data */
  initialData?: T
  /** Whether data is loading */
  enabled?: boolean
}

export interface UseCachedDataResult<T> {
  /** Current data */
  data: T | null
  /** Whether data is loading */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Manually refresh data */
  refresh: (force?: boolean) => Promise<void>
  /** Check if data is stale */
  isStale: boolean
}

/**
 * Hook to fetch and cache data
 * Adapted to use TanStack Query
 */
export function useCachedData<T>(options: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const {
    cacheKey,
    params = {},
    fetchFn,
    ttl, // Map to staleTime
    staleThreshold, // Map to staleTime if ttl not provided
    enabled = true,
    initialData = null,
  } = options

  const queryClient = useQueryClient()

  // Generate a stable query key
  // Note: In the old system, keys were strings. In React Query, arrays are better.
  // We'll use [cacheKey, params] as the query key.
  const queryKey = [cacheKey, params]

  const { data, isLoading, error, refetch, isStale } = useQuery({
    queryKey,
    queryFn: fetchFn,
    enabled: enabled,
    staleTime: ttl || staleThreshold || 5 * 60 * 1000, // Default 5 mins
    initialData: initialData || undefined,
    refetchOnWindowFocus: true,
  })

  // Adapter for refresh function
  const refresh = useCallback(async (force = false) => {
    if (force) {
      await queryClient.invalidateQueries({ queryKey })
    }
    await refetch()
  }, [queryClient, queryKey, refetch])

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refresh,
    isStale,
  }
}

/**
 * Hook to fetch multiple cached data sources
 */
export function useCachedDataMultiple(
  dataSources: Array<UseCachedDataOptions<unknown>>
): Record<string, UseCachedDataResult<unknown>> {
  const results: Record<string, UseCachedDataResult<unknown>> = {}

  dataSources.forEach((source, index) => {
    const key = source.cacheKey || `source_${index}`
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = useCachedData(source) as UseCachedDataResult<unknown>
  })

  return results
}

