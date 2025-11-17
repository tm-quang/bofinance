import React, { useEffect, useState, useRef, useMemo } from 'react'
import { FaTimes, FaChevronRight, FaFolder, FaSearch, FaStar, FaEdit, FaChevronUp } from 'react-icons/fa'
import { fetchCategoriesHierarchical, type CategoryWithChildren } from '../../lib/categoryService'
import { getFavoriteCategories } from '../../lib/favoriteCategoriesService'
import { CategoryIcon } from '../ui/CategoryIcon'
import { CategoryListSkeleton } from '../skeletons'
import { FavoriteCategoriesModal } from './FavoriteCategoriesModal'
import HeaderBar from '../layout/HeaderBar'

type CategoryPickerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (categoryId: string) => void
  selectedCategoryId?: string
  categoryType: 'Chi tiêu' | 'Thu nhập'
  onEditCategory?: (categoryId: string) => void
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCategoryId,
  categoryType,
  // onEditCategory, // Reserved for future use
}) => {
  const [hierarchicalCategories, setHierarchicalCategories] = useState<CategoryWithChildren[]>([])
  const [favoriteCategories, setFavoriteCategories] = useState<CategoryWithChildren[]>([])
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Reset khi mở/đóng modal
  useEffect(() => {
    if (!isOpen) {
      // Reset khi đóng
      setExpandedParents(new Set())
      setSearchTerm('')
    }
  }, [isOpen])

  // Load categories và favorites khi modal mở
  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        setIsLoading(true)
        try {
          const [categories, favoriteIdsArray] = await Promise.all([
            fetchCategoriesHierarchical(categoryType),
            getFavoriteCategories(categoryType),
          ])
          setHierarchicalCategories(categories)

          // Extract favorite categories (limit to 7)
          const favorites: CategoryWithChildren[] = []
          const favoriteIdsSet = new Set(favoriteIdsArray.slice(0, 7))

          // Helper to find category by ID in hierarchical structure
          const findCategoryById = (cats: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
            for (const cat of cats) {
              if (cat.id === id) return cat
              if (cat.children) {
                const found = findCategoryById(cat.children, id)
                if (found) return found
              }
            }
            return null
          }

          // Get favorite categories
          favoriteIdsSet.forEach((id) => {
            const category = findCategoryById(categories, id)
            if (category) {
              favorites.push(category)
            }
          })

          setFavoriteCategories(favorites)
        } catch (error) {
          console.error('Error loading categories:', error)
        } finally {
          setIsLoading(false)
        }
      }
      loadCategories()
    }
  }, [isOpen, categoryType, isFavoriteModalOpen])

  // Không cần đóng khi click ra ngoài vì là full screen

  const toggleParentExpanded = (parentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setExpandedParents((prev) => {
      const newSet = new Set<string>()
      // Nếu đang mở thì đóng, nếu đang đóng thì mở (và đóng các mục khác)
      if (prev.has(parentId)) {
        // Đóng mục này
        return newSet
      } else {
        // Mở mục này (accordion: chỉ mở 1 mục tại một thời điểm)
        newSet.add(parentId)
        return newSet
      }
    })
  }

  const handleCategorySelect = (categoryId: string) => {
    onSelect(categoryId)
    onClose()
  }

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return hierarchicalCategories
    }

    const searchLower = searchTerm.toLowerCase().trim()
    const filtered = hierarchicalCategories
      .map((parent) => {
        const parentMatches = parent.name.toLowerCase().includes(searchLower)
        const matchingChildren = parent.children?.filter((child) =>
          child.name.toLowerCase().includes(searchLower)
        )

        // Nếu parent match hoặc có children match
        if (parentMatches || (matchingChildren && matchingChildren.length > 0)) {
          return {
            ...parent,
            children: parentMatches
              ? parent.children // Nếu parent match, hiển thị tất cả children
              : matchingChildren, // Nếu không, chỉ hiển thị children match
          }
        }
        return null
      })
      .filter((category) => category !== null) as CategoryWithChildren[]
    
    return filtered
  }, [hierarchicalCategories, searchTerm])

  // const handleEditCategory = (categoryId: string, e: React.MouseEvent) => {
  //   e.stopPropagation()
  //   e.preventDefault()
  //   if (onEditCategory) {
  //     onEditCategory(categoryId)
  //   }
  // }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#F7F9FC]">
      {/* Header */}
      <HeaderBar 
        variant="page" 
        title="CHỌN HẠNG MỤC"
        onBack={onClose}
      />

      {/* Content Container with max-width */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col">
          {/* Top Actions Bar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              {categoryType}
            </h3>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="flex items-center gap-1.5 px-3 text-sm font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              <span>Tất cả</span>
              <FaChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="shrink-0 px-4 pb-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm hạng mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                aria-label="Xóa tìm kiếm"
              >
                  <FaTimes className="h-3.5 w-3.5" />
              </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
          {isLoading ? (
            <div className="p-4">
              <CategoryListSkeleton count={12} />
            </div>
          ) : (
            <>
              {/* Favorite Categories Section - Only show when not searching */}
              {!searchTerm && (
                <div className={`px-4 pt-4 pb-4 mb-3 shadow-sm ring-1 rounded-2xl mx-4 mt-2 ${
                  categoryType === 'Chi tiêu' 
                    ? 'bg-gradient-to-br from-rose-50/50 to-pink-50/30 ring-rose-100/50' 
                    : 'bg-gradient-to-br from-emerald-50/50 to-green-50/30 ring-emerald-100/50'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <h4 className={`text-base font-semibold ${
                      categoryType === 'Chi tiêu' ? 'text-rose-900' : 'text-emerald-900'
                    }`}>
                      MỤC HAY DÙNG ({favoriteCategories.length})
                    </h4>
                    <FaChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  {/* Favorite Categories Grid - Include Edit button as 8th item */}
                  <div className="grid grid-cols-4 gap-3">
                    {favoriteCategories.slice(0, 7).map((category) => {
                      const isSelected = selectedCategoryId === category.id
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => handleCategorySelect(category.id)}
                          className={`relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-sky-50 to-blue-50 ring-2 ring-sky-500 shadow-md'
                              : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Star Icon */}
                          <FaStar className="absolute top-1.5 right-1.5 h-3 w-3 text-amber-500 fill-current drop-shadow-sm z-10" />
                          {/* Category Icon */}
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all shadow-sm ${
                              isSelected
                                ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white scale-105'
                                : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'
                            }`}
                          >
                            <CategoryIcon
                              iconId={category.icon_id}
                              className={`h-6 w-6 ${isSelected ? 'text-white' : ''}`}
                              fallback={
                                <span className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                                  {category.name[0]?.toUpperCase() || '?'}
                                </span>
                              }
                            />
                          </div>
                          {/* Category Name */}
                          <span
                            className={`text-xs font-semibold text-center leading-tight line-clamp-2 ${
                              isSelected ? 'text-sky-900' : 'text-slate-700'
                            }`}
                          >
                            {category.name}
                          </span>
                        </button>
                      )
                    })}
                    {/* Edit Button as 8th item */}
                    <button
                      type="button"
                      onClick={() => setIsFavoriteModalOpen(true)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all active:scale-95"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                        <FaEdit className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold text-center text-slate-700 leading-tight">
                        Chỉnh sửa
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* All Categories List */}
              {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 p-5 shadow-sm">
                <FaFolder className="h-10 w-10 text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm ? 'Không tìm thấy hạng mục' : 'Chưa có hạng mục'}
              </h4>
              <p className="text-sm text-slate-500 text-center max-w-xs">
                {searchTerm
                  ? 'Thử tìm kiếm với từ khóa khác'
                  : 'Hãy tạo hạng mục mới để bắt đầu sử dụng'}
              </p>
            </div>
          ) : (
            <div className={`py-3 shadow-sm ring-1 rounded-2xl mx-4 mt-4 ${
              categoryType === 'Chi tiêu'
                ? 'bg-gradient-to-br from-rose-50/30 to-white ring-rose-100/50'
                : 'bg-gradient-to-br from-emerald-50/30 to-white ring-emerald-100/50'
            }`}>
              {filteredCategories.map((parent) => {
                const hasChildren = parent.children && parent.children.length > 0
                const isExpanded = expandedParents.has(parent.id) || searchTerm.length > 0 // Auto-expand when searching
                const isSelected = selectedCategoryId === parent.id

                return (
                  <div key={parent.id} className="mb-0.5 px-4">
                    {/* Parent Category */}
                    <div
                      className={`group flex items-center gap-3 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-sky-50 to-blue-50 ring-2 ring-sky-500 shadow-sm'
                          : 'hover:bg-slate-50 active:bg-slate-100'
                      }`}
                      onClick={() => handleCategorySelect(parent.id)}
                    >
                      {/* Expand/Collapse Button */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleParentExpanded(parent.id, e)
                          }}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                            isExpanded
                              ? 'bg-sky-100 text-sky-600'
                              : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                          }`}
                        >
                          <FaChevronRight
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="w-7" />
                      )}

                      {/* Icon */}
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all shadow-sm ${
                          isSelected
                            ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md scale-105'
                            : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 group-hover:scale-105 group-hover:shadow-md'
                        }`}
                      >
                        <CategoryIcon
                          iconId={parent.icon_id}
                          className={`h-6 w-6 ${isSelected ? 'text-white' : ''}`}
                          fallback={
                            <span className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                              {parent.name[0]?.toUpperCase() || '?'}
                            </span>
                          }
                        />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-base font-semibold ${
                          isSelected ? 'text-sky-900' : 'text-slate-900'
                        }`}>
                          {parent.name}
                        </p>
                        {hasChildren && parent.children && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {parent.children.length} {parent.children.length === 1 ? 'hạng mục con' : 'hạng mục con'}
                          </p>
                        )}
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-md">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Children Categories - Only show if expanded */}
                    {hasChildren && isExpanded && parent.children && parent.children.length > 0 && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-1">
                        {parent.children.map((child, index) => {
                          const isChildSelected = selectedCategoryId === child.id
                          return (
                            <div
                              key={child.id}
                              className={`group flex items-center gap-3 px-4 py-1 rounded-xl transition-all cursor-pointer ${
                                isChildSelected
                                  ? 'bg-gradient-to-r from-sky-50 to-blue-50 ring-2 ring-sky-500 shadow-sm'
                                  : 'hover:bg-slate-50 active:bg-slate-100'
                              }`}
                              onClick={() => handleCategorySelect(child.id)}
                              style={{ animationDelay: `${index * 30}ms` }}
                            >
                              {/* Spacer for alignment */}
                              <div className="w-5" />

                              {/* Icon */}
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all shadow-sm ${
                                  isChildSelected
                                    ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md scale-105'
                                    : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 group-hover:scale-105 group-hover:shadow-md'
                                }`}
                              >
                                <CategoryIcon
                                  iconId={child.icon_id}
                                  className={`h-5 w-5 ${isChildSelected ? 'text-white' : ''}`}
                                  fallback={
                                    <span className={`text-base font-semibold ${
                                      isChildSelected ? 'text-white' : 'text-slate-600'
                                    }`}>
                                      {child.name[0]?.toUpperCase() || '?'}
                                    </span>
                                  }
                                />
                              </div>

                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <p className={`truncate text-sm font-semibold ${
                                  isChildSelected ? 'text-sky-900' : 'text-slate-900'
                                }`}>
                                  {child.name}
                                </p>
                              </div>

                              {/* Selected Indicator */}
                              {isChildSelected && (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-md">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
              )}
            </>
          )}
          </div>
        </div>
      </main>

      {/* Favorite Categories Modal */}
      <FavoriteCategoriesModal
        isOpen={isFavoriteModalOpen}
        onClose={() => setIsFavoriteModalOpen(false)}
        categoryType={categoryType}
      />
    </div>
  )
}

