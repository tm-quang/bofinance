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
        .single()

      if (error) {
        // If preferences don't exist, return null (will create on first update)
        if (error.code === 'PGRST116') {
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

  // Try to update existing preferences
  const { error: selectError } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (selectError && selectError.code === 'PGRST116') {
    // Preferences don't exist, create new record
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        user_id: user.id,
        chart_period_type: updates.chart_period_type || 'day',
        chart_show_advanced: updates.chart_show_advanced ?? false,
      })
      .select()
      .single()

    throwIfError(error, 'Không thể tạo cài đặt người dùng.')

    if (!data) {
      throw new Error('Không nhận được dữ liệu sau khi tạo cài đặt.')
    }

    // Invalidate cache
    await invalidateCache(`getUserPreferences_${user.id}`)

    return data
  }

  if (selectError) {
    throwIfError(selectError, 'Không thể kiểm tra cài đặt hiện tại.')
  }

  // Update existing preferences
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật cài đặt người dùng.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu sau khi cập nhật.')
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

