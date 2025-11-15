import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { cacheFirstWithRefresh, cacheManager, invalidateCache } from './cache'
import { getCachedUser } from './userCache'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/defaultCategories'
import { fetchDefaultCategoriesHierarchical } from './defaultCategoryService'

export type CategoryType = 'Chi tiêu' | 'Thu nhập'

export type CategoryRecord = {
  id: string
  name: string
  type: CategoryType
  icon_id: string
  user_id: string
  parent_id?: string | null
  is_default?: boolean
  default_category_id?: string | null
  display_order?: number
  created_at: string
  updated_at?: string | null
}

export type CategoryWithChildren = CategoryRecord & {
  children?: CategoryRecord[]
}

export type CategoryInsert = {
  name: string
  type: CategoryType
  icon_id: string
  parent_id?: string | null
  display_order?: number
}

export type CategoryUpdate = Partial<CategoryInsert> & {
  icon_id?: string
  parent_id?: string | null
  display_order?: number
  is_default?: boolean
}

const TABLE_NAME = 'categories'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

/**
 * Invalidate cả flat và hierarchical categories cache
 */
const invalidateCategoriesCache = async (): Promise<void> => {
  await Promise.all([
    invalidateCache('categories'),
    invalidateCache('categories_hierarchical'),
  ])
}

export const fetchCategories = async (): Promise<CategoryRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem hạng mục.')
  }

  const cacheKey = await cacheManager.generateKey('categories', {})

  // Cache với TTL 24 giờ cho session cache
  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      throwIfError(error, 'Không thể tải hạng mục.')

      return data ?? []
    },
    24 * 60 * 60 * 1000, // 24 giờ
    12 * 60 * 60 * 1000  // 12 giờ stale threshold
  )
}

/**
 * Lấy hạng mục được tổ chức theo cấu trúc cha-con
 * Có cache riêng để tránh tính toán lại
 * @param categoryType - Lọc theo loại hạng mục (Chi tiêu hoặc Thu nhập). Nếu không có, lấy tất cả.
 */
export const fetchCategoriesHierarchical = async (categoryType?: CategoryType): Promise<CategoryWithChildren[]> => {
  const cacheKey = await cacheManager.generateKey('categories_hierarchical', { categoryType })

  // Cache với TTL 24 giờ, stale threshold 12 giờ
  return cacheFirstWithRefresh(
    cacheKey,
    async () => {
      const allCategories = await fetchCategories()
      
      // Filter theo type nếu có
      const filteredCategories = categoryType 
        ? allCategories.filter(cat => cat.type === categoryType)
        : allCategories
      
      // Tách hạng mục cha và con
      const parentCategories = filteredCategories.filter(cat => !cat.parent_id)
      const childCategories = filteredCategories.filter(cat => cat.parent_id)
      
      // Nhóm con theo parent_id
      const childrenByParent = new Map<string, CategoryRecord[]>()
      childCategories.forEach(child => {
        const parentId = child.parent_id!
        if (!childrenByParent.has(parentId)) {
          childrenByParent.set(parentId, [])
        }
        childrenByParent.get(parentId)!.push(child)
      })
      
      // Tạo cấu trúc phân cấp
      return parentCategories.map(parent => ({
        ...parent,
        children: (childrenByParent.get(parent.id) || []).sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return (a.display_order || 0) - (b.display_order || 0)
          }
          return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
        })
      })).sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return (a.display_order || 0) - (b.display_order || 0)
        }
        return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
      })
    },
    24 * 60 * 60 * 1000, // 24 giờ
    12 * 60 * 60 * 1000  // 12 giờ stale threshold
  )
}

export const createCategory = async (payload: CategoryInsert): Promise<CategoryRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo hạng mục.')
  }

  // Kiểm tra nếu có parent_id, đảm bảo parent tồn tại và thuộc cùng user
  if (payload.parent_id) {
    const { data: parent } = await supabase
      .from(TABLE_NAME)
      .select('id, type')
      .eq('id', payload.parent_id)
      .eq('user_id', user.id)
      .single()

    if (!parent) {
      throw new Error('Hạng mục cha không tồn tại hoặc không thuộc về bạn.')
    }

    // Đảm bảo type giống nhau
    if (parent.type !== payload.type) {
      throw new Error('Hạng mục con phải cùng loại với hạng mục cha.')
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
      is_default: false,
      display_order: payload.display_order ?? 0,
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo hạng mục.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu hạng mục sau khi tạo.')
  }

  await invalidateCategoriesCache()

  return data
}

export const updateCategory = async (
  id: string,
  updates: CategoryUpdate
): Promise<CategoryRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật hạng mục.')
  }

  // Kiểm tra nếu đang thay đổi parent_id
  if (updates.parent_id !== undefined) {
    // Nếu set parent_id = null, nghĩa là chuyển thành mục cha
    if (updates.parent_id === null) {
      // OK, không cần kiểm tra gì
    } else {
      // Kiểm tra parent tồn tại và thuộc cùng user
      const { data: parent } = await supabase
        .from(TABLE_NAME)
        .select('id, type')
        .eq('id', updates.parent_id)
        .eq('user_id', user.id)
        .single()

      if (!parent) {
        throw new Error('Hạng mục cha không tồn tại hoặc không thuộc về bạn.')
      }

      // Lấy type hiện tại của category đang cập nhật
      const { data: currentCategory } = await supabase
        .from(TABLE_NAME)
        .select('type')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!currentCategory) {
        throw new Error('Không tìm thấy hạng mục cần cập nhật.')
      }

      const categoryType = updates.type || currentCategory.type

      // Đảm bảo type giống nhau
      if (parent.type !== categoryType) {
        throw new Error('Hạng mục con phải cùng loại với hạng mục cha.')
      }

      // Không cho phép set parent là chính nó
      if (updates.parent_id === id) {
        throw new Error('Không thể đặt hạng mục làm cha của chính nó.')
      }
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật hạng mục.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu hạng mục sau khi cập nhật.')
  }

  await invalidateCategoriesCache()

  return data
}

/**
 * Di chuyển hạng mục con sang mục cha khác
 */
export const moveCategoryToParent = async (
  categoryId: string,
  newParentId: string | null
): Promise<CategoryRecord> => {
  return updateCategory(categoryId, { parent_id: newParentId })
}

/**
 * Khởi tạo hạng mục mặc định cho user từ database default_categories
 * Được gọi tự động khi user mới truy cập trang Category lần đầu
 * Nếu database không có, sẽ fallback về hardcode
 */
export const initializeDefaultCategories = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để khởi tạo hạng mục mặc định.')
  }

  // Kiểm tra xem user đã có hạng mục chưa (bất kỳ hạng mục nào)
  const { data: existingCategories } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (existingCategories && existingCategories.length > 0) {
    // Đã có hạng mục rồi, không cần tạo lại
    return
  }

  // Tạo map để lưu mapping giữa default_category_id và category_id mới
  const defaultToCategoryMap = new Map<string, string>()

  try {
    // Đọc từ database default_categories (source of truth)
    const defaultCategories = await fetchDefaultCategoriesHierarchical()
    
    if (defaultCategories && defaultCategories.length > 0) {
      // Tối ưu: Insert batch tất cả parent categories cùng lúc
      const parentInserts = defaultCategories.map(cat => ({
        user_id: user.id,
        name: cat.name,
        type: cat.type,
        icon_id: cat.icon_id,
        parent_id: null,
        is_default: true,
        display_order: cat.display_order,
      }))

      const { data: insertedParents, error: parentError } = await supabase
        .from(TABLE_NAME)
        .insert(parentInserts)
        .select()

      if (parentError) {
        throw parentError
      }

      // Tạo map default_category_id -> new category_id
      if (insertedParents) {
        defaultCategories.forEach((defaultCat, index) => {
          if (insertedParents[index]) {
            defaultToCategoryMap.set(defaultCat.id, insertedParents[index].id)
          }
        })
      }

      // Tối ưu: Thu thập tất cả children và insert batch
      const childInserts: Array<{
        user_id: string
        name: string
        type: CategoryType
        icon_id: string
        parent_id: string
        is_default: boolean
        display_order: number
      }> = []

      defaultCategories.forEach((defaultCat) => {
        const parentCategoryId = defaultToCategoryMap.get(defaultCat.id)
        if (parentCategoryId && defaultCat.children && defaultCat.children.length > 0) {
          defaultCat.children.forEach(childCat => {
            childInserts.push({
              user_id: user.id,
              name: childCat.name,
              type: childCat.type,
              icon_id: childCat.icon_id,
              parent_id: parentCategoryId,
              is_default: true,
              display_order: childCat.display_order,
            })
          })
        }
      })

      // Insert batch tất cả children cùng lúc
      if (childInserts.length > 0) {
        const { error: childError } = await supabase
          .from(TABLE_NAME)
          .insert(childInserts)

        if (childError) {
          console.error('Error inserting child categories:', childError)
          // Không throw, vì parent đã insert thành công
        }
      }
    } else {
      // Nếu database không có data, fallback về hardcode (chỉ lần đầu setup)
      // Sau khi admin seed data vào database, sẽ không còn fallback nữa
      console.warn('Database chưa có default categories, sử dụng hardcode fallback. Vui lòng seed data vào database.')
      await initializeFromHardcode()
    }
  } catch (error) {
    // Nếu lỗi khi đọc từ database (có thể do RLS hoặc table chưa tồn tại), fallback về hardcode
    console.warn('Lỗi khi đọc default categories từ database, sử dụng hardcode fallback:', error)
    await initializeFromHardcode()
  }

  await invalidateCategoriesCache()
}

/**
 * Fallback: Khởi tạo từ hardcode nếu database không có
 * Tối ưu: Insert batch để tăng tốc độ
 */
const initializeFromHardcode = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    return
  }

  // Tạo map để lưu mapping giữa tên parent và category_id mới
  const parentNameToIdMap = new Map<string, string>()

  // Tối ưu: Thu thập tất cả parent categories và insert batch
  const parentInserts = [
    ...DEFAULT_EXPENSE_CATEGORIES.map(cat => ({
      user_id: user.id,
      name: cat.name,
      type: cat.type as CategoryType,
      icon_id: cat.icon_id,
      parent_id: null,
      is_default: true,
      display_order: cat.display_order,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map(cat => ({
      user_id: user.id,
      name: cat.name,
      type: cat.type as CategoryType,
      icon_id: cat.icon_id,
      parent_id: null,
      is_default: true,
      display_order: cat.display_order,
    })),
  ]

  // Insert batch tất cả parents cùng lúc
  const { data: insertedParents, error: parentError } = await supabase
    .from(TABLE_NAME)
    .insert(parentInserts)
    .select()

  if (parentError) {
    console.error('Error inserting parent categories:', parentError)
    return
  }

  // Tạo map parent name -> category id
  if (insertedParents) {
    let expenseIndex = 0
    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      if (insertedParents[expenseIndex]) {
        parentNameToIdMap.set(cat.name, insertedParents[expenseIndex].id)
        expenseIndex++
      }
    })
  }

  // Tối ưu: Thu thập tất cả children và insert batch
  const childInserts: Array<{
    user_id: string
    name: string
    type: CategoryType
    icon_id: string
    parent_id: string
    is_default: boolean
    display_order: number
  }> = []

  DEFAULT_EXPENSE_CATEGORIES.forEach((parentCat) => {
    const parentId = parentNameToIdMap.get(parentCat.name)
    if (parentId && parentCat.children && parentCat.children.length > 0) {
      parentCat.children.forEach(childCat => {
        childInserts.push({
          user_id: user.id,
          name: childCat.name,
          type: childCat.type as CategoryType,
          icon_id: childCat.icon_id,
          parent_id: parentId,
          is_default: true,
          display_order: childCat.display_order,
        })
      })
    }
  })

  // Insert batch tất cả children cùng lúc
  if (childInserts.length > 0) {
    const { error: childError } = await supabase
      .from(TABLE_NAME)
      .insert(childInserts)

    if (childError) {
      console.error('Error inserting child categories:', childError)
      // Không throw, vì parent đã insert thành công
    }
  }
}

export const deleteCategory = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xoá hạng mục.')
  }

  // Kiểm tra xem hạng mục có con không
  const { data: children } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('parent_id', id)
    .eq('user_id', user.id)
    .limit(1)

  if (children && children.length > 0) {
    throw new Error('Không thể xóa hạng mục cha khi còn hạng mục con. Vui lòng xóa hoặc di chuyển các hạng mục con trước.')
  }

  // Cập nhật tất cả transactions có category_id = id thành null
  // Điều này đảm bảo các giao dịch không bị mất dữ liệu, chỉ không hiển thị hạng mục nữa
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ category_id: null })
    .eq('category_id', id)
    .eq('user_id', user.id)

  if (updateError) {
    console.warn('Error updating transactions when deleting category:', updateError)
    // Không throw, vì vẫn có thể xóa category được
  }

  // Xóa hạng mục
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  throwIfError(error, 'Không thể xoá hạng mục.')

  // Invalidate cache cho cả categories và transactions
  await Promise.all([
    invalidateCategoriesCache(),
    invalidateCache('transactions'),
    invalidateCache('getTransactionStats'),
  ])
}

