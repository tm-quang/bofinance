import { useState } from 'react'
import { FaTimes, FaFolder, FaChevronDown, FaChevronRight } from 'react-icons/fa'
import type { CategoryRecord, CategoryWithChildren } from '../../lib/categoryService'
import { CategoryIcon } from '../ui/CategoryIcon'

type CategoryFilterProps = {
  categories: CategoryRecord[]
  parentCategories?: CategoryWithChildren[]
  selectedCategoryIds: string[]
  onCategoryToggle: (categoryId: string) => void
  onClearAll: () => void
  type?: 'Thu' | 'Chi' | 'all'
}

export const CategoryFilter = ({
  categories,
  parentCategories,
  selectedCategoryIds,
  onCategoryToggle,
  onClearAll,
  type = 'all',
}: CategoryFilterProps) => {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  // Sử dụng parentCategories nếu có, nếu không thì fallback về categories phẳng
  const useHierarchical = parentCategories && parentCategories.length > 0

  const filteredParentCategories = useHierarchical
    ? parentCategories
        .filter((cat) => {
          if (type === 'all') return true
          return type === 'Thu' ? cat.type === 'Thu nhập' : cat.type === 'Chi tiêu'
        })
        .map((parent) => {
          // Lọc children theo type nếu cần
          if (type === 'all' || !parent.children) return parent
          const filteredChildren = parent.children.filter((child) => {
            return type === 'Thu' ? child.type === 'Thu nhập' : child.type === 'Chi tiêu'
          })
          return { ...parent, children: filteredChildren }
        })
    : []

  const filteredCategories = !useHierarchical
    ? categories.filter((cat) => {
        if (type === 'all') return true
        return type === 'Thu' ? cat.type === 'Thu nhập' : cat.type === 'Chi tiêu'
      })
    : []

  const toggleParent = (parentId: string) => {
    setExpandedParents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(parentId)) {
        newSet.delete(parentId)
      } else {
        newSet.add(parentId)
      }
      return newSet
    })
  }

  const renderCategoryButton = (category: CategoryRecord, isChild = false) => {
    const isSelected = selectedCategoryIds.includes(category.id)

    return (
      <button
        key={category.id}
        type="button"
        onClick={() => onCategoryToggle(category.id)}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition sm:px-4 sm:py-2.5 sm:text-sm ${
          isSelected
            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
            : 'bg-white text-slate-700 border border-slate-200 hover:border-sky-300 hover:bg-sky-50'
        } ${isChild ? 'ml-6' : ''}`}
      >
        <CategoryIcon iconId={category.icon_id} iconUrl={category.icon_url} className="h-4 w-4" />
        <span>{category.name}</span>
        {isSelected && <FaTimes className="h-3.5 w-3.5" />}
      </button>
    )
  }

  if (useHierarchical && filteredParentCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-6 text-center">
        <div className="mb-3 rounded-full bg-white p-3">
          <FaFolder className="h-5 w-5 text-slate-400" />
        </div>
        <span className="text-sm text-slate-500">
          Chưa có hạng mục {type !== 'all' ? (type === 'Thu' ? 'thu nhập' : 'chi tiêu') : ''}
        </span>
      </div>
    )
  }

  if (!useHierarchical && filteredCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-6 text-center">
        <div className="mb-3 rounded-full bg-white p-3">
          <FaFolder className="h-5 w-5 text-slate-400" />
        </div>
        <span className="text-sm text-slate-500">
          Chưa có hạng mục {type !== 'all' ? (type === 'Thu' ? 'thu nhập' : 'chi tiêu') : ''}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {selectedCategoryIds.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 sm:text-sm">
            Đã chọn: {selectedCategoryIds.length} hạng mục
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 sm:text-sm"
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {useHierarchical ? (
        <div className="space-y-2">
          {filteredParentCategories.map((parent) => {
            const hasChildren = parent.children && parent.children.length > 0
            const isExpanded = expandedParents.has(parent.id)
            const isParentSelected = selectedCategoryIds.includes(parent.id)
            const hasSelectedChildren = parent.children?.some((child) => selectedCategoryIds.includes(child.id))

            return (
              <div key={parent.id} className="space-y-2">
                {/* Parent Category */}
                <div className="flex items-center gap-2">
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => toggleParent(parent.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                    >
                      {isExpanded ? (
                        <FaChevronDown className="h-3 w-3" />
                      ) : (
                        <FaChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  {!hasChildren && <div className="w-6" />}
                  {renderCategoryButton(parent, false)}
                </div>

                {/* Children Categories */}
                {hasChildren && isExpanded && (
                  <div className="flex flex-wrap gap-2 ml-8">
                    {parent.children!.map((child) => renderCategoryButton(child, true))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filteredCategories.map((category) => renderCategoryButton(category, false))}
        </div>
      )}
    </div>
  )
}

