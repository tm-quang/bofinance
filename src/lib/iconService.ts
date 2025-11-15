import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { cacheFirstWithRefresh, cacheManager } from './cache'
import { getCachedUser } from './userCache'
import { uploadToCloudinary } from './cloudinaryService'

export type IconType = 'react-icon' | 'image' | 'svg' | 'svg-url'

export type IconRecord = {
  id: string
  name: string
  label: string
  icon_type: IconType
  react_icon_name: string | null
  react_icon_library: string | null
  image_url: string | null
  group_id: string
  group_label: string
  is_active: boolean
  display_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type IconInsert = {
  name: string
  label: string
  icon_type: IconType
  react_icon_name?: string | null
  react_icon_library?: string | null
  image_url?: string | null
  group_id: string
  group_label: string
  display_order?: number
}

export type IconUpdate = Partial<Omit<IconInsert, 'name'>> & {
  is_active?: boolean
}

export type IconFilters = {
  group_id?: string
  icon_type?: IconType
  is_active?: boolean
}

const TABLE_NAME = 'icons'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Icon cache map: name -> IconRecord
// Được populate từ fetchIcons() để tránh fetch riêng lẻ
let iconCacheMap: Map<string, IconRecord> | null = null
let iconCachePromise: Promise<IconRecord[]> | null = null

// Fetch all active icons
export const fetchIcons = async (filters?: IconFilters): Promise<IconRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    // Không throw error, chỉ return empty array để app không crash
    return []
  }

  const cacheKey = await cacheManager.generateKey('icons', filters)

  const icons = await cacheFirstWithRefresh(
    cacheKey,
    async () => {
      try {
        // Build query từng bước để tránh lỗi
        const isActiveFilter = filters?.is_active !== undefined ? filters.is_active : true
        
        // Bắt đầu với select đơn giản
        let query = supabase
          .from(TABLE_NAME)
          .select('*')

        // Thêm filters
        query = query.eq('is_active', isActiveFilter)

        if (filters?.group_id) {
          query = query.eq('group_id', filters.group_id)
        }
        if (filters?.icon_type) {
          query = query.eq('icon_type', filters.icon_type)
        }

        // Thêm ordering
        query = query
          .order('group_id', { ascending: true })
          .order('display_order', { ascending: true })
          .order('label', { ascending: true })

        const { data, error } = await query

        if (error) {
          // Log error nhưng không throw - có thể do RLS policy hoặc table chưa tồn tại
          // App sẽ fallback về hardcoded icons
          if (error.code !== 'PGRST116') { // PGRST116 = not found, không cần log
            console.warn('Cannot fetch icons from database (will use hardcoded icons):', {
              code: error.code,
              message: error.message,
            })
          }
          return []
        }

        return data ?? []
      } catch (err) {
        // Silently fail - app sẽ dùng hardcoded icons
        // Chỉ log nếu không phải là lỗi network thông thường
        if (err instanceof Error && !err.message.includes('fetch')) {
          console.warn('Error fetching icons (will use hardcoded icons):', err)
        }
        return []
      }
    },
    24 * 60 * 60 * 1000, // 24 hours
    12 * 60 * 60 * 1000  // 12 hours stale
  )

  // Populate iconCacheMap nếu fetch tất cả active icons (không có filter đặc biệt)
  // Điều này giúp getIconByName sử dụng cache thay vì fetch riêng lẻ
  if (!filters || (filters.is_active === true || filters.is_active === undefined)) {
    if (!filters?.group_id && !filters?.icon_type) {
      iconCacheMap = new Map(icons.map(icon => [icon.name, icon]))
    }
  }

  return icons
}

/**
 * Get icon by name - sử dụng cache từ fetchIcons() để tránh fetch riêng lẻ
 * Tối ưu: Chỉ fetch tất cả icons một lần, sau đó dùng cache
 */
export const getIconByName = async (name: string): Promise<IconRecord | null> => {
  // Nếu đã có cache, dùng ngay
  if (iconCacheMap && iconCacheMap.has(name)) {
    return iconCacheMap.get(name) || null
  }

  // Nếu đang fetch, đợi xong rồi check lại
  if (iconCachePromise) {
    await iconCachePromise
    if (iconCacheMap && iconCacheMap.has(name)) {
      return iconCacheMap.get(name) || null
    }
  }

  // Nếu chưa có cache, fetch tất cả icons một lần và cache lại
  if (!iconCachePromise) {
    iconCachePromise = fetchIcons({ is_active: true })
    iconCachePromise
      .then((icons) => {
        iconCacheMap = new Map(icons.map(icon => [icon.name, icon]))
        iconCachePromise = null
      })
      .catch(() => {
        iconCacheMap = new Map()
        iconCachePromise = null
      })
  }

  await iconCachePromise
  return iconCacheMap?.get(name) || null
}

/**
 * Invalidate icon cache (khi có thay đổi icons)
 */
export const invalidateIconCache = async (): Promise<void> => {
  iconCacheMap = null
  iconCachePromise = null
  await invalidateIconCache()
}

// Get icon by ID
export const getIconById = async (id: string): Promise<IconRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem icon.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single()

  throwIfError(error, 'Không thể tải icon.')

  return data
}

// Create icon
export const createIcon = async (payload: IconInsert, imageFile?: File): Promise<IconRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo icon.')
  }

  // Upload image nếu có
  let imageUrl: string | null = null
  if (imageFile && payload.icon_type === 'image') {
    const uploadResult = await uploadToCloudinary(imageFile, {
      folder: 'icons',
    })
    imageUrl = uploadResult.secure_url
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      image_url: imageUrl || payload.image_url,
      created_by: user.id,
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo icon.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu icon sau khi tạo.')
  }

  await invalidateIconCache()

  return data
}

// Update icon
export const updateIcon = async (
  id: string,
  updates: IconUpdate,
  imageFile?: File
): Promise<IconRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật icon.')
  }

  // Upload image mới nếu có
  if (imageFile && updates.icon_type === 'image') {
    const uploadResult = await uploadToCloudinary(imageFile, {
      folder: 'icons',
    })
    updates.image_url = uploadResult.secure_url
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật icon.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu icon sau khi cập nhật.')
  }

  await invalidateIconCache()

  return data
}

// Delete icon (soft delete - set is_active = false)
export const deleteIcon = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa icon.')
  }

  // Soft delete
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ is_active: false })
    .eq('id', id)

  throwIfError(error, 'Không thể xóa icon.')

  await invalidateIconCache()
}

// Hard delete icon (permanent)
export const hardDeleteIcon = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa icon.')
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)

  throwIfError(error, 'Không thể xóa icon vĩnh viễn.')

  await invalidateIconCache()
}

// Get icon groups
export const getIconGroups = async (): Promise<Array<{ id: string; label: string }>> => {
  const icons = await fetchIcons({ is_active: true })
  const groups = new Map<string, string>()

  icons.forEach((icon) => {
    if (!groups.has(icon.group_id)) {
      groups.set(icon.group_id, icon.group_label)
    }
  })

  return Array.from(groups.entries()).map(([id, label]) => ({ id, label }))
}

