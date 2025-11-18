/**
 * Default Categories - Hardcoded categories for new users
 * These categories will be automatically synced to database when user first visits Categories page
 */

export type DefaultCategoryType = 'Chi tiêu' | 'Thu nhập'

export type DefaultCategory = {
  name: string
  type: DefaultCategoryType
  icon_id: string // UUID of icon in icons table, or empty string if using icon_url
  icon_url?: string | null // URL to PNG/SVG image (required for PNG icons from public/icons_categories)
  parent_id?: string | null
  display_order: number
  children?: DefaultCategory[]
}

// Default Expense Categories (Chi tiêu)
// Sử dụng icon_url để trỏ đến file PNG trong public/icons_categories
export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  // Parent categories
  {
    name: 'Ăn uống',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (1).png',
    parent_id: null,
    display_order: 1,
    children: [
      { name: 'Đi chợ, siêu thị', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (2).png', display_order: 1 },
      { name: 'Ăn tiệm, Nhà hàng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (3).png', display_order: 2 },
      { name: 'Đồ uống', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (4).png', display_order: 3 },
      { name: 'Giao đồ ăn (Delivery)', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (5).png', display_order: 4 },
      { name: 'Tiệc tùng, Bạn bè', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (6).png', display_order: 5 },
      { name: 'Đồ ăn vặt', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (7).png', display_order: 6 },
    ],
  },
  {
    name: 'Nhà cửa & Hóa đơn',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (8).png',
    parent_id: null,
    display_order: 2,
    children: [
      { name: 'Tiền thuê nhà / Trả góp nhà', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (8).png', display_order: 1 },
      { name: 'Hóa đơn Điện', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (9).png', display_order: 2 },
      { name: 'Hóa đơn Nước', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (10).png', display_order: 3 },
      { name: 'Internet, Truyền hình', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (11).png', display_order: 4 },
      { name: 'Gas, Đun nấu', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (12).png', display_order: 5 },
      { name: 'Phí quản lý, Chung cư', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (13).png', display_order: 6 },
      { name: 'Sửa chữa nhà cửa', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (14).png', display_order: 7 },
      { name: 'Giúp việc, Vệ sinh', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (15).png', display_order: 8 },
    ],
  },
  {
    name: 'Di chuyển',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (16).png',
    parent_id: null,
    display_order: 3,
    children: [
      { name: 'Xăng, Dầu', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (16).png', display_order: 1 },
      { name: 'Gửi xe', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (17).png', display_order: 2 },
      { name: 'Taxi, dịch vụ', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (18).png', display_order: 3 },
      { name: 'Vé tàu, Xe, Máy bay', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (19).png', display_order: 4 },
      { name: 'Bảo dưỡng, Sửa chữa xe', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (20).png', display_order: 5 },
      { name: 'Phí cầu đường, Lệ phí', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (21).png', display_order: 6 },
      { name: 'Thuê xe', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (22).png', display_order: 7 },
    ],
  },
  {
    name: 'Sức khỏe',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (23).png',
    parent_id: null,
    display_order: 4,
    children: [
      { name: 'Thuốc men', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (23).png', display_order: 1 },
      { name: 'Khám bệnh', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (24).png', display_order: 2 },
      { name: 'Bảo hiểm y tế', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (25).png', display_order: 3 },
      { name: 'Chăm sóc cá nhân', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (26).png', display_order: 4 },
      { name: 'Thực phẩm chức năng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (27).png', display_order: 5 },
    ],
  },
  {
    name: 'Phát triển Bản thân',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (28).png',
    parent_id: null,
    display_order: 5,
    children: [
      { name: 'Học phí, Khóa học', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (28).png', display_order: 1 },
      { name: 'Sách, Tài liệu', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (29).png', display_order: 2 },
      { name: 'Phần mềm, Ứng dụng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (30).png', display_order: 4 },
      { name: 'Văn phòng phẩm', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (31).png', display_order: 5 },
    ],
  },
  {
    name: 'Gia đình & Con cái',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (1).png', // Reuse icon if needed
    parent_id: null,
    display_order: 6,
    children: [
      { name: 'Tả, sữa', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (2).png', display_order: 1 },
      { name: 'Tiêu vặt cho con', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (3).png', display_order: 2 },
      { name: 'Học phí con', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (4).png', display_order: 3 },
      { name: 'Quần áo, Đồ dùng con', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (5).png', display_order: 4 },
    ],
  },
  {
    name: 'Hiếu hỉ & Quan hệ',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (6).png',
    parent_id: null,
    display_order: 7,
    children: [
      { name: 'Quà tặng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (6).png', display_order: 1 },
      { name: 'Tiệc cưới, Sinh nhật', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (7).png', display_order: 2 },
      { name: 'Từ thiện', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (8).png', display_order: 3 },
    ],
  },
  {
    name: 'Hưởng thụ & Giải trí',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (9).png',
    parent_id: null,
    display_order: 8,
    children: [
      { name: 'Xem phim, Nhạc', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (9).png', display_order: 1 },
      { name: 'Du lịch', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (10).png', display_order: 2 },
      { name: 'Thiết bị điện tử, Công nghệ', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (11).png', display_order: 3 },
    ],
  },
  {
    name: 'Mua sắm',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (12).png',
    parent_id: null,
    display_order: 9,
    children: [
      { name: 'Quần áo, Giày dép', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (12).png', display_order: 1 },
      { name: 'Mỹ phẩm, Làm đẹp', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (13).png', display_order: 2 },
      { name: 'Đồ gia dụng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (14).png', display_order: 3 },
    ],
  },
  {
    name: 'Chi phí Tài chính',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (15).png',
    parent_id: null,
    display_order: 10,
    children: [
      { name: 'Phí ngân hàng', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (15).png', display_order: 1 },
      { name: 'Bảo hiểm', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (16).png', display_order: 2 },
      { name: 'Thuế', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (17).png', display_order: 3 },
    ],
  },
  {
    name: 'Tiền ra',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (18).png',
    parent_id: null,
    display_order: 11,
  },
  {
    name: 'Trả nợ',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (19).png',
    parent_id: null,
    display_order: 12,
  },
  {
    name: 'Chi phí Linh tinh',
    type: 'Chi tiêu',
    icon_id: '',
    icon_url: '/icons_categories/icon (20).png',
    parent_id: null,
    display_order: 99,
    children: [
      { name: 'Tiêu vặt', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (20).png', display_order: 1 },
      { name: 'Mất tiền, Bị phạt', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (21).png', display_order: 2 },
      { name: 'Chi phí khác (Không thể phân loại)', type: 'Chi tiêu', icon_id: '', icon_url: '/icons_categories/icon (22).png', display_order: 3 },
    ],
  },
]

// Default Income Categories (Thu nhập)
// Sử dụng icon_url để trỏ đến file PNG trong public/icons_categories
export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Lương',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (23).png',
    parent_id: null,
    display_order: 1,
  },
  {
    name: 'Thưởng',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (24).png',
    parent_id: null,
    display_order: 2,
  },
  {
    name: 'Tiền lãi',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (25).png',
    parent_id: null,
    display_order: 3,
  },
  {
    name: 'Lãi tiết kiệm',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (26).png',
    parent_id: null,
    display_order: 4,
  },
  {
    name: 'Đi vay',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (27).png',
    parent_id: null,
    display_order: 5,
  },
  {
    name: 'Thu nợ',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (28).png',
    parent_id: null,
    display_order: 6,
  },
  {
    name: 'Được cho/tặng',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (29).png',
    parent_id: null,
    display_order: 7,
  },
  {
    name: 'Tiền vào',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (30).png',
    parent_id: null,
    display_order: 8,
  },
  {
    name: 'Khác',
    type: 'Thu nhập',
    icon_id: '',
    icon_url: '/icons_categories/icon (31).png',
    parent_id: null,
    display_order: 99,
  },
]

// Helper function to get all default categories (flat list)
export const getAllDefaultCategories = (): DefaultCategory[] => {
  const all: DefaultCategory[] = []
  
  const processCategory = (cat: DefaultCategory, parentId: string | null = null) => {
    const categoryWithoutChildren = { ...cat }
    delete categoryWithoutChildren.children
    all.push({ ...categoryWithoutChildren, parent_id: parentId })
    
    if (cat.children) {
      cat.children.forEach((child) => {
        processCategory(child, cat.name) // Use name as temporary ID
      })
    }
  }
  
  DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => processCategory(cat))
  DEFAULT_INCOME_CATEGORIES.forEach((cat) => processCategory(cat))
  
  return all
}

// Helper function to sync default categories to database
export const syncDefaultCategoriesToDatabase = async (
  createCategoryFn: (payload: {
    name: string
    type: DefaultCategoryType
    icon_id: string
    icon_url?: string | null
    parent_id?: string | null
    display_order: number
  }) => Promise<{ id: string }>
): Promise<void> => {
  const parentIdMap = new Map<string, string>()
  
  // Sync expense categories
  for (const parent of DEFAULT_EXPENSE_CATEGORIES) {
    const parentResult = await createCategoryFn({
      name: parent.name,
      type: parent.type,
      icon_id: parent.icon_id,
      icon_url: parent.icon_url || null,
      parent_id: null,
      display_order: parent.display_order,
    })
    parentIdMap.set(parent.name, parentResult.id)
    
    if (parent.children) {
      for (const child of parent.children) {
        await createCategoryFn({
          name: child.name,
          type: child.type,
          icon_id: child.icon_id,
          icon_url: child.icon_url || null,
          parent_id: parentResult.id,
          display_order: child.display_order,
        })
      }
    }
  }
  
  // Sync income categories
  for (const parent of DEFAULT_INCOME_CATEGORIES) {
    await createCategoryFn({
      name: parent.name,
      type: parent.type,
      icon_id: parent.icon_id,
      icon_url: parent.icon_url || null,
      parent_id: null,
      display_order: parent.display_order,
    })
  }
}

