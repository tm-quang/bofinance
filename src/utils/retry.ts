/**
 * Retry utility for failed API calls
 */

import type { PostgrestError } from '@supabase/supabase-js'

export interface RetryOptions {
  maxRetries?: number
  delay?: number
  backoff?: 'linear' | 'exponential'
  onRetry?: (attempt: number, error: Error) => void
  shouldRetry?: (error: Error) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delay: 1000,
  backoff: 'exponential',
  onRetry: () => { },
  shouldRetry: (error: Error) => {
    // Retry on network errors or 5xx errors
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('failed to fetch') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    )
  },
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry this error
      if (!opts.shouldRetry(lastError)) {
        throw lastError
      }

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        throw lastError
      }

      // Calculate delay
      const delay =
        opts.backoff === 'exponential'
          ? opts.delay * Math.pow(2, attempt)
          : opts.delay * (attempt + 1)

      opts.onRetry(attempt + 1, lastError)

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Wrapper for Supabase queries with retry logic
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  return retry(
    async () => {
      const result = await queryFn()
      // If there's an error, throw it so retry can catch it
      if (result.error) {
        throw new Error(result.error.message || 'Supabase query failed')
      }
      return result
    },
    {
      ...options,
      shouldRetry: (error) => {
        // Retry on network errors or if custom shouldRetry says so
        if (options.shouldRetry && !options.shouldRetry(error)) {
          return false
        }
        return DEFAULT_OPTIONS.shouldRetry(error)
      },
    }
  )
}

