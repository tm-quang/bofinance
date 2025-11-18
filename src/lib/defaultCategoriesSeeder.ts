/**
 * Helper functions to seed default_categories table from hardcoded data
 * 
 * IMPORTANT: 
 * - File defaultCategories.ts chỉ dùng để SEED BAN ĐẦU (một lần duy nhất)
 * - Sau khi seed xong, database (default_categories table) là SOURCE OF TRUTH
 * - Admin sẽ quản lý categories qua CMS, không cần file defaultCategories.ts nữa
 * - File defaultCategories.ts có thể xóa hoặc giữ làm backup/reference
 * 
 * Workflow:
 * 1. Setup ban đầu: Chạy seedDefaultCategoriesToDatabase() một lần
 * 2. Sau đó: Admin quản lý default_categories qua CMS
 * 3. User mới: Tự động copy từ default_categories vào categories của họ
 */

import { getSupabaseClient } from './supabaseClient'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/defaultCategories'

/**
 * Seed default_categories table from hardcoded data
 * 
 * ⚠️ CHỈ CHẠY MỘT LẦN DUY NHẤT khi setup ban đầu
 * Sau khi seed, database là source of truth, không cần file defaultCategories.ts nữa
 * 
 * @param force - Nếu true, sẽ xóa tất cả default_categories hiện có và seed lại
 */
export const seedDefaultCategoriesToDatabase = async (force: boolean = false): Promise<void> => {
  const supabase = getSupabaseClient()

  // Kiểm tra xem đã có data chưa
  const { data: existing } = await supabase
    .from('default_categories')
    .select('id')
    .limit(1)

  if (existing && existing.length > 0 && !force) {
    console.warn('⚠️ default_categories đã có dữ liệu. Dùng force=true để ghi đè.')
    throw new Error('default_categories đã có dữ liệu. Nếu muốn seed lại, dùng force=true')
  }

  // Clear existing nếu force = true
  if (force && existing && existing.length > 0) {
    console.log('🗑️ Xóa dữ liệu default_categories cũ...')
    await supabase.from('default_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }

  const parentIdMap = new Map<string, string>()

  // Seed expense categories
  for (const parent of DEFAULT_EXPENSE_CATEGORIES) {
    // Insert parent category
    const { data: parentData, error: parentError } = await supabase
      .from('default_categories')
      .insert({
        name: parent.name,
        type: parent.type,
        icon_id: parent.icon_id,
        icon_url: parent.icon_url || null,
        parent_id: null,
        display_order: parent.display_order,
      })
      .select()
      .single()

    if (parentError) {
      // If already exists, fetch it
      const { data: existing } = await supabase
        .from('default_categories')
        .select('id')
        .eq('name', parent.name)
        .eq('type', parent.type)
        .is('parent_id', null)
        .single()

      if (existing) {
        parentIdMap.set(parent.name, existing.id)
      } else {
        console.error('Error inserting parent category:', parent.name, parentError)
        continue
      }
    } else if (parentData) {
      parentIdMap.set(parent.name, parentData.id)
    }

    // Insert children
    if (parent.children && parentIdMap.has(parent.name)) {
      const parentId = parentIdMap.get(parent.name)!
      for (const child of parent.children) {
        const { error: childError } = await supabase
          .from('default_categories')
          .insert({
            name: child.name,
            type: child.type,
            icon_id: child.icon_id,
            icon_url: child.icon_url || null,
            parent_id: parentId,
            display_order: child.display_order,
          })

        if (childError && !childError.message.includes('duplicate')) {
          console.error('Error inserting child category:', child.name, childError)
        }
      }
    }
  }

  // Seed income categories
  for (const category of DEFAULT_INCOME_CATEGORIES) {
    const { error } = await supabase
      .from('default_categories')
      .insert({
        name: category.name,
        type: category.type,
        icon_id: category.icon_id,
        icon_url: category.icon_url || null,
        parent_id: null,
        display_order: category.display_order,
      })

    if (error && !error.message.includes('duplicate')) {
      console.error('Error inserting income category:', category.name, error)
    }
  }

  console.log('Default categories seeded successfully')
}

/**
 * Check if default_categories table has data
 */
export const hasDefaultCategories = async (): Promise<boolean> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('default_categories')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Error checking default_categories:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

