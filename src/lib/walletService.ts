import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { invalidateCache } from './cache'

export type WalletType = 'Tiền mặt' | 'Ngân hàng' | 'Tiết kiệm' | 'Tín dụng' | 'Đầu tư' | 'Khác'

export type WalletRecord = {
  id: string
  user_id: string
  name: string
  type: WalletType
  balance: number
  initial_balance: number // Số dư ban đầu (không đổi, dùng làm mốc tính toán)
  currency: string
  icon: string | null
  color: string | null
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export type WalletInsert = {
  name: string
  type: WalletType
  balance?: number
  currency?: string
  icon?: string
  color?: string
  description?: string
}

export type WalletUpdate = Partial<Omit<WalletInsert, 'type'>> & {
  is_active?: boolean
  balance?: number
}

const TABLE_NAME = 'wallets'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Lấy tất cả ví của user hiện tại
export const fetchWallets = async (includeInactive = false): Promise<WalletRecord[]> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem ví.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  throwIfError(error, 'Không thể tải danh sách ví.')

  return data ?? []
}

// Lấy một ví theo ID
export const getWalletById = async (id: string): Promise<WalletRecord | null> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem ví.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  throwIfError(error, 'Không thể tải thông tin ví.')

  return data
}

// Tạo ví mới
export const createWallet = async (payload: WalletInsert): Promise<WalletRecord> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo ví.')
  }

  const initialBalance = payload.balance ?? 0
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
      balance: initialBalance,
      initial_balance: initialBalance, // Số dư ban đầu = số dư khi tạo ví
      currency: payload.currency ?? 'VND',
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo ví mới.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu ví sau khi tạo.')
  }


  return data
}

// Cập nhật ví
export const updateWallet = async (id: string, updates: WalletUpdate): Promise<WalletRecord> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật ví.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật ví.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu ví sau khi cập nhật.')
  }


  return data
}

// Xóa ví (soft delete bằng cách set is_active = false)
export const deleteWallet = async (id: string, hardDelete = false): Promise<void> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa ví.')
  }

  if (hardDelete) {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id).eq('user_id', user.id)
    throwIfError(error, 'Không thể xóa ví.')
  } else {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id)
    throwIfError(error, 'Không thể vô hiệu hóa ví.')
  }

  // Invalidate cache để đảm bảo danh sách ví được cập nhật
  invalidateCache('fetchWallets')
}

// Cập nhật số dư ví
export const updateWalletBalance = async (id: string, newBalance: number): Promise<WalletRecord> => {
  return updateWallet(id, { balance: newBalance })
}

// Lấy tổng số dư tất cả ví
export const getTotalBalance = async (): Promise<number> => {
  const wallets = await fetchWallets()
  return wallets.reduce((total, wallet) => total + wallet.balance, 0)
}

// Lưu ví mặc định vào database
export const setDefaultWallet = async (walletId: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để đặt ví mặc định.')
  }

  // Kiểm tra xem ví có thuộc về user không
  const wallet = await getWalletById(walletId)
  if (!wallet) {
    throw new Error('Ví không tồn tại.')
  }

  // Lưu vào bảng user_preferences
  // Bảng này được tạo bằng migration SQL (xem supabase/migrations/create_user_preferences.sql)
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        key: 'default_wallet_id',
        value: walletId,
        // updated_at sẽ được tự động cập nhật bởi trigger
      },
      {
        onConflict: 'user_id,key',
      }
    )

  if (error) {
    // Nếu bảng user_preferences không tồn tại, fallback về localStorage
    console.warn('Không thể lưu ví mặc định vào database:', error)
    try {
      localStorage.setItem('bofin_default_wallet_id', walletId)
    } catch (e) {
      console.error('Không thể lưu vào localStorage:', e)
    }
  } else {
    // Invalidate cache để đảm bảo dữ liệu mới nhất
    invalidateCache('fetchWallets')
  }
}

// Lấy ví mặc định từ database
export const getDefaultWallet = async (): Promise<string | null> => {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', 'default_wallet_id')
    .single()

  if (error || !data) {
    // Fallback về localStorage
    try {
      return localStorage.getItem('bofin_default_wallet_id')
    } catch {
      return null
    }
  }

  return data.value as string
}

