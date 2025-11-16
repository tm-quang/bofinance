import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { cacheFirstWithRefresh, invalidateCache } from './cache'

// Cache TTL constants
const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
}

export type ChartPeriodType = 'day' | 'week' | 'month'

export type UserPreferencesRecord = {
  id: string
  user_id: string
  chart_period_type: ChartPeriodType
  chart_show_advanced: boolean
  created_at: string
  updated_at: string
}

export type UserPreferencesUpdate = {
  chart_period_type?: ChartPeriodType
  chart_show_advanced?: boolean
}

const TABLE_NAME = 'user_preferences'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Get user preferences with caching
export const getUserPreferences = async (): Promise<UserPreferencesRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    return null
  }

  return cacheFirstWithRefresh(
    `getUserPreferences_${user.id}`,
    async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        // If preferences don't exist, return null (will create on first update)
        if (error.code === 'PGRST116') {
          return null
        }
        // If table doesn't exist, return null (will create on first update)
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          console.warn('User preferences table may not exist:', error.message)
          return null
        }
        // Log error for debugging but don't throw for 400 errors (might be schema issue)
        if (error.code === 'PGRST116' || error.message?.includes('400')) {
          console.warn('Error fetching user preferences (non-critical):', error.message)
          return null
        }
        throwIfError(error, 'Không thể tải cài đặt người dùng.')
      }

      return data
    },
    CACHE_TTL.SHORT
  )
}

// Update or create user preferences
export const updateUserPreferences = async (
  updates: UserPreferencesUpdate
): Promise<UserPreferencesRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật cài đặt.')
  }

  // First, try to get existing preferences
  const existing = await getUserPreferences()

  // Prepare data for upsert
  const preferencesData = {
    user_id: user.id,
    chart_period_type: updates.chart_period_type || existing?.chart_period_type || 'month',
    chart_show_advanced: updates.chart_show_advanced ?? existing?.chart_show_advanced ?? false,
  }

  // Use upsert to either insert or update
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(preferencesData, {
      onConflict: 'user_id',
    })
    .select()
    .single()

  if (error) {
    // If table doesn't exist or schema error, log and throw
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('User preferences table may not exist:', error.message)
      throw new Error('Bảng cài đặt người dùng chưa được tạo. Vui lòng chạy SQL migration.')
    }
    throwIfError(error, 'Không thể cập nhật cài đặt người dùng.')
  }

  if (!data) {
    throw new Error('Không nhận được dữ liệu sau khi cập nhật cài đặt.')
  }

  // Invalidate cache
  await invalidateCache(`getUserPreferences_${user.id}`)

  return data
}

// Get chart period type preference
export const getChartPeriodType = async (): Promise<ChartPeriodType> => {
  const preferences = await getUserPreferences()
  return preferences?.chart_period_type || 'day'
}

// Get chart show advanced preference
export const getChartShowAdvanced = async (): Promise<boolean> => {
  const preferences = await getUserPreferences()
  return preferences?.chart_show_advanced ?? false
}

// Update chart preferences
export const updateChartPreferences = async (
  periodType: ChartPeriodType,
  showAdvanced: boolean
): Promise<void> => {
  await updateUserPreferences({
    chart_period_type: periodType,
    chart_show_advanced: showAdvanced,
  })
}

