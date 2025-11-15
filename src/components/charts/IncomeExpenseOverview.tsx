import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCog, FaChevronDown, FaTimes } from 'react-icons/fa'
import { fetchTransactions, type TransactionRecord } from '../../lib/transactionService'
import { fetchCategories, fetchCategoriesHierarchical, type CategoryRecord, type CategoryWithChildren } from '../../lib/categoryService'
import { HorizontalBarChart } from './HorizontalBarChart'
import { IncomeExpenseSummary } from './IncomeExpenseSummary'
import { DonutChartWithLegend } from './DonutChartWithLegend'

type IncomeExpenseOverviewProps = {
  walletId?: string
}

type TimePeriod = 'day' | 'week' | 'month' | 'year'

const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
]

// Get date range based on time period
const getDateRange = (period: TimePeriod) => {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    case 'week':
      // Get Monday of current week
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when day is Sunday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  }
}

export const IncomeExpenseOverview = ({ walletId }: IncomeExpenseOverviewProps) => {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [parentCategories, setParentCategories] = useState<CategoryWithChildren[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  const [isTimePeriodDropdownOpen, setIsTimePeriodDropdownOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const timePeriodDropdownRef = useRef<HTMLDivElement>(null)

  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [transactionsData, categoriesData, parentCategoriesData] = await Promise.all([
          fetchTransactions({
            start_date: dateRange.start,
            end_date: dateRange.end,
            wallet_id: walletId,
          }),
          fetchCategories(),
          fetchCategoriesHierarchical(),
        ])

        setTransactions(transactionsData)
        setCategories(categoriesData)
        setParentCategories(parentCategoriesData)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading overview data:', errorMessage, error)
        setTransactions([])
        setCategories([])
        setParentCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [dateRange.start, dateRange.end, walletId])

  // Calculate income and expense
  const { income, expense, expenseTransactions } = useMemo(() => {
    const incomeTxs = transactions.filter((t) => t.type === 'Thu')
    const expenseTxs = transactions.filter((t) => t.type === 'Chi')

    const incomeTotal = incomeTxs.reduce((sum, t) => sum + t.amount, 0)
    const expenseTotal = expenseTxs.reduce((sum, t) => sum + t.amount, 0)

    return {
      income: incomeTotal,
      expense: expenseTotal,
      expenseTransactions: expenseTxs,
    }
  }, [transactions])

  // Get expense parent categories (only Chi tiêu type)
  const expenseParentCategories = useMemo(() => {
    return parentCategories.filter((cat) => cat.type === 'Chi tiêu')
  }, [parentCategories])

  // Close time period dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePeriodDropdownRef.current && !timePeriodDropdownRef.current.contains(event.target as Node)) {
        setIsTimePeriodDropdownOpen(false)
      }
    }

    if (isTimePeriodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTimePeriodDropdownOpen])

  // Lock body scroll when settings modal is open
  useEffect(() => {
    if (isSettingsModalOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isSettingsModalOpen])

  const currentTimePeriodLabel = TIME_PERIOD_OPTIONS.find((opt) => opt.value === timePeriod)?.label || 'Tháng'

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Tình hình thu chi</h2>
        <div className="flex items-center gap-2">
          {/* Time Period Dropdown */}
          <div ref={timePeriodDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsTimePeriodDropdownOpen(!isTimePeriodDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {currentTimePeriodLabel}
              <FaChevronDown className={`h-3 w-3 transition-transform ${isTimePeriodDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTimePeriodDropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsTimePeriodDropdownOpen(false)}
                  aria-hidden="true"
                />

                {/* Dropdown */}
                <div className="absolute right-0 z-50 mt-2 w-32 rounded-xl border-2 border-slate-200 bg-white shadow-2xl transition-all">
                  <div className="overflow-y-auto overscroll-contain">
                    {TIME_PERIOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setTimePeriod(option.value)
                          setIsTimePeriodDropdownOpen(false)
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                          timePeriod === option.value
                            ? 'bg-sky-50 text-sky-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        {timePeriod === option.value && (
                          <span className="text-xs text-sky-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FaCog className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bar Chart and Summary Section */}
      <div className="mb-3 flex items-center gap-5">
        {/* Bar Chart - Left */}
        <div className="flex items-end h-[140px] w-[120px] shrink-0">
          <HorizontalBarChart income={income} expense={expense} height={140} />
        </div>

        {/* Summary - Right */}
        <div className="flex-1">
          <IncomeExpenseSummary income={income} expense={expense} isLoading={isLoading} />
        </div>
      </div>

      {/* Donut Chart Section */}
      {expenseTransactions.length > 0 && expenseParentCategories.length > 0 ? (
        <div className="mb-4">
          <DonutChartWithLegend
            transactions={expenseTransactions}
            categories={categories}
            parentCategories={expenseParentCategories}
            totalAmount={expense}
          />
        </div>
      ) : (
        !isLoading && (
          <div className="mb-4 flex h-48 items-center justify-center rounded-2xl bg-slate-50">
            <p className="text-sm text-slate-500">Chưa có dữ liệu chi tiêu trong tháng này</p>
          </div>
        )
      )}

      {/* Record History Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:border-slate-300"
        >
          Lịch sử ghi chép
        </button>
      </div>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
          <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Cài đặt</h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Cấu hình tham số hiển thị</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
              >
                <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-slate-500">Chức năng đang được phát triển</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

