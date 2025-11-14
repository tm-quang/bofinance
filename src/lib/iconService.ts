import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { cacheFirstWithRefresh, cacheManager, invalidateCache } from './cache'
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

// Fetch all active icons
export const fetchIcons = async (filters?: IconFilters): Promise<IconRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem icons.')
  }

  const cacheKey = await cacheManager.generateKey('icons', filters)

  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select('*')
        .order('group_id', { ascending: true })
        .order('display_order', { ascending: true })
        .order('label', { ascending: true })

      if (filters) {
        if (filters.group_id) {
          query = query.eq('group_id', filters.group_id)
        }
        if (filters.icon_type) {
          query = query.eq('icon_type', filters.icon_type)
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
      } else {
        // Default: chỉ lấy active icons
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      throwIfError(error, 'Không thể tải danh sách icons.')

      return data ?? []
    },
    24 * 60 * 60 * 1000, // 24 hours
    12 * 60 * 60 * 1000  // 12 hours stale
  )
}

// Get icon by name
export const getIconByName = async (name: string): Promise<IconRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem icon.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    throwIfError(error, 'Không thể tải icon.')
  }

  return data
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

  await invalidateCache('icons')

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

  await invalidateCache('icons')

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

  await invalidateCache('icons')
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

  await invalidateCache('icons')
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

