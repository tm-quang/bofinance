import { useEffect, useMemo, useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaCalendar } from 'react-icons/fa'
import { fetchTransactions, type TransactionRecord } from '../../lib/transactionService'
import { fetchCategories, type CategoryRecord } from '../../lib/categoryService'
import { 
  getUserPreferences, 
  updateChartPreferences,
  type ChartPeriodType 
} from '../../lib/userPreferencesService'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { LoadingRing } from '../ui/LoadingRing'
import { DonutChart } from './DonutChart'

type TransactionChartProps = {
  date?: string // YYYY-MM-DD format, defaults to today
  walletId?: string // Filter by wallet
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

// Format date to YYYY-MM-DD (avoid timezone issues)
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get start of week (Monday)
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(d.setDate(diff))
}

// Get end of week (Sunday)
const getEndOfWeek = (date: Date): Date => {
  const start = getStartOfWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

// Get start of month
const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Get end of month
const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export const TransactionChart = ({ walletId }: TransactionChartProps) => {
  const [selectedType, setSelectedType] = useState<'Thu' | 'Chi'>('Chi')
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Load saved preferences from database
  const [periodType, setPeriodType] = useState<ChartPeriodType>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showSettings, setShowSettings] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [pendingPeriodType, setPendingPeriodType] = useState<ChartPeriodType | null>(null)

  // Load preferences from database on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getUserPreferences()
        if (preferences) {
          setPeriodType(preferences.chart_period_type)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
        // Fallback to defaults on error
      }
    }
    loadPreferences()
  }, [])

  // Handle period type change - show confirm dialog when changing in settings
  const handlePeriodTypeChange = (newPeriodType: ChartPeriodType) => {
    if (showSettings) {
      // In settings modal, ask for confirmation
      setPendingPeriodType(newPeriodType)
      setShowSaveConfirm(true)
    } else {
      // Outside settings, change immediately
      setPeriodType(newPeriodType)
      if (newPeriodType === 'day') {
        setSelectedDate(new Date())
      }
    }
  }

  // Save preferences when confirmed
  const handleSavePreferences = async () => {
    if (!pendingPeriodType) return
    
    try {
      await updateChartPreferences(pendingPeriodType, true)
      setPeriodType(pendingPeriodType)
      if (pendingPeriodType === 'day') {
        setSelectedDate(new Date())
      }
      setShowSaveConfirm(false)
      setPendingPeriodType(null)
      setShowSettings(false)
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  // Calculate date range based on period type and selected date
  const dateRange = useMemo(() => {
    const baseDate = selectedDate
    let startDate: Date
    let endDate: Date

    if (periodType === 'day') {
      startDate = new Date(baseDate)
      endDate = new Date(baseDate)
    } else if (periodType === 'week') {
      startDate = getStartOfWeek(baseDate)
      endDate = getEndOfWeek(baseDate)
    } else {
      // month
      startDate = getStartOfMonth(baseDate)
      endDate = getEndOfMonth(baseDate)
    }

    return {
      start: formatDateToString(startDate),
      end: formatDateToString(endDate),
      startDate,
      endDate,
    }
  }, [periodType, selectedDate])

  // Update selectedDate when periodType changes to day
  useEffect(() => {
    if (periodType === 'day') {
      setSelectedDate(new Date())
    }
  }, [periodType])

  // Format date range for display
  const formatDateRange = (start: Date, end: Date): string => {
    if (periodType === 'day') {
      const day = String(start.getDate()).padStart(2, '0')
      const month = String(start.getMonth() + 1).padStart(2, '0')
      const year = start.getFullYear()
      return `${day}/${month}/${year}`
    } else if (periodType === 'week') {
      // Format: "Ngày 10-16/11/2025"
      const startDay = start.getDate()
      const endDay = end.getDate()
      const month = String(start.getMonth() + 1).padStart(2, '0')
      const year = start.getFullYear()
      return `Ngày ${startDay}-${endDay}/${month}/${year}`
    } else {
      // month - Format: "01/11-30/11/2025"
      const startDay = String(start.getDate()).padStart(2, '0')
      const endDay = String(end.getDate()).padStart(2, '0')
      const month = String(start.getMonth() + 1).padStart(2, '0')
      const year = start.getFullYear()
      return `${startDay}/${month}-${endDay}/${month}/${year}`
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [transactionsData, categoriesData] = await Promise.all([
          fetchTransactions({
            start_date: dateRange.start,
            end_date: dateRange.end,
            type: selectedType,
            wallet_id: walletId,
            exclude_from_reports: false, // Only get transactions included in reports
          }),
          fetchCategories(),
        ])

        // Only update state if component is still mounted
        if (isMounted) {
          setCategories(categoriesData) // Set categories first
          setTransactions(transactionsData) // Then set transactions
        }
      } catch (error) {
        console.error('Error loading chart data:', error)
        if (isMounted) {
          setTransactions([])
          setCategories([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [dateRange.start, dateRange.end, selectedType, walletId])

  const totalAmount = useMemo(() => {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === selectedType)
  }, [transactions, selectedType])

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    if (periodType === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (periodType === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      // month
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setSelectedDate(newDate)
  }


  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_22px_65px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
      {/* Header with Toggle - Always visible */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            {selectedType === 'Thu' ? 'THU NHẬP' : 'CHI TIÊU'}
            {periodType === 'day' ? ' HÔM NAY' : periodType === 'week' ? ' TUẦN' : ' THÁNG'}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
            {isLoading ? '...' : formatCurrency(totalAmount)}
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSelectedType('Thu')}
            disabled={isLoading}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5 sm:py-2.5 sm:text-sm ${
              selectedType === 'Thu'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Thu
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('Chi')}
            disabled={isLoading}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5 sm:py-2.5 sm:text-sm ${
              selectedType === 'Chi'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Chi
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handlePeriodTypeChange('day')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              periodType === 'day'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => handlePeriodTypeChange('week')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              periodType === 'week'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => handlePeriodTypeChange('month')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              periodType === 'month'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            <FaCalendar className="h-3 w-3" />
            Cài đặt
          </button>
        </div>

        {/* Date navigation - Show when period is week or month */}
        {(periodType === 'week' || periodType === 'month') && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigateDate('prev')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
            >
              <FaChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-slate-900">
                {periodType === 'week'
                  ? `Tuần (${formatDateRange(dateRange.startDate, dateRange.endDate)})`
                  : `Tháng (${formatDateRange(dateRange.startDate, dateRange.endDate)})`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateDate('next')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
            >
              <FaChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Show date for day period */}
        {periodType === 'day' && (
          <div className="mt-3 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {formatDateRange(dateRange.startDate, dateRange.endDate)}
            </p>
          </div>
        )}

      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Cài đặt biểu đồ</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Hiển thị mặc định
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePeriodTypeChange('day')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      periodType === 'day'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodTypeChange('week')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      periodType === 'week'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tuần
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodTypeChange('month')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      periodType === 'month'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tháng
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Cài đặt này sẽ được lưu và tự động áp dụng khi bạn đăng nhập lại
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50">
          <LoadingRing size="lg" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl bg-slate-50">
          <img 
            src="/savings-74.png" 
            alt="Chưa có dữ liệu" 
            className="h-48 w-48 object-contain opacity-60"
          />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Chưa có {selectedType === 'Thu' ? 'thu nhập' : 'chi tiêu'} trong khoảng thời gian này
          </p>
        </div>
      ) : (
        <DonutChart
          transactions={filteredTransactions}
          categories={categories}
          type={selectedType}
          totalAmount={totalAmount}
        />
      )}

      {/* Save Preferences Confirm Dialog */}
      <ConfirmDialog
        isOpen={showSaveConfirm}
        onClose={() => {
          setShowSaveConfirm(false)
          setPendingPeriodType(null)
        }}
        title="Lưu cài đặt"
        message="Bạn có muốn lưu cài đặt này làm mặc định? Cài đặt sẽ được áp dụng tự động khi bạn đăng nhập lại."
        type="confirm"
        confirmText="Lưu"
        cancelText="Hủy"
        onConfirm={handleSavePreferences}
        onCancel={() => {
          setShowSaveConfirm(false)
          setPendingPeriodType(null)
        }}
      />
    </section>
  )
}

