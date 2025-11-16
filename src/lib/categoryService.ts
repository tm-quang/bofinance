import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { cacheFirstWithRefresh, cacheManager, invalidateCache } from './cache'
import { getCachedUser } from './userCache'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/defaultCategories'

export type CategoryType = 'Chi tiêu' | 'Thu nhập'

export type CategoryRecord = {
  id: string
  name: string
  type: CategoryType
  icon_id: string
  icon_url?: string | null // URL to PNG/SVG image (optional, for custom icons)
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
  icon_url?: string | null // URL to PNG/SVG image (optional, for custom icons)
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
 * Cần invalidate tất cả các pattern có thể có (với params khác nhau)
 */
const invalidateCategoriesCache = async (): Promise<void> => {
  // Invalidate cache cho categories
  await invalidateCache('categories')
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
 * Đồng bộ hạng mục từ bảng default_categories cho user mới (chỉ 1 lần duy nhất)
 * - Chỉ sync khi user CHƯA CÓ categories nào cả (length === 0)
 * - Không sync lại nếu user đã có categories (kể cả khi xóa một số)
 * - Sử dụng dữ liệu từ bảng default_categories (database) - quản lý qua AdminCategoriesIcon
 * - Fallback về file defaultCategories.ts nếu database trống
 */
export const syncCategoriesFromDefault = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để đồng bộ hạng mục mặc định.')
  }

  // Kiểm tra xem user đã có hạng mục chưa
  const { data: existingCategories } = await supabase
    .from(TABLE_NAME)
    .select('id, name, type, parent_id, is_default')
    .eq('user_id', user.id)

  // QUAN TRỌNG: Chỉ sync khi user CHƯA CÓ categories nào cả
  // Nếu user đã có categories (dù chỉ 1), không sync lại
  if (existingCategories && existingCategories.length > 0) {
    // User đã có categories, không sync lại
    return
  }

  // User chưa có categories, tiến hành sync từ default_categories
  // Đọc lại categories một lần nữa để đảm bảo không có race condition
  const { data: doubleCheckCategories } = await supabase
    .from(TABLE_NAME)
    .select('id, name, type, parent_id')
    .eq('user_id', user.id)

  // Double check: Nếu đã có categories (có thể do race condition), không sync
  if (doubleCheckCategories && doubleCheckCategories.length > 0) {
    console.log('User đã có categories, bỏ qua sync (có thể do race condition)')
    return
  }

  // Tạo map để check duplicate: key = `${name}_${type}_${parent_id || 'null'}`
  const existingCategoryMap = new Map<string, string>()
  if (doubleCheckCategories) {
    doubleCheckCategories.forEach(cat => {
      const key = `${cat.name}_${cat.type}_${cat.parent_id || 'null'}`
      existingCategoryMap.set(key, cat.id)
    })
  }

  // Đọc từ bảng default_categories (database) - source of truth
  // Fallback về file defaultCategories.ts nếu database trống
  let defaultCategories: Array<{
    id?: string
    name: string
    type: CategoryType
    icon_id: string
    icon_url?: string | null
    parent_id?: string | null
    display_order: number
    children?: Array<{
      name: string
      type: CategoryType
      icon_id: string
      icon_url?: string | null
      display_order: number
    }>
  }> = []

  try {
    // Thử đọc từ database trước
    const { fetchDefaultCategoriesHierarchical } = await import('./defaultCategoryService')
    const dbCategories = await fetchDefaultCategoriesHierarchical()
    
    if (dbCategories && dbCategories.length > 0) {
      // Có dữ liệu trong database, sử dụng
      defaultCategories = dbCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon_id: cat.icon_id,
        icon_url: cat.icon_url || null,
        parent_id: cat.parent_id,
        display_order: cat.display_order,
        children: cat.children?.map(child => ({
          name: child.name,
          type: child.type,
          icon_id: child.icon_id,
          icon_url: child.icon_url || null,
          display_order: child.display_order,
        }))
      }))
    } else {
      // Database trống, fallback về file hardcode
      console.warn('Database default_categories trống, sử dụng file hardcode làm fallback')
      const allDefaultCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]
      defaultCategories = allDefaultCategories.map(cat => ({
        name: cat.name,
        type: cat.type,
        icon_id: cat.icon_id,
        icon_url: cat.icon_url || null,
        parent_id: cat.parent_id,
        display_order: cat.display_order,
        children: cat.children?.map(child => ({
          name: child.name,
          type: child.type,
          icon_id: child.icon_id,
          icon_url: child.icon_url || null,
          display_order: child.display_order,
        }))
      }))
    }
  } catch (error) {
    // Lỗi khi đọc database, fallback về file hardcode
    console.warn('Lỗi khi đọc default_categories từ database, sử dụng file hardcode:', error)
    const allDefaultCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]
    defaultCategories = allDefaultCategories.map(cat => ({
      name: cat.name,
      type: cat.type,
      icon_id: cat.icon_id,
      icon_url: cat.icon_url || null,
      parent_id: cat.parent_id,
      display_order: cat.display_order,
      children: cat.children?.map(child => ({
        name: child.name,
        type: child.type,
        icon_id: child.icon_id,
        icon_url: child.icon_url || null,
        display_order: child.display_order,
      }))
    }))
  }
  
  if (!defaultCategories || defaultCategories.length === 0) {
    throw new Error('Hệ thống chưa có hạng mục mặc định.')
  }

  // Có default categories, tiến hành sync
  try {
    // Lấy tất cả parent categories (không có parent_id)
    const parentCategories = defaultCategories.filter(cat => !cat.parent_id)
    
    // Filter out duplicates: chỉ insert những category chưa tồn tại
    // Check lại database một lần nữa trước khi insert để tránh duplicate
    const parentInserts = parentCategories
      .filter(cat => {
        const key = `${cat.name}_${cat.type}_null`
        return !existingCategoryMap.has(key)
      })
      .map(cat => ({
        user_id: user.id,
        name: cat.name,
        type: cat.type,
        icon_id: cat.icon_id,
        icon_url: cat.icon_url || null, // Support icon_url from defaultCategories.ts
        parent_id: null,
        is_default: true,
        display_order: cat.display_order,
      }))

    let insertedParents: any[] = []
    
    // Chỉ insert nếu có categories mới
    if (parentInserts.length > 0) {
      // Final check: Query lại database một lần nữa trước khi insert để tránh duplicate
      const { data: finalCheck } = await supabase
        .from(TABLE_NAME)
        .select('id, name, type, parent_id')
        .eq('user_id', user.id)
        .is('parent_id', null)
      
      if (finalCheck && finalCheck.length > 0) {
        // Đã có categories, không insert nữa
        console.log('Categories đã tồn tại, bỏ qua insert (race condition)')
        finalCheck.forEach(cat => {
          const key = `${cat.name}_${cat.type}_null`
          existingCategoryMap.set(key, cat.id)
        })
      } else {
        // Chưa có categories, tiến hành insert
        const { data: inserted, error: parentError } = await supabase
        .from(TABLE_NAME)
        .insert(parentInserts)
        .select()

      if (parentError) {
          // Nếu lỗi duplicate (có thể do race condition), check lại
          if (parentError.code === '23505' || parentError.message?.includes('duplicate')) {
            console.warn('Duplicate category detected, reloading existing categories')
            const { data: reloaded } = await supabase
              .from(TABLE_NAME)
              .select('id, name, type, parent_id')
              .eq('user_id', user.id)
              .is('parent_id', null)
            
            if (reloaded) {
              reloaded.forEach(cat => {
                const key = `${cat.name}_${cat.type}_null`
                existingCategoryMap.set(key, cat.id)
              })
            }
          } else {
        throw parentError
      }
        } else {
          insertedParents = inserted || []
          
          // Update map với các categories vừa insert
          insertedParents.forEach((inserted) => {
            const key = `${inserted.name}_${inserted.type}_null`
            existingCategoryMap.set(key, inserted.id)
          })
        }
      }
    }

    // Nếu không insert được (do duplicate), load lại từ database
    if (insertedParents.length === 0 && parentInserts.length > 0) {
      const { data: reloaded } = await supabase
        .from(TABLE_NAME)
        .select('id, name, type, parent_id')
        .eq('user_id', user.id)
        .is('parent_id', null)
      
      if (reloaded) {
        reloaded.forEach(cat => {
          const key = `${cat.name}_${cat.type}_null`
          existingCategoryMap.set(key, cat.id)
        })
        insertedParents = reloaded.map(cat => ({ id: cat.id, name: cat.name, type: cat.type }))
      }
    }

    // Tạo map để lưu mapping giữa default category name và category_id mới
    // Key: `${name}_${type}`, Value: category_id
    const nameToCategoryMap = new Map<string, string>()
    insertedParents.forEach(parent => {
      const key = `${parent.name}_${parent.type}`
      nameToCategoryMap.set(key, parent.id)
    })

    // Thu thập tất cả children và insert batch (chỉ những cái chưa tồn tại)
    const childInserts: Array<{
      user_id: string
      name: string
      type: CategoryType
      icon_id: string
      icon_url?: string | null
      parent_id: string
      is_default: boolean
      display_order: number
    }> = []

    // Duyệt qua tất cả parent categories và insert children
    parentCategories.forEach((parentCat) => {
      const parentCategoryId = nameToCategoryMap.get(`${parentCat.name}_${parentCat.type}`)
      if (parentCategoryId && parentCat.children && parentCat.children.length > 0) {
        parentCat.children.forEach(childCat => {
          const key = `${childCat.name}_${childCat.type}_${parentCategoryId}`
          // Chỉ thêm vào insert list nếu chưa tồn tại
          if (!existingCategoryMap.has(key)) {
            childInserts.push({
              user_id: user.id,
              name: childCat.name,
              type: childCat.type,
              icon_id: childCat.icon_id,
              icon_url: childCat.icon_url || null, // Support icon_url from defaultCategories.ts
              parent_id: parentCategoryId,
              is_default: true,
              display_order: childCat.display_order,
            })
          }
        })
      }
    })

      // Insert batch tất cả children cùng lúc (chỉ những cái chưa tồn tại)
      if (childInserts.length > 0) {
        const { data: insertedChildren, error: childError } = await supabase
          .from(TABLE_NAME)
          .insert(childInserts)
          .select()

        if (childError) {
          console.error('Error inserting child categories:', childError)
          // Không throw, vì parent đã insert thành công
        } else if (insertedChildren) {
          // Update map với các children vừa insert
          insertedChildren.forEach(child => {
            const key = `${child.name}_${child.type}_${child.parent_id}`
            existingCategoryMap.set(key, child.id)
          })
        }
      }
    
    // Invalidate cache sau khi sync thành công
    await invalidateCategoriesCache()
  } catch (error) {
    // Nếu lỗi khi sync, throw error để caller biết
    console.error('Lỗi khi đồng bộ hạng mục mặc định:', error)
    throw error
  }
}

/**
 * Khởi tạo hạng mục mặc định cho user mới từ file defaultCategories.ts
 * Chỉ sync 1 lần duy nhất khi user chưa có categories nào cả
 * Sử dụng dữ liệu hardcoded từ file defaultCategories.ts
 */
export const initializeDefaultCategories = async (): Promise<void> => {
  return syncCategoriesFromDefault()
}

export const deleteCategory = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xoá hạng mục.')
  }

  console.log('Attempting to delete category:', { id, userId: user.id })

  // Kiểm tra xem category có tồn tại và thuộc về user không
  // Sử dụng maybeSingle() thay vì single() để tránh throw error khi không tìm thấy
  const { data: category, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, name, is_default, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('Category fetch result:', { category, fetchError, errorCode: fetchError?.code })

  // Nếu có lỗi (không phải lỗi "not found"), throw error
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching category:', fetchError)
    throw new Error('Không thể kiểm tra hạng mục. Vui lòng thử lại sau.')
  }

  // Nếu không tìm thấy category, thử query không filter user_id để xem category có tồn tại không
  if (!category) {
    const { data: categoryWithoutUserFilter } = await supabase
      .from(TABLE_NAME)
      .select('id, name, user_id')
      .eq('id', id)
      .maybeSingle()
    
    console.log('Category without user filter:', categoryWithoutUserFilter)
    
    if (categoryWithoutUserFilter) {
      throw new Error('Bạn không có quyền xóa hạng mục này. Hạng mục không thuộc về tài khoản của bạn.')
    }
    
    throw new Error('Không tìm thấy hạng mục cần xóa hoặc đã bị xóa trước đó.')
  }

  console.log('Deleting category:', { id, name: category.name, is_default: category.is_default, user_id: category.user_id })

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

  // Xóa hạng mục (cho phép xóa cả hạng mục mặc định - user có toàn quyền với categories của họ)
  console.log('Attempting to delete category from database...')
  const { data: deletedData, error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select()

  console.log('Delete result:', { deletedData, error, errorCode: error?.code, errorMessage: error?.message })

  if (error) {
    console.error('Error deleting category:', error)
    // Kiểm tra xem có phải lỗi RLS không
    if (error.message?.includes('policy') || error.message?.includes('permission') || error.message?.includes('row-level')) {
      throw new Error('Bạn không có quyền xóa hạng mục này. Có thể do chính sách bảo mật của hệ thống.')
    }
    // Kiểm tra xem có phải lỗi "not found" không
    if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
      throw new Error('Không tìm thấy hạng mục cần xóa hoặc đã bị xóa trước đó.')
    }
    throw new Error(error.message || 'Không thể xoá hạng mục.')
  }

  if (!deletedData || deletedData.length === 0) {
    // Thử query lại để xem category có còn tồn tại không
    const { data: checkCategory } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('id', id)
      .maybeSingle()
    
    if (!checkCategory) {
      // Category đã bị xóa (có thể do race condition hoặc đã xóa trước đó)
      console.log('Category already deleted, invalidating cache...')
      await invalidateCategoriesCache()
      return // Không throw error, vì category đã được xóa
    }
    
    throw new Error('Không thể xóa hạng mục. Có thể do bạn không có quyền hoặc hạng mục đã bị thay đổi.')
  }

  console.log('Category deleted successfully:', deletedData)

  // Invalidate cache cho cả categories và transactions
  await Promise.all([
    invalidateCategoriesCache(),
    invalidateCache('transactions'),
    invalidateCache('getTransactionStats'),
  ])
}

