import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { cacheFirstWithRefresh, cacheManager, invalidateCache } from './cache'
import { getCachedUser } from './userCache'
import { fetchTransactions, type TransactionRecord } from './transactionService'
import { fetchCategories } from './categoryService'

export type PeriodType = 'weekly' | 'monthly' | 'yearly'

export type BudgetRecord = {
  id: string
  user_id: string
  category_id: string
  wallet_id: string | null
  amount: number
  period_type: PeriodType
  period_start: string
  period_end: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type BudgetInsert = {
  category_id: string
  wallet_id?: string | null
  amount: number
  period_type: PeriodType
  period_start: string
  period_end: string
  notes?: string
}

export type BudgetUpdate = Partial<Omit<BudgetInsert, 'category_id'>> & {
  is_active?: boolean
}

export type BudgetStatus = 'safe' | 'warning' | 'danger' | 'critical'

export type BudgetWithSpending = BudgetRecord & {
  spent_amount: number
  usage_percentage: number
  remaining_amount: number
  status: BudgetStatus
}

export type BudgetFilters = {
  category_id?: string
  wallet_id?: string
  period_type?: PeriodType
  year?: number
  month?: number
  is_active?: boolean
}

const TABLE_NAME = 'budgets'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Calculate period dates
export const calculatePeriod = (
  periodType: PeriodType,
  year: number,
  month?: number
): { start: Date; end: Date } => {
  if (periodType === 'monthly' && month) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    return { start, end }
  }

  if (periodType === 'yearly') {
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59)
    return { start, end }
  }

  // Weekly - simplified, can be enhanced
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31, 23, 59, 59)
  return { start, end }
}

// Get current period
export const getCurrentPeriod = (periodType: PeriodType): { start: Date; end: Date } => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  if (periodType === 'monthly') {
    return calculatePeriod('monthly', year, month)
  }

  if (periodType === 'yearly') {
    return calculatePeriod('yearly', year)
  }

  // Weekly - simplified
  return calculatePeriod('yearly', year)
}

// Calculate spent amount
const calculateBudgetSpent = (
  budget: BudgetRecord,
  transactions: TransactionRecord[]
): number => {
  return transactions
    .filter((t) => {
      if (t.category_id !== budget.category_id) return false
      if (t.type !== 'Chi') return false

      const txDate = new Date(t.transaction_date)
      const periodStart = new Date(budget.period_start)
      const periodEnd = new Date(budget.period_end)

      if (txDate < periodStart || txDate > periodEnd) return false
      if (budget.wallet_id && t.wallet_id !== budget.wallet_id) return false

      return true
    })
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

// Calculate usage percentage
const calculateUsagePercentage = (spent: number, budget: number): number => {
  if (budget <= 0) return 0
  return Math.round((spent / budget) * 100 * 100) / 100
}

// Get budget status
export const getBudgetStatus = (percentage: number): BudgetStatus => {
  if (percentage < 80) return 'safe'
  if (percentage < 100) return 'warning'
  if (percentage < 120) return 'danger'
  return 'critical'
}

// Get budget color
export const getBudgetColor = (status: BudgetStatus): string => {
  switch (status) {
    case 'safe':
      return 'emerald'
    case 'warning':
      return 'amber'
    case 'danger':
      return 'red'
    case 'critical':
      return 'rose'
  }
}

// Fetch budgets
export const fetchBudgets = async (filters?: BudgetFilters): Promise<BudgetRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem ngân sách.')
  }

  const cacheKey = await cacheManager.generateKey('budgets', filters)

  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters) {
        if (filters.category_id) query = query.eq('category_id', filters.category_id)
        if (filters.wallet_id) query = query.eq('wallet_id', filters.wallet_id)
        if (filters.period_type) query = query.eq('period_type', filters.period_type)
        if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)
        if (filters.year) {
          query = query.gte('period_start', `${filters.year}-01-01`)
          query = query.lte('period_end', `${filters.year}-12-31`)
        }
        if (filters.month && filters.year) {
          const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
          const end = new Date(filters.year, filters.month, 0).toISOString().split('T')[0]
          query = query.gte('period_start', start)
          query = query.lte('period_end', end)
        }
      }

      const { data, error } = await query

      throwIfError(error, 'Không thể tải danh sách ngân sách.')

      return data ?? []
    },
    24 * 60 * 60 * 1000,
    12 * 60 * 60 * 1000
  )
}

// Get budget by ID
export const getBudgetById = async (id: string): Promise<BudgetRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem ngân sách.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  throwIfError(error, 'Không thể tải ngân sách.')

  return data
}

// Get budget with spending
export const getBudgetWithSpending = async (budgetId: string): Promise<BudgetWithSpending> => {
  const budget = await getBudgetById(budgetId)
  if (!budget) {
    throw new Error('Không tìm thấy ngân sách.')
  }

  const transactions = await fetchTransactions({
    category_id: budget.category_id,
    type: 'Chi',
    start_date: budget.period_start,
    end_date: budget.period_end,
    wallet_id: budget.wallet_id || undefined,
  })

  const spent = calculateBudgetSpent(budget, transactions)
  const percentage = calculateUsagePercentage(spent, budget.amount)
  const status = getBudgetStatus(percentage)

  return {
    ...budget,
    spent_amount: spent,
    usage_percentage: percentage,
    remaining_amount: Math.max(0, budget.amount - spent),
    status,
  }
}

// Create budget
export const createBudget = async (payload: BudgetInsert): Promise<BudgetRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo ngân sách.')
  }

  // Validate category is "Chi tiêu"
  const categories = await fetchCategories()
  const category = categories.find((c) => c.id === payload.category_id)
  if (!category || category.type !== 'Chi tiêu') {
    throw new Error('Ngân sách chỉ có thể đặt cho danh mục "Chi tiêu".')
  }

  // Check for duplicate active budget
  const existingBudgets = await fetchBudgets({
    category_id: payload.category_id,
    wallet_id: payload.wallet_id || undefined,
    is_active: true,
  })

  const hasOverlap = existingBudgets.some((b) => {
    const bStart = new Date(b.period_start)
    const bEnd = new Date(b.period_end)
    const pStart = new Date(payload.period_start)
    const pEnd = new Date(payload.period_end)

    return (
      (pStart >= bStart && pStart <= bEnd) ||
      (pEnd >= bStart && pEnd <= bEnd) ||
      (pStart <= bStart && pEnd >= bEnd)
    )
  })

  if (hasOverlap) {
    throw new Error('Đã có ngân sách active cho danh mục này trong khoảng thời gian này.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo ngân sách.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu ngân sách sau khi tạo.')
  }

  await invalidateCache('budgets')

  return data
}

// Update budget
export const updateBudget = async (id: string, updates: BudgetUpdate): Promise<BudgetRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật ngân sách.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật ngân sách.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu ngân sách sau khi cập nhật.')
  }

  await invalidateCache('budgets')

  return data
}

// Delete budget
export const deleteBudget = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa ngân sách.')
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id).eq('user_id', user.id)

  throwIfError(error, 'Không thể xóa ngân sách.')

  await invalidateCache('budgets')
}

// Get active budgets for current period
export const getActiveBudgetsForCurrentPeriod = async (
  periodType: PeriodType = 'monthly'
): Promise<BudgetWithSpending[]> => {
  const period = getCurrentPeriod(periodType)
  const budgets = await fetchBudgets({
    is_active: true,
    period_type: periodType,
  })

  const currentBudgets = budgets.filter((b) => {
    const bStart = new Date(b.period_start)
    const bEnd = new Date(b.period_end)
    return period.start >= bStart && period.end <= bEnd
  })

  const budgetsWithSpending = await Promise.all(
    currentBudgets.map((b) => getBudgetWithSpending(b.id))
  )

  return budgetsWithSpending.sort((a, b) => b.usage_percentage - a.usage_percentage)
}

