import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'

export type ProfileRecord = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export type ProfileUpdate = {
  full_name?: string
  avatar_url?: string
  phone?: string
  date_of_birth?: string
}

const TABLE_NAME = 'profiles'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Lấy thông tin profile của user hiện tại
export const getCurrentProfile = async (): Promise<ProfileRecord | null> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', user.id)
    .single()

  throwIfError(error, 'Không thể tải thông tin cá nhân.')

  return data
}

// Cập nhật thông tin cá nhân
export const updateProfile = async (updates: ProfileUpdate): Promise<ProfileRecord> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật thông tin.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật thông tin cá nhân.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu sau khi cập nhật.')
  }

  return data
}

// Đổi mật khẩu
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để đổi mật khẩu.')
  }

  // Xác thực mật khẩu hiện tại bằng cách đăng nhập lại
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email || '',
    password: currentPassword,
  })

  if (signInError) {
    throw new Error('Mật khẩu hiện tại không đúng.')
  }

  // Cập nhật mật khẩu mới
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  throwIfError(updateError, 'Không thể đổi mật khẩu.')
}

// Upload avatar và cập nhật URL
export const uploadAvatar = async (file: File): Promise<string> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để upload avatar.')
  }

  // Tạo tên file unique với format: {user_id}/{timestamp}.{ext}
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${user.id}/${fileName}`

  // Xóa avatar cũ nếu có
  const profile = await getCurrentProfile()
  if (profile?.avatar_url) {
    try {
      await deleteAvatar()
    } catch {
      // Ignore error if old avatar doesn't exist
    }
  }

  // Upload file lên storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Không thể upload avatar: ${uploadError.message}`)
  }

  // Lấy public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(filePath)

  // Cập nhật avatar_url trong profile
  await updateProfile({ avatar_url: publicUrl })

  return publicUrl
}

// Xóa avatar
export const deleteAvatar = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa avatar.')
  }

  const profile = await getCurrentProfile()

  if (profile?.avatar_url) {
    // Extract file path from URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/avatars/{user_id}/{filename}
    const urlParts = profile.avatar_url.split('/')
    const fileNameIndex = urlParts.findIndex((part) => part === 'avatars')
    if (fileNameIndex !== -1 && fileNameIndex < urlParts.length - 1) {
      const filePath = urlParts.slice(fileNameIndex + 1).join('/')

      // Xóa file từ storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath])

      if (deleteError) {
        console.warn('Không thể xóa file avatar:', deleteError.message)
      }
    }
  }

  // Cập nhật profile để xóa avatar_url
  await updateProfile({ avatar_url: null })
}

