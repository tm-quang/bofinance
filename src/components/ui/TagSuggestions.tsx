import { FaTimes } from 'react-icons/fa'

type TagSuggestionsProps = {
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  suggestions?: string[]
}

const DEFAULT_SUGGESTIONS = [
  'sinh hoạt',
  'tiền nhà',
  'ăn uống',
  'cuối tuần',
  'mua sắm',
  'giải trí',
  'y tế',
  'giao thông',
  'hóa đơn',
  'học tập',
  'du lịch',
  'quà tặng',
  'tiết kiệm',
  'đầu tư',
]

export const TagSuggestions = ({
  selectedTags,
  onTagToggle,
  suggestions = DEFAULT_SUGGESTIONS,
}: TagSuggestionsProps) => {
  if (suggestions.length === 0) return null

  return (
    <div className="mt-2.5 space-y-2">
      <p className="text-xs font-semibold text-slate-600">Gợi ý:</p>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto overscroll-contain pr-1">
        {suggestions.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onTagToggle(tag)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-gradient-to-r from-sky-100 to-blue-100 text-sky-700 border border-sky-200 shadow-sm hover:from-sky-200 hover:to-blue-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{tag}</span>
              {isSelected && <FaTimes className="h-3 w-3 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

