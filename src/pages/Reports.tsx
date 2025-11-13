import { useEffect, useMemo, useState } from 'react'
import {
  RiCalendarLine,
  RiDownloadLine,
  RiSearchLine,
  RiArrowDownLine,
  RiArrowUpLine,
} from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { BarChart } from '../components/charts/BarChart'
import { DateRangeFilter } from '../components/reports/DateRangeFilter'
import { CategoryFilter } from '../components/reports/CategoryFilter'
import { useNotification } from '../contexts/NotificationContext'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, type TransactionRecord } from '../lib/transactionService'

type DateRangeType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const getDateRange = (rangeType: DateRangeType, customStart?: string, customEnd?: string) => {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  switch (rangeType) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      break
    case 'week':
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      break
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
      break
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      endDate = customEnd ? new Date(customEnd) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  }
}

const ReportPage = () => {
  const { success, error: showError } = useNotification()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')
  const [rangeType, setRangeType] = useState<DateRangeType>('month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)

  const dateRange = useMemo(
    () => getDateRange(rangeType, customStartDate, customEndDate),
    [rangeType, customStartDate, customEndDate]
  )

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [transactionsData, categoriesData] = await Promise.all([
          fetchTransactions({
            start_date: dateRange.start,
            end_date: dateRange.end,
          }),
          fetchCategories(),
        ])
        setTransactions(transactionsData)
        setCategories(categoriesData)
      } catch (err) {
        console.error('Error loading report data:', err)
        showError('Không thể tải dữ liệu báo cáo')
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [dateRange.start, dateRange.end, showError])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter)
    }

    // Filter by categories
    if (selectedCategoryIds.length > 0) {
      result = result.filter((t) => selectedCategoryIds.includes(t.category_id))
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.trim().toLowerCase()
      result = result.filter((t) => {
        const category = categories.find((c) => c.id === t.category_id)
        return (
          t.description?.toLowerCase().includes(normalizedSearch) ||
          category?.name.toLowerCase().includes(normalizedSearch) ||
          t.transaction_date.includes(normalizedSearch)
        )
      })
    }

    // Sort by date: newest first (transaction_date desc, then created_at desc)
    return result.sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime()
      const dateB = new Date(b.transaction_date).getTime()
      if (dateB !== dateA) {
        return dateB - dateA // Newest first
      }
      // If same date, sort by created_at
      const createdA = new Date(a.created_at).getTime()
      const createdB = new Date(b.created_at).getTime()
      return createdB - createdA // Newest first
    })
  }, [transactions, typeFilter, selectedCategoryIds, searchTerm, categories])

  // Calculate statistics
  const stats = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.type === 'Thu').reduce((sum, t) => sum + t.amount, 0)
    const expense = filteredTransactions.filter((t) => t.type === 'Chi').reduce((sum, t) => sum + t.amount, 0)
    const balance = income - expense

    return { income, expense, balance }
  }, [filteredTransactions])

  // Group by category for top categories
  const categoryStats = useMemo(() => {
    const categoryMap = new Map<string, { income: number; expense: number; category: CategoryRecord }>()

    filteredTransactions.forEach((transaction) => {
      const category = categories.find((c) => c.id === transaction.category_id)
      if (!category) return

      const existing = categoryMap.get(transaction.category_id) || {
        income: 0,
        expense: 0,
        category,
      }

      if (transaction.type === 'Thu') {
        existing.income += transaction.amount
      } else {
        existing.expense += transaction.amount
      }

      categoryMap.set(transaction.category_id, existing)
    })

    return Array.from(categoryMap.values())
  }, [filteredTransactions, categories])

  const topIncomeCategories = useMemo(
    () => categoryStats.filter((s) => s.income > 0).sort((a, b) => b.income - a.income).slice(0, 5),
    [categoryStats]
  )

  const topExpenseCategories = useMemo(
    () => categoryStats.filter((s) => s.expense > 0).sort((a, b) => b.expense - a.expense).slice(0, 5),
    [categoryStats]
  )

  // Largest and smallest transactions
  const largestTransaction = useMemo(() => {
    if (filteredTransactions.length === 0) return null
    return filteredTransactions.reduce((max, t) => (t.amount > max.amount ? t : max))
  }, [filteredTransactions])

  const smallestTransaction = useMemo(() => {
    if (filteredTransactions.length === 0) return null
    return filteredTransactions.reduce((min, t) => (t.amount < min.amount ? t : min))
  }, [filteredTransactions])

  // Chart data - group by day/week/month based on range
  const chartData = useMemo(() => {
    if (filteredTransactions.length === 0) return []

    const dataMap = new Map<string, { income: number; expense: number }>()

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date)
      let key: string

      if (rangeType === 'day') {
        key = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      } else if (rangeType === 'week') {
        key = `T${date.getDay() === 0 ? 7 : date.getDay()}`
      } else if (rangeType === 'month') {
        const weekNum = Math.ceil(date.getDate() / 7)
        key = `Tuần ${weekNum}`
      } else if (rangeType === 'quarter') {
        key = date.toLocaleDateString('vi-VN', { month: 'long' })
      } else {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        key = `Q${quarter}`
      }

      const existing = dataMap.get(key) || { income: 0, expense: 0 }
      if (transaction.type === 'Thu') {
        existing.income += transaction.amount
      } else {
        existing.expense += transaction.amount
      }
      dataMap.set(key, existing)
    })

    return Array.from(dataMap.entries())
      .map(([label, values]) => ({ label, ...values }))
      .sort((a, b) => {
        // Sort by date order if possible, otherwise by label
        return a.label.localeCompare(b.label, 'vi')
      })
  }, [filteredTransactions, rangeType])

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    success('Tính năng xuất báo cáo đang được phát triển')
  }

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return { name: 'Không xác định', icon: null }
    const iconData = CATEGORY_ICON_MAP[category.icon_id]
    return {
      name: category.name,
      icon: iconData?.icon,
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Báo cáo" />
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4 sm:max-w-4xl sm:gap-5 sm:px-6 sm:py-5 md:max-w-6xl lg:max-w-7xl">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white px-2 py-2.5 shadow-sm ring-1 ring-emerald-100 sm:rounded-2xl sm:px-3 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 sm:text-xs">Thu nhập</p>
              <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-emerald-700 sm:text-base">
                {isLoading ? '...' : formatCurrency(stats.income)}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-rose-50 to-white px-2 py-2.5 shadow-sm ring-1 ring-rose-100 sm:rounded-2xl sm:px-3 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 sm:text-xs">Chi tiêu</p>
              <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-rose-700 sm:text-base">
                {isLoading ? '...' : formatCurrency(stats.expense)}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-sky-50 to-white px-2 py-2.5 shadow-sm ring-1 ring-sky-100 sm:rounded-2xl sm:px-3 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 sm:text-xs">Còn lại</p>
              <p className={`mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold sm:text-base ${stats.balance >= 0 ? 'text-sky-700' : 'text-rose-700'}`}>
                {isLoading ? '...' : formatCurrency(stats.balance)}
              </p>
            </div>
          </div>

          {/* Filters */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">Bộ lọc</h2>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] sm:px-4 sm:py-2 sm:text-sm"
                >
                  <RiDownloadLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Xuất báo cáo</span>
                  <span className="sm:hidden">Xuất</span>
                </button>
              </div>

              {/* Date Range Filter */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600 sm:text-sm">Khoảng thời gian</p>
                <DateRangeFilter
                  rangeType={rangeType}
                  onRangeTypeChange={setRangeType}
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onStartDateChange={setCustomStartDate}
                  onEndDateChange={setCustomEndDate}
                />
              </div>

              {/* Type Filter */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600 sm:text-sm">Loại giao dịch</p>
                <div className="flex gap-2">
                  {(['all', 'Thu', 'Chi'] as const).map((type) => {
                    const isActive = typeFilter === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                          isActive
                            ? type === 'Thu'
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                              : type === 'Chi'
                                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/30'
                                : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {type === 'Thu' && <RiArrowUpLine className="h-3.5 w-3.5" />}
                        {type === 'Chi' && <RiArrowDownLine className="h-3.5 w-3.5" />}
                        {type === 'all' ? 'Tất cả' : type}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600 sm:text-sm">Danh mục</p>
                <CategoryFilter
                  categories={categories}
                  selectedCategoryIds={selectedCategoryIds}
                  onCategoryToggle={handleCategoryToggle}
                  onClearAll={() => setSelectedCategoryIds([])}
                  type={typeFilter === 'all' ? 'all' : typeFilter}
                />
              </div>

              {/* Search */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600 sm:text-sm">Tìm kiếm</p>
                <div className="relative">
                  <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm giao dịch..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Chart Section */}
          {chartData.length > 0 && (
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-5">
              <h2 className="mb-4 text-sm font-bold text-slate-900 sm:text-base">Biểu đồ thu & chi</h2>
              <BarChart data={chartData} height={180} />
            </section>
          )}

          {/* Top Categories and Stats */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {/* Top Income Categories */}
            {topIncomeCategories.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">Danh mục thu nổi bật</h2>
                <div className="space-y-2">
                  {topIncomeCategories.map((stat) => {
                    const iconData = CATEGORY_ICON_MAP[stat.category.icon_id]
                    const IconComponent = iconData?.icon
                    const totalIncome = categoryStats.filter((s) => s.income > 0).reduce((sum, s) => sum + s.income, 0)
                    const percentage = totalIncome > 0 ? ((stat.income / totalIncome) * 100).toFixed(1) : '0'

                    return (
                      <div
                        key={stat.category.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 p-2.5 ring-1 ring-emerald-100 sm:p-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                          {IconComponent && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 sm:h-10 sm:w-10 sm:rounded-xl">
                              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-700 sm:text-sm">{stat.category.name}</p>
                            <p className="text-[10px] text-emerald-600 sm:text-xs">{percentage}% tổng thu</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-emerald-700 sm:text-sm">
                          +{formatCurrency(stat.income)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Top Expense Categories */}
            {topExpenseCategories.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">Danh mục chi nổi bật</h2>
                <div className="space-y-2">
                  {topExpenseCategories.map((stat) => {
                    const iconData = CATEGORY_ICON_MAP[stat.category.icon_id]
                    const IconComponent = iconData?.icon
                    const totalExpense = categoryStats.filter((s) => s.expense > 0).reduce((sum, s) => sum + s.expense, 0)
                    const percentage = totalExpense > 0 ? ((stat.expense / totalExpense) * 100).toFixed(1) : '0'

                    return (
                      <div
                        key={stat.category.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-rose-50 p-2.5 ring-1 ring-rose-100 sm:p-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                          {IconComponent && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 sm:h-10 sm:w-10 sm:rounded-xl">
                              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-700 sm:text-sm">{stat.category.name}</p>
                            <p className="text-[10px] text-rose-600 sm:text-xs">{percentage}% tổng chi</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-rose-700 sm:text-sm">
                          -{formatCurrency(stat.expense)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Largest and Smallest Transactions */}
          {(largestTransaction || smallestTransaction) && (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              {largestTransaction && (
                <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm ring-1 ring-amber-100 sm:rounded-3xl sm:p-5">
                  <h2 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">Giao dịch lớn nhất</h2>
                  <div className="space-y-2">
                    {(() => {
                      const categoryInfo = getCategoryInfo(largestTransaction.category_id)
                      const IconComponent = categoryInfo.icon
                      const isIncome = largestTransaction.type === 'Thu'

                      return (
                        <div className="rounded-xl bg-white p-3 ring-1 ring-amber-200 sm:p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                              {IconComponent && (
                                <span
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${
                                    isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                  }`}
                                >
                                  <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-700 sm:text-sm">
                                  {largestTransaction.description || 'Không có mô tả'}
                                </p>
                                <p className="text-[10px] text-slate-500 sm:text-xs">{categoryInfo.name}</p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 text-sm font-bold sm:text-base ${
                                isIncome ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(largestTransaction.amount)}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </section>
              )}

              {smallestTransaction && (
                <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm ring-1 ring-blue-100 sm:rounded-3xl sm:p-5">
                  <h2 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">Giao dịch nhỏ nhất</h2>
                  <div className="space-y-2">
                    {(() => {
                      const categoryInfo = getCategoryInfo(smallestTransaction.category_id)
                      const IconComponent = categoryInfo.icon
                      const isIncome = smallestTransaction.type === 'Thu'

                      return (
                        <div className="rounded-xl bg-white p-3 ring-1 ring-blue-200 sm:p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                              {IconComponent && (
                                <span
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${
                                    isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                  }`}
                                >
                                  <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-700 sm:text-sm">
                                  {smallestTransaction.description || 'Không có mô tả'}
                                </p>
                                <p className="text-[10px] text-slate-500 sm:text-xs">{categoryInfo.name}</p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 text-sm font-bold sm:text-base ${
                                isIncome ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(smallestTransaction.amount)}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Transaction List */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-900 sm:text-base">
              Lịch sử giao dịch ({filteredTransactions.length})
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center rounded-xl bg-slate-50 p-8 text-sm text-slate-500">
                Đang tải dữ liệu...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl bg-slate-50 p-8 text-sm text-slate-500">
                Không có giao dịch phù hợp với bộ lọc hiện tại
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => {
                  const categoryInfo = getCategoryInfo(transaction.category_id)
                  const IconComponent = categoryInfo.icon
                  const isIncome = transaction.type === 'Thu'

                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between gap-3 rounded-xl p-3 transition hover:shadow-md ${
                        isIncome
                          ? 'bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-white border-l-4 border-emerald-500'
                          : 'bg-gradient-to-r from-rose-50 via-rose-50/80 to-white border-l-4 border-rose-500'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                        {IconComponent && (
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base shadow-md sm:h-12 sm:w-12 sm:rounded-2xl sm:text-lg ${
                              isIncome
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                                : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'
                            }`}
                          >
                            <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-semibold sm:text-sm ${isIncome ? 'text-emerald-900' : 'text-rose-900'}`}>
                            {transaction.description || 'Không có mô tả'}
                          </p>
                          <div className={`mt-0.5 flex items-center gap-2 text-[10px] sm:text-xs ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                            <RiCalendarLine className="h-3 w-3" />
                            {new Date(transaction.transaction_date).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                            <span>• {categoryInfo.name}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 text-xs font-bold sm:text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIncome ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <FooterNav onAddClick={() => setIsTransactionModalOpen(true)} />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={() => {
          // Reload data
          const loadData = async () => {
            try {
              const dateRange = getDateRange(rangeType, customStartDate, customEndDate)
              const [transactionsData, categoriesData] = await Promise.all([
                fetchTransactions({
                  start_date: dateRange.start,
                  end_date: dateRange.end,
                }),
                fetchCategories(),
              ])
              setTransactions(transactionsData)
              setCategories(categoriesData)
            } catch (err) {
              console.error('Error reloading data:', err)
            }
          }
          void loadData()
        }}
      />
    </div>
  )
}

export default ReportPage
