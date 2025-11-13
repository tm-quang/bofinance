import type { PostgrestError } from '@supabase/supabase-js'

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
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('name', { ascending: true })

  throwIfError(error, 'Không thể tải danh mục.')

  return data ?? []
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

  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)

  throwIfError(error, 'Không thể xoá danh mục.')
}


