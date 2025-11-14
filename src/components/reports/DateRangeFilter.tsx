import { FaCalendar } from 'react-icons/fa'

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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((option) => {
          const isActive = rangeType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onRangeTypeChange(option.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300 hover:bg-sky-50'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {rangeType === 'custom' && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-white border border-slate-200 p-3">
          <div className="relative">
            <FaCalendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange?.(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:text-sm"
              placeholder="Từ ngày"
            />
          </div>
          <div className="relative">
            <FaCalendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange?.(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:text-sm"
              placeholder="Đến ngày"
            />
          </div>
        </div>
      )}
    </div>
  )
}

