import React, { useEffect, useState, useRef } from 'react'
import { FaTimes, FaChevronRight, FaFolder } from 'react-icons/fa'
import { fetchCategoriesHierarchical, type CategoryWithChildren } from '../../lib/categoryService'
import { CategoryIcon } from '../ui/CategoryIcon'

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
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Load categories khi modal mở
  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        setIsLoading(true)
        try {
          const categories = await fetchCategoriesHierarchical(categoryType)
          setHierarchicalCategories(categories)
        } catch (error) {
          console.error('Error loading categories:', error)
        } finally {
          setIsLoading(false)
        }
      }
      loadCategories()
    } else {
      // Reset khi đóng modal
      setExpandedParents(new Set())
    }
  }, [isOpen, categoryType])

  // Đóng modal khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

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

  // const handleEditCategory = (categoryId: string, e: React.MouseEvent) => {
  //   e.stopPropagation()
  //   e.preventDefault()
  //   if (onEditCategory) {
  //     onEditCategory(categoryId)
  //   }
  // }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-x-4 top-1/2 z-50 max-h-[80vh] -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-lg font-bold text-slate-900">
            Chọn hạng mục {categoryType === 'Chi tiêu' ? 'chi tiêu' : 'thu nhập'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="max-h-[calc(80vh-60px)] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm text-slate-500">Đang tải hạng mục...</span>
            </div>
          ) : hierarchicalCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 rounded-full bg-slate-100 p-3">
                <FaFolder className="h-6 w-6 text-slate-400" />
              </div>
              <span className="text-sm text-slate-500">Chưa có hạng mục</span>
            </div>
          ) : (
            <div className="py-2">
              {hierarchicalCategories.map((parent) => {
                const hasChildren = parent.children && parent.children.length > 0
                const isExpanded = expandedParents.has(parent.id)
                const isSelected = selectedCategoryId === parent.id

                return (
                  <div key={parent.id}>
                    {/* Parent Category */}
                    <div
                      className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
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
                          className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
                        >
                          <FaChevronRight
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      ) : (
                        <div className="w-6" />
                      )}

                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700">
                        <CategoryIcon
                          iconId={parent.icon_id}
                          className="h-6 w-6"
                          fallback={
                            <span className="text-lg font-semibold text-slate-600">
                              {parent.name[0]?.toUpperCase() || '?'}
                            </span>
                          }
                        />
                      </div>

                      {/* Name */}
                      <div className="flex-1 text-left">
                        <p className="truncate text-sm font-medium text-slate-900">{parent.name}</p>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="h-2 w-2 shrink-0 rounded-full bg-sky-600" />
                      )}
                    </div>

                    {/* Children Categories - Only show if expanded */}
                    {hasChildren && isExpanded && (
                      <div className="bg-slate-50/50">
                        {parent.children?.map((child) => {
                          const isChildSelected = selectedCategoryId === child.id
                          return (
                            <div
                              key={child.id}
                              className={`flex items-center gap-3 px-4 py-3 pl-12 transition-colors cursor-pointer ${
                                isChildSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                              }`}
                              onClick={() => handleCategorySelect(child.id)}
                            >
                              {/* Spacer for alignment */}
                              <div className="w-6" />

                              {/* Icon */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700">
                                <CategoryIcon
                                  iconId={child.icon_id}
                                  className="h-6 w-6"
                                  fallback={
                                    <span className="text-lg font-semibold text-slate-600">
                                      {child.name[0]?.toUpperCase() || '?'}
                                    </span>
                                  }
                                />
                              </div>

                              {/* Name */}
                              <div className="flex-1 text-left">
                                <p className="truncate text-sm font-medium text-slate-900">{child.name}</p>
                              </div>

                              {/* Selected Indicator */}
                              {isChildSelected && (
                                <div className="h-2 w-2 shrink-0 rounded-full bg-sky-600" />
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
        </div>
      </div>
    </>
  )
}

