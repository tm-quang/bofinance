import { FaTimes, FaFolder } from 'react-icons/fa'
import type { CategoryRecord } from '../../lib/categoryService'
import { CategoryIcon } from '../ui/CategoryIcon'

type CategoryFilterProps = {
  categories: CategoryRecord[]
  selectedCategoryIds: string[]
  onCategoryToggle: (categoryId: string) => void
  onClearAll: () => void
  type?: 'Thu' | 'Chi' | 'all'
}

export const CategoryFilter = ({
  categories,
  selectedCategoryIds,
  onCategoryToggle,
  onClearAll,
  type = 'all',
}: CategoryFilterProps) => {
  const filteredCategories = categories.filter((cat) => {
    if (type === 'all') return true
    return type === 'Thu' ? cat.type === 'Thu nhập' : cat.type === 'Chi tiêu'
  })

  if (filteredCategories.length === 0) {
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
      <div className="flex flex-wrap gap-2">
        {filteredCategories.map((category) => {
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
              }`}
            >
              <CategoryIcon iconId={category.icon_id} className="h-4 w-4" />
              <span>{category.name}</span>
              {isSelected && <FaTimes className="h-3.5 w-3.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

