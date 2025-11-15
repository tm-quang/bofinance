
import { getSupabaseClient } from './supabaseClient'
import { cacheFirstWithRefresh, cacheManager } from './cache'
import { getCachedUser } from './userCache'

export type ReminderType = 'Thu' | 'Chi'
export type ReminderStatus = 'pending' | 'completed' | 'skipped'
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type ReminderRecord = {
  id: string
  user_id: string
  title: string
  type: ReminderType
  amount: number | null
  category_id: string | null
  wallet_id: string | null
  reminder_date: string
  reminder_time: string | null
  repeat_type: RepeatType
  repeat_until: string | null
  status: ReminderStatus
  completed_at: string | null
  notes: string | null
  color: string | null
  enable_notification: boolean
  created_at: string
  updated_at: string
  is_active: boolean
}

export type ReminderInsert = {
  title: string
  type: ReminderType
  amount?: number
  category_id?: string
  wallet_id?: string
  reminder_date: string
  reminder_time?: string
  repeat_type?: RepeatType
  repeat_until?: string
  notes?: string
  color?: string
  enable_notification?: boolean
}

export type ReminderUpdate = Partial<Omit<ReminderInsert, 'type'>> & {
  type?: ReminderType
  status?: ReminderStatus
  completed_at?: string | null
}

export type ReminderFilters = {
  status?: ReminderStatus
  type?: ReminderType
  start_date?: string
  end_date?: string
  is_active?: boolean
}

const CACHE_KEY = 'reminders'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch reminders with caching
 */
export const fetchReminders = async (filters?: ReminderFilters): Promise<ReminderRecord[]> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const cacheKey = `${CACHE_KEY}:${user.id}:${JSON.stringify(filters || {})}`

  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      const supabase = getSupabaseClient()
      let query = supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: true })
        .order('reminder_time', { ascending: true, nullsFirst: false })

      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.type) {
          query = query.eq('type', filters.type)
        }
        if (filters.start_date) {
          query = query.gte('reminder_date', filters.start_date)
        }
        if (filters.end_date) {
          query = query.lte('reminder_date', filters.end_date)
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return (data || []) as ReminderRecord[]
    },
    CACHE_TTL
  )
}

/**
 * Get reminder by ID with caching
 */
export const getReminderById = async (id: string): Promise<ReminderRecord | null> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const cacheKey = `${CACHE_KEY}:${user.id}:byId:${id}`

  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as ReminderRecord
    },
    CACHE_TTL
  )
}

/**
 * Create a new reminder
 */
export const createReminder = async (reminder: ReminderInsert): Promise<ReminderRecord> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      ...reminder,
      user_id: user.id,
      repeat_type: reminder.repeat_type || 'none',
      is_active: true,
      status: 'pending',
      enable_notification: reminder.enable_notification !== undefined ? reminder.enable_notification : true,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  // Invalidate cache
  await cacheManager.invalidate(new RegExp(`^${CACHE_KEY}:${user.id}:`))

  return data as ReminderRecord
}

/**
 * Update a reminder
 */
export const updateReminder = async (
  id: string,
  updates: ReminderUpdate
): Promise<ReminderRecord> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reminders')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    throw error
  }

  // Invalidate cache
  await cacheManager.invalidate(new RegExp(`^${CACHE_KEY}:${user.id}:`))

  return data as ReminderRecord
}

/**
 * Delete a reminder (soft delete by setting is_active = false)
 */
export const deleteReminder = async (id: string): Promise<void> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('reminders')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw error
  }

  // Invalidate cache
  await cacheManager.invalidate(new RegExp(`^${CACHE_KEY}:${user.id}:`))
}

/**
 * Mark reminder as completed
 */
export const completeReminder = async (id: string): Promise<ReminderRecord> => {
  return updateReminder(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  })
}

/**
 * Mark reminder as skipped
 */
export const skipReminder = async (id: string): Promise<ReminderRecord> => {
  return updateReminder(id, {
    status: 'skipped',
  })
}

/**
 * Get reminders for today with caching
 * Cache TTL is shorter (1 minute) since it's date-dependent
 */
export const getTodayReminders = async (): Promise<ReminderRecord[]> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `${CACHE_KEY}:${user.id}:today:${today}`

  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      const allReminders = await fetchReminders({
        status: 'pending',
        is_active: true,
      })
      return allReminders.filter((r) => r.reminder_date === today)
    },
    1 * 60 * 1000 // 1 minute cache for today's reminders
  )
}

/**
 * Get upcoming reminders with caching
 * Cache TTL is shorter (2 minutes) since it's date-dependent
 */
export const getUpcomingReminders = async (days: number = 7): Promise<ReminderRecord[]> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const cacheKey = `${CACHE_KEY}:${user.id}:upcoming:${today}:${futureDateStr}`

  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      return fetchReminders({
        start_date: today,
        end_date: futureDateStr,
        status: 'pending',
        is_active: true,
      })
    },
    2 * 60 * 1000 // 2 minutes cache for upcoming reminders
  )
}

