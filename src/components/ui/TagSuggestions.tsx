import { RiCloseLine } from 'react-icons/ri'

type TagSuggestionsProps = {
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  suggestions?: string[]
}

const DEFAULT_SUGGESTIONS = [
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
    <div className="mt-2 space-y-2">
      <p className="text-xs font-medium text-slate-500">Gợi ý:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onTagToggle(tag)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-sky-100 text-sky-700 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tag}</span>
              {isSelected && <RiCloseLine className="h-3 w-3" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

