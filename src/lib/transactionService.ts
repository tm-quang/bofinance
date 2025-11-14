import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { syncWalletBalanceFromTransactions } from './walletBalanceService'
import { cacheFirstWithRefresh, cacheManager, invalidateCache } from './cache'
import { getCachedUser } from './userCache'

export type TransactionType = 'Thu' | 'Chi'

export type TransactionRecord = {
  id: string
  user_id: string
  wallet_id: string
  category_id: string
  type: TransactionType
  amount: number
  description: string | null
  transaction_date: string
  notes: string | null
  tags: string[] | null
  image_urls: string[] | null
  created_at: string
  updated_at: string
}

export type TransactionInsert = {
  wallet_id: string
  category_id: string
  type: TransactionType
  amount: number
  description?: string
  transaction_date?: string
  notes?: string
  tags?: string[]
  image_urls?: string[]
}

export type TransactionUpdate = Partial<
  Omit<TransactionInsert, 'wallet_id' | 'category_id' | 'type'>
> & {
  wallet_id?: string
  category_id?: string
  type?: TransactionType
}

export type TransactionFilters = {
  wallet_id?: string
  category_id?: string
  type?: TransactionType
  start_date?: string
  end_date?: string
  tags?: string[]
  limit?: number
  offset?: number
}

const TABLE_NAME = 'transactions'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Lấy tất cả giao dịch với filters
export const fetchTransactions = async (
  filters?: TransactionFilters
): Promise<TransactionRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem giao dịch.')
  }

  const cacheKey = await cacheManager.generateKey('transactions', {
    ...filters,
  })

  const fetchFromSupabase = async (): Promise<TransactionRecord[]> => {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters) {
      if (filters.wallet_id) {
        query = query.eq('wallet_id', filters.wallet_id)
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.start_date) {
        query = query.gte('transaction_date', filters.start_date)
      }
      if (filters.end_date) {
        query = query.lte('transaction_date', filters.end_date)
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags)
      }
      if (typeof filters.limit === 'number') {
        query = query.limit(filters.limit)
      }
      if (typeof filters.offset === 'number') {
        const limit = filters.limit || 50
        query = query.range(filters.offset, filters.offset + limit - 1)
      }
    }

    const { data, error } = await query

    throwIfError(error, 'Không thể tải danh sách giao dịch.')

    return data ?? []
  }

  // Cache với TTL 24 giờ cho session cache
  return cacheFirstWithRefresh(cacheKey, fetchFromSupabase, 24 * 60 * 60 * 1000, 12 * 60 * 60 * 1000)
}

// Lấy một giao dịch theo ID
export const getTransactionById = async (id: string): Promise<TransactionRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem giao dịch.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  throwIfError(error, 'Không thể tải thông tin giao dịch.')

  return data
}

// Tạo giao dịch mới
export const createTransaction = async (payload: TransactionInsert): Promise<TransactionRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo giao dịch.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
      transaction_date: payload.transaction_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo giao dịch mới.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu giao dịch sau khi tạo.')
  }

  // Tự động cập nhật số dư ví từ giao dịch (chạy trong background)
  syncWalletBalanceFromTransactions(payload.wallet_id).catch((error) => {
    console.warn('Error syncing wallet balance after transaction creation:', error)
  })

  await invalidateCache('transactions')
  await invalidateCache('getTransactionStats')
  // Invalidate wallet cash flow stats cache vì có giao dịch mới
  await invalidateCache('getWalletCashFlowStats')

  return data
}

// Cập nhật giao dịch
export const updateTransaction = async (
  id: string,
  updates: TransactionUpdate
): Promise<TransactionRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật giao dịch.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật giao dịch.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu giao dịch sau khi cập nhật.')
  }

  // Tự động cập nhật số dư ví từ giao dịch
  // Cần lấy wallet_id từ giao dịch cũ hoặc mới
  const walletId = updates.wallet_id || data.wallet_id
  if (walletId) {
    syncWalletBalanceFromTransactions(walletId).catch((error) => {
      console.warn('Error syncing wallet balance after transaction update:', error)
    })
  }

  invalidateCache('transactions')
  invalidateCache('getTransactionStats')
  // Invalidate wallet cash flow stats cache vì có giao dịch được cập nhật
  invalidateCache('getWalletCashFlowStats')

  return data
}

// Xóa giao dịch
export const deleteTransaction = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa giao dịch.')
  }

  // Lấy wallet_id trước khi xóa
  const { data: transaction } = await supabase
    .from(TABLE_NAME)
    .select('wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const walletId = transaction?.wallet_id

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  throwIfError(error, 'Không thể xóa giao dịch.')

  // Tự động cập nhật số dư ví từ giao dịch
  if (walletId) {
    syncWalletBalanceFromTransactions(walletId).catch((error) => {
      console.warn('Error syncing wallet balance after transaction deletion:', error)
    })
  }

  invalidateCache('transactions')
  invalidateCache('getTransactionStats')
  // Invalidate wallet cash flow stats cache vì có giao dịch bị xóa
  invalidateCache('getWalletCashFlowStats')
}

// Lấy thống kê giao dịch
export const getTransactionStats = async (
  startDate?: string,
  endDate?: string,
  walletId?: string
): Promise<{
  total_income: number
  total_expense: number
  net_balance: number
  transaction_count: number
}> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem thống kê.')
  }

  const cacheKey = await cacheManager.generateKey('getTransactionStats', {
    startDate,
    endDate,
    walletId,
  })

  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select('type, amount')
        .eq('user_id', user.id)

      if (walletId) {
        query = query.eq('wallet_id', walletId)
      }
      if (startDate) {
        query = query.gte('transaction_date', startDate)
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate)
      }

      const { data, error } = await query

      throwIfError(error, 'Không thể tải thống kê giao dịch.')

      const transactions = data ?? []
      const total_income = transactions
        .filter((t) => t.type === 'Thu')
        .reduce((sum, t) => sum + Number(t.amount), 0)
      const total_expense = transactions
        .filter((t) => t.type === 'Chi')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      return {
        total_income,
        total_expense,
        net_balance: total_income - total_expense,
        transaction_count: transactions.length,
      }
    },
    24 * 60 * 60 * 1000, // 24 giờ
    12 * 60 * 60 * 1000  // 12 giờ stale threshold
  )
}

