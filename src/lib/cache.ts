type CacheEntry<T> = {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

type CacheKey = string

class CacheManager {
  private cache: Map<CacheKey, CacheEntry<unknown>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes default

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
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.ttl) {
      // Cache expired
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set data in cache
   */
  set<T>(key: CacheKey, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  /**
   * Invalidate cache by key pattern
   */
  invalidate(pattern: string | RegExp): void {
    if (typeof pattern === 'string') {
      // Exact match or prefix match
      for (const key of this.cache.keys()) {
        if (key === pattern || key.startsWith(pattern + ':')) {
          this.cache.delete(key)
        }
      }
    } else {
      // Regex match
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key)
        }
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl
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

