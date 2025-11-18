import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { cacheFirstWithRefresh, cacheManager } from './cache'
import { getCachedUser } from './userCache'
import { uploadToCloudinary } from './cloudinaryService'
import { compressImageForIcon, isFileSizeAcceptable } from '../utils/imageCompression'

export type IconFileType = 'png' | 'jpg' | 'jpeg' | 'svg' | 'webp'
export type IconUsageType = 'category' | 'feature' | 'avatar' | 'general'

export type IconImageRecord = {
  id: string
  name: string
  label: string
  file_type: IconFileType
  image_url: string
  usage_type: IconUsageType
  group_id: string
  group_label: string
  is_active: boolean
  display_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type IconImageInsert = {
  name: string
  label: string
  file_type: IconFileType
  image_url?: string
  usage_type?: IconUsageType
  group_id?: string
  group_label?: string
  display_order?: number
}

export type IconImageUpdate = Partial<Omit<IconImageInsert, 'name'>> & {
  is_active?: boolean
}

export type IconImageFilters = {
  file_type?: IconFileType
  usage_type?: IconUsageType
  group_id?: string
  is_active?: boolean
}

const TABLE_NAME = 'icon_images'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Icon image cache map: name -> IconImageRecord
let iconImageCacheMap: Map<string, IconImageRecord> | null = null
let iconImageCachePromise: Promise<IconImageRecord[]> | null = null

/**
 * Fetch all active icon images
 */
export const fetchIconImages = async (filters?: IconImageFilters): Promise<IconImageRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    return []
  }

  const cacheKey = await cacheManager.generateKey('icon_images', filters)

  const iconImages = await cacheFirstWithRefresh(
    cacheKey,
    async () => {
      try {
        const isActiveFilter = filters?.is_active !== undefined ? filters.is_active : true
        
        let query = supabase
          .from(TABLE_NAME)
          .select('*')

        query = query.eq('is_active', isActiveFilter)

        if (filters?.file_type) {
          query = query.eq('file_type', filters.file_type)
        }
        if (filters?.usage_type) {
          query = query.eq('usage_type', filters.usage_type)
        }
        if (filters?.group_id) {
          query = query.eq('group_id', filters.group_id)
        }

        query = query
          .order('group_id', { ascending: true })
          .order('display_order', { ascending: true })
          .order('label', { ascending: true })

        const { data, error } = await query

        if (error) {
          if (error.code !== 'PGRST116') {
            console.warn('Cannot fetch icon images from database:', {
              code: error.code,
              message: error.message,
            })
          }
          return []
        }

        return data ?? []
      } catch (err) {
        if (err instanceof Error && !err.message.includes('fetch')) {
          console.warn('Error fetching icon images:', err)
        }
        return []
      }
    },
    24 * 60 * 60 * 1000, // 24 hours
    12 * 60 * 60 * 1000  // 12 hours stale
  )

  // Populate cache map
  if (!filters || (filters.is_active === true || filters.is_active === undefined)) {
    if (!filters?.group_id && !filters?.file_type && !filters?.usage_type) {
      iconImageCacheMap = new Map(iconImages.map(icon => [icon.name, icon]))
    }
  }

  return iconImages
}

/**
 * Get icon image by name
 */
export const getIconImageByName = async (name: string): Promise<IconImageRecord | null> => {
  if (iconImageCacheMap && iconImageCacheMap.has(name)) {
    return iconImageCacheMap.get(name) || null
  }

  if (iconImageCachePromise) {
    await iconImageCachePromise
    if (iconImageCacheMap && iconImageCacheMap.has(name)) {
      return iconImageCacheMap.get(name) || null
    }
  }

  if (!iconImageCachePromise) {
    iconImageCachePromise = fetchIconImages({ is_active: true })
    iconImageCachePromise
      .then((icons) => {
        iconImageCacheMap = new Map(icons.map(icon => [icon.name, icon]))
        iconImageCachePromise = null
      })
      .catch(() => {
        iconImageCacheMap = new Map()
        iconImageCachePromise = null
      })
  }

  await iconImageCachePromise
  return iconImageCacheMap?.get(name) || null
}

/**
 * Get icon image by ID
 */
export const getIconImageById = async (id: string): Promise<IconImageRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem icon image.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single()

  throwIfError(error, 'Không thể tải icon image.')

  return data
}

/**
 * Invalidate icon image cache
 */
export const invalidateIconImageCache = async (): Promise<void> => {
  iconImageCacheMap = null
  iconImageCachePromise = null
  const cacheKey = await cacheManager.generateKey('icon_images', {})
  await cacheManager.invalidate(cacheKey)
}

/**
 * Create icon image
 */
export const createIconImage = async (
  payload: IconImageInsert,
  imageFile?: File
): Promise<IconImageRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo icon image.')
  }

  // Check if icon name already exists
  const existingIcon = await getIconImageByName(payload.name)
  if (existingIcon) {
    throw new Error(`Icon với tên "${payload.name}" đã tồn tại. Vui lòng chọn tên khác.`)
  }

  // Upload image if provided
  let imageUrl: string | null = null
  if (imageFile) {
    // Determine file type from file
    const fileName = imageFile.name.toLowerCase()
    let fileType: IconFileType = 'png'
    if (fileName.endsWith('.svg')) {
      fileType = 'svg'
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      fileType = 'jpg'
    } else if (fileName.endsWith('.webp')) {
      fileType = 'webp'
    }

    // Compress image before upload (except SVG which is already vector/compressed)
    let fileToUpload = imageFile
    if (fileType !== 'svg') {
      try {
        // Check initial file size (max 10MB before compression)
        const maxInitialSize = 10 * 1024 * 1024 // 10MB
        if (imageFile.size > maxInitialSize) {
          throw new Error('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB')
        }

        // Compress image: PNG (96x96px, max 30KB) or JPEG (128x128px, max 10KB)
        // PNG preserves transparency, JPEG has better compression
        const fileName = imageFile.name.toLowerCase()
        const isPng = fileName.endsWith('.png')
        
        if (isPng) {
          // PNG: 96x96px, max 30KB (to preserve transparency)
          fileToUpload = await compressImageForIcon(imageFile, 96, 96, 30, 0.6, true)
          
          // Verify compressed size (PNG is larger, allow up to 30KB)
          if (!isFileSizeAcceptable(fileToUpload, 30)) {
            throw new Error('Không thể nén ảnh PNG xuống dưới 30KB. Vui lòng chọn ảnh đơn giản hơn hoặc giảm kích thước.')
          }
        } else {
          // JPEG: 128x128px, max 10KB
          fileToUpload = await compressImageForIcon(imageFile, 128, 128, 10, 0.6, false)
          
          // Verify compressed size
          if (!isFileSizeAcceptable(fileToUpload, 10)) {
            throw new Error('Không thể nén ảnh xuống dưới 10KB. Vui lòng chọn ảnh khác')
          }
        }

        // Determine file type based on compressed file
        const compressedFileName = fileToUpload.name.toLowerCase()
        if (compressedFileName.endsWith('.png')) {
          fileType = 'png'
        } else {
          fileType = 'jpg'
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Không thể nén ảnh')
      }
    }

    const uploadResult = await uploadToCloudinary(fileToUpload, {
      useDefaultIconFolder: true, // Sử dụng VITE_CLOUDINARY_ICON_FOLDER nếu có, nếu không thì dùng 'icon_images'
      folder: 'icon_images', // Fallback nếu không có VITE_CLOUDINARY_ICON_FOLDER
    })
    imageUrl = uploadResult.secure_url

    // Update file_type if not provided
    if (!payload.file_type) {
      payload.file_type = fileType
    }
  }

  if (!imageUrl && !payload.image_url) {
    throw new Error('Vui lòng cung cấp ảnh hoặc URL ảnh.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      image_url: imageUrl || payload.image_url || '',
      usage_type: payload.usage_type || 'general',
      group_id: payload.group_id || 'others',
      group_label: payload.group_label || 'Khác',
      display_order: payload.display_order || 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Handle duplicate key error specifically
    if (error.code === '23505' && error.message.includes('icon_images_name_key')) {
      throw new Error(`Icon với tên "${payload.name}" đã tồn tại. Vui lòng chọn tên khác.`)
    }
    throwIfError(error, 'Không thể tạo icon image.')
  }

  if (!data) {
    throw new Error('Không nhận được dữ liệu icon image sau khi tạo.')
  }

  await invalidateIconImageCache()

  return data
}

/**
 * Update icon image
 */
export const updateIconImage = async (
  id: string,
  updates: IconImageUpdate,
  imageFile?: File
): Promise<IconImageRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật icon image.')
  }

  // Upload new image if provided
  if (imageFile) {
    const fileName = imageFile.name.toLowerCase()
    let fileType: IconFileType = 'png'
    if (fileName.endsWith('.svg')) {
      fileType = 'svg'
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      fileType = 'jpg'
    } else if (fileName.endsWith('.webp')) {
      fileType = 'webp'
    }

    // Compress image before upload (except SVG)
    let fileToUpload = imageFile
    if (fileType !== 'svg') {
      try {
        // Check initial file size (max 10MB before compression)
        const maxInitialSize = 10 * 1024 * 1024 // 10MB
        if (imageFile.size > maxInitialSize) {
          throw new Error('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB')
        }

        // Compress image: PNG (96x96px, max 30KB) or JPEG (128x128px, max 10KB)
        // PNG preserves transparency, JPEG has better compression
        const fileName = imageFile.name.toLowerCase()
        const isPng = fileName.endsWith('.png')
        
        if (isPng) {
          // PNG: 96x96px, max 30KB (to preserve transparency)
          fileToUpload = await compressImageForIcon(imageFile, 96, 96, 30, 0.6, true)
          
          // Verify compressed size (PNG is larger, allow up to 30KB)
          if (!isFileSizeAcceptable(fileToUpload, 30)) {
            throw new Error('Không thể nén ảnh PNG xuống dưới 30KB. Vui lòng chọn ảnh đơn giản hơn hoặc giảm kích thước.')
          }
        } else {
          // JPEG: 128x128px, max 10KB
          fileToUpload = await compressImageForIcon(imageFile, 128, 128, 10, 0.6, false)
          
          // Verify compressed size
          if (!isFileSizeAcceptable(fileToUpload, 10)) {
            throw new Error('Không thể nén ảnh xuống dưới 10KB. Vui lòng chọn ảnh khác')
          }
        }

        // Determine file type based on compressed file
        const compressedFileName = fileToUpload.name.toLowerCase()
        if (compressedFileName.endsWith('.png')) {
          fileType = 'png'
        } else {
          fileType = 'jpg'
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Không thể nén ảnh')
      }
    }

    const uploadResult = await uploadToCloudinary(fileToUpload, {
      useDefaultIconFolder: true, // Sử dụng VITE_CLOUDINARY_ICON_FOLDER nếu có, nếu không thì dùng 'icon_images'
      folder: 'icon_images', // Fallback nếu không có VITE_CLOUDINARY_ICON_FOLDER
    })
    updates.image_url = uploadResult.secure_url
    updates.file_type = fileType
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật icon image.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu icon image sau khi cập nhật.')
  }

  await invalidateIconImageCache()

  return data
}

/**
 * Delete icon image (soft delete - set is_active = false)
 */
export const deleteIconImage = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa icon image.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ is_active: false })
    .eq('id', id)

  throwIfError(error, 'Không thể xóa icon image.')

  await invalidateIconImageCache()
}

/**
 * Hard delete icon image (permanent)
 */
export const hardDeleteIconImage = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa icon image vĩnh viễn.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)

  throwIfError(error, 'Không thể xóa icon image vĩnh viễn.')

  await invalidateIconImageCache()
}

/**
 * Get icon image groups
 */
export const getIconImageGroups = async (): Promise<Array<{ id: string; label: string }>> => {
  const iconImages = await fetchIconImages({ is_active: true })
  const groups = new Map<string, string>()

  iconImages.forEach((icon) => {
    if (!groups.has(icon.group_id)) {
      groups.set(icon.group_id, icon.group_label)
    }
  })

  return Array.from(groups.entries()).map(([id, label]) => ({ id, label }))
}

/**
 * Get icon images by usage type
 */
export const getIconImagesByUsage = async (
  usageType: IconUsageType
): Promise<IconImageRecord[]> => {
  return fetchIconImages({ usage_type: usageType, is_active: true })
}

