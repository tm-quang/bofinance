import type { PostgrestError } from '@supabase/supabase-js'

import { cacheManager, invalidateCache } from './cache'
import { getSupabaseClient } from './supabaseClient'

export type CategoryType = 'Chi tiêu' | 'Thu nhập'

export type CategoryRecord = {
  id: string
  name: string
  type: CategoryType
  icon_id: string
  user_id?: string | null
  created_at: string
  updated_at?: string | null
}

export type CategoryInsert = {
  name: string
  type: CategoryType
  icon_id: string
  user_id?: string | null
}

export type CategoryUpdate = Partial<Omit<CategoryInsert, 'user_id'>> & {
  icon_id?: string
}

const TABLE_NAME = 'categories'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

export const fetchCategories = async (): Promise<CategoryRecord[]> => {
  // Generate cache key
  const cacheKey = cacheManager.generateKey('fetchCategories')
  
  // Check cache
  const cached = cacheManager.get<CategoryRecord[]>(cacheKey)
  if (cached !== null) {
    return cached
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('name', { ascending: true })

  throwIfError(error, 'Không thể tải danh mục.')

  const result = data ?? []
  
  // Cache result (10 minutes for categories as they change rarely)
  cacheManager.set(cacheKey, result, 10 * 60 * 1000)

  return result
}

export const createCategory = async (payload: CategoryInsert): Promise<CategoryRecord> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(payload)
    .select()
    .single()

  throwIfError(error, 'Không thể tạo danh mục.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu danh mục sau khi tạo.')
  }

  // Invalidate category cache
  invalidateCache('fetchCategories')

  return data
}

export const updateCategory = async (
  id: string,
  updates: CategoryUpdate
): Promise<CategoryRecord> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật danh mục.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu danh mục sau khi cập nhật.')
  }

  // Invalidate category cache
  invalidateCache('fetchCategories')

  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)

  throwIfError(error, 'Không thể xoá danh mục.')

  // Invalidate category cache
  invalidateCache('fetchCategories')
}


