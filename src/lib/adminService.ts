import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'

/**
 * Check if current user is admin
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
      return false
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      return false
    }

    return data.is_admin === true
  } catch {
    return false
  }
}

/**
 * Get admin status with caching
 */
let adminCache: { userId: string; isAdmin: boolean; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const getCachedAdminStatus = async (): Promise<boolean> => {
  const user = await getCachedUser()
  
  if (!user) {
    return false
  }

  // Check cache
  if (adminCache && adminCache.userId === user.id) {
    const now = Date.now()
    if (now - adminCache.timestamp < CACHE_DURATION) {
      return adminCache.isAdmin
    }
  }

  // Fetch from database
  const adminStatus = await isAdmin()
  
  // Update cache
  adminCache = {
    userId: user.id,
    isAdmin: adminStatus,
    timestamp: Date.now(),
  }

  return adminStatus
}

/**
 * Clear admin cache (useful after role changes)
 */
export const clearAdminCache = (): void => {
  adminCache = null
}

