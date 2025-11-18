/**
 * Custom hook to fetch and cache data
 * Tự động sử dụng cache, chỉ fetch khi cần thiết
 * Hỗ trợ refresh thủ công và auto-refresh khi data stale
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cacheManager, cacheFirstWithRefresh } from '../lib/cache'

export interface UseCachedDataOptions<T> {
  /** Cache key (function name) */
  cacheKey: string
  /** Parameters for cache key generation */
  params?: Record<string, unknown>
  /** Function to fetch data */
  fetchFn: () => Promise<T>
  /** Time to live in milliseconds */
  ttl?: number
  /** Stale threshold in milliseconds - data older than this will refresh in background */
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
 * 
 * @example
 * ```tsx
 * const { data, isLoading, refresh } = useCachedData({
 *   cacheKey: 'fetchWallets',
 *   params: { includeInactive: false },
 *   fetchFn: () => fetchWallets(false),
 *   ttl: 24 * 60 * 60 * 1000, // 24 hours
 *   staleThreshold: 12 * 60 * 60 * 1000, // 12 hours
 * })
 * ```
 */
export function useCachedData<T>(options: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const {
    cacheKey,
    params = {},
    fetchFn,
    ttl,
    staleThreshold,
    fetchOnMount = true,
    refetchOnParamsChange = true,
    initialData = null,
    enabled = true,
  } = options

  const [data, setData] = useState<T | null>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  
  const currentKeyRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  // Generate cache key
  const getKey = useCallback(async (): Promise<string> => {
    return await cacheManager.generateKey(cacheKey, params)
  }, [cacheKey, params])

  // Load data from cache or fetch
  const loadData = useCallback(async (force = false): Promise<void> => {
    if (!enabled) return

    try {
      const key = await getKey()
      
      // Check if key changed
      if (currentKeyRef.current !== key && currentKeyRef.current !== null) {
        // Key changed, reset state
        setData(initialData)
      }
      currentKeyRef.current = key

      setIsLoading(true)
      setError(null)

      let result: T

      if (force) {
        // Force refresh - fetch fresh data
        result = await fetchFn()
        await cacheManager.set(key, result, ttl)
      } else {
        // Use cache-first strategy
        result = await cacheFirstWithRefresh(key, fetchFn, ttl, staleThreshold)
        
        // Check if data is stale
        const stale = cacheManager.isStale(key, staleThreshold)
        setIsStale(stale)
      }

      if (mountedRef.current) {
        setData(result)
        setIsLoading(false)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setIsLoading(false)
      }
    }
  }, [enabled, getKey, fetchFn, ttl, staleThreshold, initialData])

  // Initial load
  useEffect(() => {
    if (fetchOnMount && enabled) {
      loadData(false).catch(console.error)
    }

    return () => {
      mountedRef.current = false
    }
  }, []) // Only run on mount

  // Reload when params change
  useEffect(() => {
    if (refetchOnParamsChange && enabled) {
      loadData(false).catch(console.error)
    }
  }, [cacheKey, JSON.stringify(params), refetchOnParamsChange, enabled])

  // Refresh function
  const refresh = useCallback(async (force = false): Promise<void> => {
    mountedRef.current = true
    await loadData(force)
  }, [loadData])

  return {
    data,
    isLoading,
    error,
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
    results[key] = useCachedData(source) as UseCachedDataResult<unknown>
  })

  return results
}

