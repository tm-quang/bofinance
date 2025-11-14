type CacheEntry<T> = {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

type CacheKey = string

const STORAGE_PREFIX = 'bofin_cache_'
const STORAGE_KEY_MAP = 'bofin_cache_keys'

class CacheManager {
  private cache: Map<CacheKey, CacheEntry<unknown>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes default
  private storageEnabled: boolean = false

  constructor() {
    // Check if localStorage is available
    try {
      const testKey = '__cache_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      this.storageEnabled = true
      // Load cache from localStorage on initialization
      this.loadFromStorage()
    } catch (error) {
      console.warn('localStorage not available, using in-memory cache only', error)
      this.storageEnabled = false
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (!this.storageEnabled) return

    try {
      const keysJson = localStorage.getItem(STORAGE_KEY_MAP)
      if (!keysJson) return

      const keys: string[] = JSON.parse(keysJson)
      const now = Date.now()

      for (const key of keys) {
        const storageKey = STORAGE_PREFIX + key
        const entryJson = localStorage.getItem(storageKey)
        if (!entryJson) continue

        const entry: CacheEntry<unknown> = JSON.parse(entryJson)
        const age = now - entry.timestamp

        // Only load non-expired entries
        if (age <= entry.ttl) {
          this.cache.set(key, entry)
        } else {
          // Remove expired entry
          localStorage.removeItem(storageKey)
        }
      }

      // Update keys list after cleanup
      this.saveKeysToStorage()
    } catch (e) {
      console.warn('Error loading cache from localStorage:', e)
    }
  }

  /**
   * Save cache keys list to localStorage
   */
  private saveKeysToStorage(): void {
    if (!this.storageEnabled) return

    try {
      const keys = Array.from(this.cache.keys())
      localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(keys))
    } catch (e) {
      console.warn('Error saving cache keys to localStorage:', e)
    }
  }

  /**
   * Save entry to localStorage
   */
  private saveToStorage<T>(key: CacheKey, entry: CacheEntry<T>): void {
    if (!this.storageEnabled) return

    try {
      const storageKey = STORAGE_PREFIX + key
      localStorage.setItem(storageKey, JSON.stringify(entry))
      this.saveKeysToStorage()
    } catch (e) {
      // If storage is full, try to clean up old entries
      if (e instanceof DOMException && e.code === 22) {
        this.cleanupOldEntries()
        try {
          const storageKey = STORAGE_PREFIX + key
          localStorage.setItem(storageKey, JSON.stringify(entry))
          this.saveKeysToStorage()
        } catch (e2) {
          console.warn('Error saving to localStorage after cleanup:', e2)
        }
      } else {
        console.warn('Error saving to localStorage:', e)
      }
    }
  }

  /**
   * Remove entry from localStorage
   */
  private removeFromStorage(key: CacheKey): void {
    if (!this.storageEnabled) return

    try {
      const storageKey = STORAGE_PREFIX + key
      localStorage.removeItem(storageKey)
      this.saveKeysToStorage()
    } catch (e) {
      console.warn('Error removing from localStorage:', e)
    }
  }

  /**
   * Clean up old entries when storage is full
   */
  private cleanupOldEntries(): void {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      // Remove entries older than 50% of their TTL
      if (age > entry.ttl * 0.5) {
        keysToRemove.push(key)
      }
    }

    // Sort by age (oldest first) and remove half
    keysToRemove.sort((a, b) => {
      const entryA = this.cache.get(a)!
      const entryB = this.cache.get(b)!
      return entryA.timestamp - entryB.timestamp
    })

    const toRemove = keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2))
    for (const key of toRemove) {
      this.cache.delete(key)
      this.removeFromStorage(key)
    }
  }

  /**
   * Get default TTL
   */
  getDefaultTTL(): number {
    return this.defaultTTL
  }

  /**
   * Generate cache key from function name and parameters
   */
  generateKey(functionName: string, params?: Record<string, unknown>): CacheKey {
    if (!params || Object.keys(params).length === 0) {
      return functionName
    }
    const paramString = JSON.stringify(params, Object.keys(params).sort())
    return `${functionName}:${paramString}`
  }

  /**
   * Get data from cache if valid
   */
  get<T>(key: CacheKey): T | null {
    // Try in-memory cache first
    const entry = this.cache.get(key)
    if (entry) {
      const now = Date.now()
      const age = now - entry.timestamp

      if (age > entry.ttl) {
        // Cache expired
        this.cache.delete(key)
        this.removeFromStorage(key)
        return null
      }

      return entry.data as T
    }

    // Try localStorage if not in memory
    if (this.storageEnabled) {
      try {
        const storageKey = STORAGE_PREFIX + key
        const entryJson = localStorage.getItem(storageKey)
        if (!entryJson) return null

        const entry: CacheEntry<T> = JSON.parse(entryJson)
        const now = Date.now()
        const age = now - entry.timestamp

        if (age > entry.ttl) {
          // Cache expired
          this.removeFromStorage(key)
          return null
        }

        // Restore to memory cache
        this.cache.set(key, entry)
        return entry.data
      } catch (e) {
        console.warn('Error reading from localStorage:', e)
        return null
      }
    }

    return null
  }

  /**
   * Set data in cache
   */
  set<T>(key: CacheKey, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }

    // Save to memory
    this.cache.set(key, entry)

    // Save to localStorage
    this.saveToStorage(key, entry)
  }

  /**
   * Invalidate cache by key pattern
   */
  invalidate(pattern: string | RegExp): void {
    const keysToRemove: string[] = []

    if (typeof pattern === 'string') {
      // Exact match or prefix match
      for (const key of this.cache.keys()) {
        if (key === pattern || key.startsWith(pattern + ':')) {
          keysToRemove.push(key)
        }
      }
    } else {
      // Regex match
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          keysToRemove.push(key)
        }
      }
    }

    // Remove from both memory and storage
    for (const key of keysToRemove) {
      this.cache.delete(key)
      this.removeFromStorage(key)
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    // Clear memory
    this.cache.clear()

    // Clear localStorage
    if (this.storageEnabled) {
      try {
        const keysJson = localStorage.getItem(STORAGE_KEY_MAP)
        if (keysJson) {
          const keys: string[] = JSON.parse(keysJson)
          for (const key of keys) {
            localStorage.removeItem(STORAGE_PREFIX + key)
          }
        }
        localStorage.removeItem(STORAGE_KEY_MAP)
      } catch (e) {
        console.warn('Error clearing localStorage cache:', e)
      }
    }
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl
  }

  /**
   * Check if cache entry is stale (but not expired)
   * @param key - Cache key
   * @param staleThreshold - Consider stale after this time (in ms). Default: 50% of TTL
   * @returns true if stale, false if fresh or expired
   */
  isStale(key: CacheKey, staleThreshold?: number): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    const age = now - entry.timestamp

    // If expired, it's not stale (it's invalid)
    if (age > entry.ttl) return false

    const threshold = staleThreshold || (entry.ttl * 0.5)
    return age > threshold
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

/**
 * Cache decorator for async functions
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: {
    ttl?: number
    keyGenerator?: (args: Parameters<T>) => string
    invalidateOn?: string[] // Function names that should invalidate this cache
  }
): T {
  const functionName = fn.name || 'anonymous'
  const ttl = options?.ttl || cacheManager.getDefaultTTL()

  return (async (...args: Parameters<T>) => {
    const keyGenerator = options?.keyGenerator || ((args: Parameters<T>) => {
      const params: Record<string, unknown> = {}
      args.forEach((arg, index) => {
        if (arg !== null && arg !== undefined) {
          params[`arg${index}`] = arg
        }
      })
      return cacheManager.generateKey(functionName, params)
    })

    const cacheKey = keyGenerator(args)
    const cached = cacheManager.get<ReturnType<T>>(cacheKey)

    if (cached !== null) {
      return cached
    }

    const result = await fn(...args)
    cacheManager.set(cacheKey, result, ttl)

    return result
  }) as T
}

/**
 * Invalidate cache for specific service
 */
export function invalidateCache(serviceName: string): void {
  cacheManager.invalidate(serviceName)
}

/**
 * Invalidate all cache
 */
export function clearAllCache(): void {
  cacheManager.clear()
}

/**
 * Cache-first with background refresh
 * Returns cached data immediately if available, then refreshes in background
 * @param key - Cache key
 * @param fetchFn - Function to fetch fresh data
 * @param ttl - Time to live in milliseconds
 * @param staleThreshold - Consider cache stale after this time (in ms). If cache is stale, fetch in background but still return cached data
 * @returns Promise that resolves with cached data immediately, then updates cache in background
 */
export async function cacheFirstWithRefresh<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number,
  staleThreshold?: number
): Promise<T> {
  // Get cached data
  const cached = cacheManager.get<T>(key)
  
  // If we have valid cached data
  if (cached !== null) {
    // Check if cache is stale (but not expired)
    if (cacheManager.isStale(key, staleThreshold)) {
      // Refresh in background (don't await)
      fetchFn()
        .then((freshData) => {
          cacheManager.set(key, freshData, ttl)
        })
        .catch((error) => {
          console.warn('Background cache refresh failed:', error)
          // Keep using cached data even if refresh fails
        })
    }
    
    // Return cached data immediately
    return cached
  }
  
  // No cache, fetch fresh data
  const freshData = await fetchFn()
  cacheManager.set(key, freshData, ttl)
  return freshData
}

/**
 * Real-time cache update - immediately invalidates and refreshes cache
 * Use this when you know data has changed and want immediate updates
 * @param pattern - Cache key pattern to invalidate
 * @param fetchFn - Function to fetch fresh data (optional)
 */
export async function realTimeCacheUpdate<T>(
  pattern: string | RegExp,
  fetchFn?: (key: string) => Promise<T>
): Promise<void> {
  // Invalidate matching caches
  cacheManager.invalidate(pattern)
  
  // If fetch function provided, refresh immediately
  if (fetchFn) {
    // Get all matching keys (we need to track them)
    // For now, just invalidate - the next fetch will get fresh data
    // This is a simplified version - in production you might want to track keys
  }
}

