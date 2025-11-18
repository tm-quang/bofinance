/**
 * Custom hook for wallets with cache
 * Example of using useCachedData for wallets
 */

import { useCachedData } from './useCachedData'
import { fetchWallets, type WalletRecord } from '../lib/walletService'

export interface UseCachedWalletsOptions {
  includeInactive?: boolean
  fetchOnMount?: boolean
  enabled?: boolean
}

export interface UseCachedWalletsResult {
  wallets: WalletRecord[]
  isLoading: boolean
  error: Error | null
  refresh: (force?: boolean) => Promise<void>
  isStale: boolean
}

/**
 * Hook to fetch wallets with cache
 * 
 * @example
 * ```tsx
 * const { wallets, isLoading, refresh } = useCachedWallets({
 *   includeInactive: false,
 * })
 * ```
 */
export function useCachedWallets(options: UseCachedWalletsOptions = {}): UseCachedWalletsResult {
  const {
    includeInactive = false,
    fetchOnMount = true,
    enabled = true,
  } = options

  const { data, isLoading, error, refresh, isStale } = useCachedData<WalletRecord[]>({
    cacheKey: 'fetchWallets',
    params: { includeInactive },
    fetchFn: () => fetchWallets(includeInactive),
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    staleThreshold: 12 * 60 * 60 * 1000, // 12 hours
    fetchOnMount,
    enabled,
    initialData: [],
  })

  return {
    wallets: data || [],
    isLoading,
    error,
    refresh,
    isStale,
  }
}

