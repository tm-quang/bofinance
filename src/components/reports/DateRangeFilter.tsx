

type DateRangeType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

type DateRangeFilterProps = {
  rangeType: DateRangeType
  onRangeTypeChange: (type: DateRangeType) => void
  startDate?: string
  endDate?: string
  onStartDateChange?: (date: string) => void
  onEndDateChange?: (date: string) => void
}

const RANGE_OPTIONS: { value: DateRangeType; label: string }[] = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn' },
]

export const DateRangeFilter = ({
  rangeType,
  onRangeTypeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) => {
  return (
    <div className="space-y-3 w-full">
      <div className="grid grid-cols-3 gap-2">
        {RANGE_OPTIONS.map((option) => {
          const isActive = rangeType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onRangeTypeChange(option.value)}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition-all truncate ${isActive
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Custom Date Inputs with Animation */}
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${rangeType === 'custom' ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'
          }`}
      >
        <div className="min-h-0">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-white border border-slate-200 p-3 shadow-sm">
            <div className="relative">
              <span className="absolute left-3 top-2 text-[10px] text-slate-400 font-semibold uppercase">Từ ngày</span>
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => onStartDateChange?.(e.target.value)}
                className="h-12 w-full rounded-lg bg-slate-50 pl-3 pr-3 pt-4 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-sky-100 transition font-medium"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[10px] text-slate-400 font-semibold uppercase">Đến ngày</span>
              <input
                type="date"
                value={endDate || ''}
                onChange={(e) => onEndDateChange?.(e.target.value)}
                className="h-12 w-full rounded-lg bg-slate-50 pl-3 pr-3 pt-4 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-sky-100 transition font-medium"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
