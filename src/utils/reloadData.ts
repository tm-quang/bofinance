/**
 * Reload Data Utility
 * Xóa toàn bộ cache, reset trạng thái và tải lại dữ liệu mới nhất
 */

import { clearAllCache } from '../lib/cache'
import { clearUserCache } from '../lib/userCache'
import { clearPreloadTimestamp } from '../lib/dataPreloader'
import { resetSupabaseClient } from '../lib/supabaseClient'

/**
 * Clear tất cả cache và reset trạng thái
 * Bao gồm:
 * - Cache manager (memory + localStorage)
 * - User cache (session storage)
 * - Preload timestamp
 * - Supabase client (nếu cần)
 */
export const clearAllCacheAndState = async (): Promise<void> => {
  try {
    // 1. Clear tất cả cache từ cache manager
    await clearAllCache()

    // 2. Clear user cache (session storage)
    clearUserCache()

    // 3. Clear preload timestamp
    await clearPreloadTimestamp()

    // 4. Reset Supabase client để đảm bảo kết nối mới
    resetSupabaseClient()

    // 5. Clear các localStorage keys khác nếu có
    try {
      // Clear favorite categories từ localStorage (fallback)
      const favoriteKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('bofin_favorite_categories_')
      )
      favoriteKeys.forEach(key => localStorage.removeItem(key))

      // Clear default wallet từ localStorage (fallback)
      localStorage.removeItem('bofin_default_wallet_id')
      localStorage.removeItem('bofin_total_balance_wallet_ids')

      // Clear notification preferences từ localStorage (fallback)
      localStorage.removeItem('bofin_notification_sound_enabled')
    } catch (error) {
      console.warn('Error clearing additional localStorage keys:', error)
    }

    console.log('✅ All cache and state cleared successfully')
  } catch (error) {
    console.error('Error clearing cache and state:', error)
    throw error
  }
}

/**
 * Reload toàn bộ dữ liệu sau khi clear cache
 * Hàm này sẽ được gọi sau khi clearAllCacheAndState
 */
export const reloadAllData = async (): Promise<void> => {
  try {
    // Force reload bằng cách trigger window reload nếu cần
    // Hoặc có thể gọi các hàm fetch lại dữ liệu
    // Tùy thuộc vào implementation, có thể cần reload page
    console.log('🔄 Reloading all data...')
  } catch (error) {
    console.error('Error reloading data:', error)
    throw error
  }
}

