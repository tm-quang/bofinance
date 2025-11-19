import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaDownload,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaFilter,
} from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { CashFlowBarChartMUI } from '../components/charts/CashFlowBarChartMUI'
import { DateRangeFilter } from '../components/reports/DateRangeFilter'
import { CategoryFilter } from '../components/reports/CategoryFilter'
// import { TransactionCard } from '../components/transactions/TransactionCard'
// import { TransactionListSkeleton } from '../components/skeletons'
import { useNotification } from '../contexts/notificationContext.helpers'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNodeFromCategory } from '../utils/iconLoader'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, type TransactionRecord } from '../lib/transactionService'
// import { fetchWallets, type WalletRecord } from '../lib/walletService' // Reserved for future use

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
    case 'week': {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
      break
    }
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      // Kỳ là từ ngày 1 đến ngày hiện tại (nếu đang trong tháng) hoặc ngày cuối tháng (nếu đã qua tháng)
      // Số dư cuối kỳ là số dư hiện tại, không phải số dư cuối tháng
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0)
      break
    }
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

type FilterSectionKey = 'range' | 'type' | 'category'

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

const FilterAccordionSection = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) => (
  <div className="rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900 sm:text-base">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
      </div>
      <FaChevronDown
        className={classNames(
          'h-5 w-5 text-slate-500 transition-transform duration-300',
          isOpen ? 'rotate-180' : 'rotate-0'
        )}
      />
    </button>
    <div
      className={classNames(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
        isOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  </div>
)

const RANGE_LABEL_MAP: Record<DateRangeType, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
  custom: 'Tùy chỉnh',
}

const ReportPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  // const [wallets, setWallets] = useState<WalletRecord[]>([]) // Reserved for future use
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')
  const [rangeType, setRangeType] = useState<DateRangeType>('month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [openFilterSections, setOpenFilterSections] = useState<Record<FilterSectionKey, boolean>>({
    range: true,
    category: false,
    type: false,
  })
  const [isLargestTransactionExpanded, setIsLargestTransactionExpanded] = useState(false)
  const [isSmallestTransactionExpanded, setIsSmallestTransactionExpanded] = useState(false)

  const filteredCategoriesByType = useMemo(() => {
    if (typeFilter === 'all') return categories
    return categories.filter((cat) =>
      typeFilter === 'Thu' ? cat.type === 'Thu nhập' : cat.type === 'Chi tiêu'
    )
  }, [categories, typeFilter])

  const displayCategories = useMemo(() => {
    if (showAllCategories) return filteredCategoriesByType
    return filteredCategoriesByType.slice(0, 8)
  }, [filteredCategoriesByType, showAllCategories])

  const toggleSection = (section: FilterSectionKey) => {
    setOpenFilterSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

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
            exclude_from_reports: false, // Only get transactions included in reports
          }),
          fetchCategories(),
          // fetchWallets(false), // Reserved for future use
        ])
        
        // Load icons for all categories using icon_url from category
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNodeFromCategory(category.icon_id, category.icon_url, 'h-full w-full object-cover rounded-full')
              if (iconNode) {
                iconsMap[category.id] = <span className="h-14 w-14 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span>
              } else {
                // Fallback to hardcoded icon
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-14 w-14" />
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-14 w-14" />
              }
            }
          })
        )
        setCategoryIcons(iconsMap)
        
        setTransactions(transactionsData)
        setCategories(categoriesData)
        // setWallets(walletsData) // Reserved for future use
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

  // Calculate statistics - tính từ TẤT CẢ giao dịch trong khoảng thời gian, không phụ thuộc filter
  const stats = useMemo(() => {
    // Thu nhập và chi tiêu trong kỳ (theo period: ngày, tuần, tháng, quý, năm)
    const income = transactions.filter((t) => t.type === 'Thu').reduce((sum, t) => sum + t.amount, 0)
    const expense = transactions.filter((t) => t.type === 'Chi').reduce((sum, t) => sum + t.amount, 0)
    
    // Thay đổi số dư trong kỳ = Thu nhập - Chi tiêu
    const balance = income - expense

    return { 
      income, // Tổng thu nhập trong kỳ
      expense, // Tổng chi tiêu trong kỳ
      balance, // Thay đổi số dư trong kỳ
    }
  }, [transactions])

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
    if (transactions.length === 0) return []

    const dataMap = new Map<string, { income: number; expense: number; date: Date }>()

    transactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date)
      let key: string

      if (rangeType === 'day') {
        // Group by hour
        const hour = date.getHours()
        key = `${hour}:00`
      } else if (rangeType === 'week') {
        // Group by day of week (Monday = 1, Sunday = 7)
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
        key = dayNames[dayOfWeek - 1]
      } else if (rangeType === 'month') {
        // Group by week of month (1-4 or 5)
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const daysSinceStart = Math.floor((date.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24))
        const weekNum = Math.floor(daysSinceStart / 7) + 1
        key = `Tuần ${weekNum}`
      } else if (rangeType === 'quarter') {
        // Group by month
        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
        const month = date.getMonth()
        key = monthNames[month]
      } else if (rangeType === 'year') {
        // Group by quarter
        const quarter = Math.floor(date.getMonth() / 3) + 1
        key = `Q${quarter}`
      } else {
        // Custom: group by day
        key = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      }

      const existing = dataMap.get(key) || { income: 0, expense: 0, date }
      if (transaction.type === 'Thu') {
        existing.income += transaction.amount
      } else {
        existing.expense += transaction.amount
      }
      dataMap.set(key, existing)
    })

    // Create array with proper sort keys
    const result = Array.from(dataMap.entries()).map(([label, values]) => {
      let sortKey: string
      if (rangeType === 'day') {
        sortKey = `${values.date.getDate().toString().padStart(2, '0')}-${values.date.getHours().toString().padStart(2, '0')}`
      } else if (rangeType === 'week') {
        const dayOfWeek = values.date.getDay() === 0 ? 7 : values.date.getDay()
        sortKey = dayOfWeek.toString().padStart(2, '0')
      } else if (rangeType === 'month') {
        const startOfMonth = new Date(values.date.getFullYear(), values.date.getMonth(), 1)
        const daysSinceStart = Math.floor((values.date.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24))
        const weekNum = Math.floor(daysSinceStart / 7) + 1
        sortKey = weekNum.toString().padStart(2, '0')
      } else if (rangeType === 'quarter') {
        sortKey = `${values.date.getFullYear()}-${values.date.getMonth().toString().padStart(2, '0')}`
      } else if (rangeType === 'year') {
        const quarter = Math.floor(values.date.getMonth() / 3) + 1
        sortKey = `${values.date.getFullYear()}-${quarter}`
      } else {
        sortKey = values.date.toISOString().split('T')[0]
      }
      
      return {
        label,
        income: values.income,
        expense: values.expense,
        balance: values.income - values.expense,
        sortKey,
      }
    })

    return result.sort((a, b) => {
      // Sort by sortKey (chronological order)
      return a.sortKey.localeCompare(b.sortKey)
    })
  }, [transactions, rangeType])

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    success('Tính năng xuất báo cáo đang được phát triển')
  }

  const handleResetFilters = () => {
    setRangeType('month')
    setCustomStartDate('')
    setCustomEndDate('')
    setTypeFilter('all')
    setSelectedCategoryIds([])
    setSearchTerm('')
    setShowAllCategories(false)
    setOpenFilterSections({ range: true, category: false, type: false })
  }

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return { name: 'Không xác định', icon: null }
    return {
      name: category.name,
      icon: categoryIcons[category.id] || null,
    }
  }

  // Get wallet name (reserved for future use)
  // const getWalletName = (walletId: string) => {
  //   const wallet = wallets.find((w) => w.id === walletId)
  //   return wallet?.name || 'Không xác định'
  // }

  // Get wallet color based on ID (reserved for future use)
  // const getWalletColor = (walletId: string) => {
  //   // Array of beautiful color combinations
  //   const colors = [
  //     { bg: 'bg-sky-100', icon: 'text-sky-600', text: 'text-sky-700' },
  //     { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700' },
  //     { bg: 'bg-rose-100', icon: 'text-rose-600', text: 'text-rose-700' },
  //     { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-700' },
  //     { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-700' },
  //     { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' },
  //     { bg: 'bg-pink-100', icon: 'text-pink-600', text: 'text-pink-700' },
  //     { bg: 'bg-cyan-100', icon: 'text-cyan-600', text: 'text-cyan-700' },
  //     { bg: 'bg-orange-100', icon: 'text-orange-600', text: 'text-orange-700' },
  //     { bg: 'bg-teal-100', icon: 'text-teal-600', text: 'text-teal-700' },
  //   ]

  //   // Simple hash function to convert wallet ID to index
  //   let hash = 0
  //   for (let i = 0; i < walletId.length; i++) {
  //     hash = walletId.charCodeAt(i) + ((hash << 5) - hash)
  //   }
  //   const index = Math.abs(hash) % colors.length
  //   return colors[index]
  // }

  // Long press handlers (reserved for future use)
  // const handleLongPressStart = () => {}
  // const handleLongPressEnd = () => {}
  // const handleLongPressCancel = () => {}

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar 
        variant="page" 
        title={isSearchOpen ? '' : "BÁO CÁO & THỐNG KÊ"}
        showIcon={
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100 transition hover:scale-110 active:scale-95"
            aria-label="Tìm kiếm"
          >
            <FaSearch className="h-4 w-4 text-slate-600" />
          </button>
        }
        customContent={
          isSearchOpen ? (
            <div className="flex-1 px-4">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mô tả, hạng mục hoặc ngày..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  onBlur={() => {
                    // Không đóng search khi blur, chỉ đóng khi bấm nút search lại
                  }}
                />
              </div>
            </div>
          ) : null
        }
      />
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pt-2 pb-4 sm:pt-2 sm:pb-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white px-2 py-2.5 shadow-sm ring-1 ring-emerald-100 sm:rounded-2xl sm:px-3 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 sm:text-xs">Thu nhập</p>
              <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-emerald-700 sm:text-base">
                {isLoading ? '...' : formatCurrency(stats.income)}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">
                {RANGE_LABEL_MAP[rangeType]}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-rose-50 to-white px-2 py-2.5 shadow-sm ring-1 ring-rose-100 sm:rounded-2xl sm:px-3 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 sm:text-xs">Chi tiêu</p>
              <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-rose-700 sm:text-base">
                {isLoading ? '...' : formatCurrency(stats.expense)}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">
                {RANGE_LABEL_MAP[rangeType]}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-sky-50 to-white px-2 py-2.5 shadow-sm ring-1 ring-sky-100 sm:rounded-2xl sm:px-3 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 sm:text-xs">Thay đổi</p>
              <p className={`mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold sm:text-base ${stats.balance >= 0 ? 'text-sky-700' : 'text-rose-700'}`}>
                {isLoading ? '...' : formatCurrency(stats.balance)}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">
                {RANGE_LABEL_MAP[rangeType]}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Bộ lọc thông minh</p>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Tinh chỉnh dữ liệu</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 sm:text-sm"
                >
                  <FaFilter className="h-4 w-4" />
                  Đặt lại
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] sm:text-sm"
                >
                  <FaDownload className="h-4 w-4" />
                  Xuất báo cáo
                </button>
              </div>
            </div>

            {/* Khoảng thời gian - Luôn hiển thị đầu tiên */}
            <FilterAccordionSection
              title="Khoảng thời gian"
              subtitle="Chọn nhanh theo ngày, tuần, tháng, quý, năm hoặc tùy chỉnh"
              isOpen={openFilterSections.range}
              onToggle={() => toggleSection('range')}
            >
              <DateRangeFilter
                rangeType={rangeType}
                onRangeTypeChange={setRangeType}
                startDate={customStartDate}
                endDate={customEndDate}
                onStartDateChange={setCustomStartDate}
                onEndDateChange={setCustomEndDate}
              />
            </FilterAccordionSection>

            {/* Hạng mục - Hiển thị thứ hai */}
            <FilterAccordionSection
              title="Hạng mục"
              subtitle="Chọn nhanh hạng mục"
              isOpen={openFilterSections.category}
              onToggle={() => toggleSection('category')}
            >
              <CategoryFilter
                categories={displayCategories}
                selectedCategoryIds={selectedCategoryIds}
                onCategoryToggle={handleCategoryToggle}
                onClearAll={() => setSelectedCategoryIds([])}
                type="all"
              />
              {filteredCategoriesByType.length > 8 && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 sm:text-sm"
                  >
                    {showAllCategories ? 'Thu gọn hạng mục' : `Xem thêm ${filteredCategoriesByType.length - 8} hạng mục`}
                  </button>
                </div>
              )}
              {/* Search field đã được di chuyển lên header */}
            </FilterAccordionSection>

            {/* Loại giao dịch - Hiển thị cuối cùng */}
            <FilterAccordionSection
              title="Loại giao dịch"
              subtitle="Xem nhanh thu, chi hoặc toàn bộ"
              isOpen={openFilterSections.type}
              onToggle={() => toggleSection('type')}
            >
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'Thu', 'Chi'] as const).map((type) => {
                  const isActive = typeFilter === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeFilter(type)}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? type === 'Thu'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : type === 'Chi'
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30'
                            : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {type === 'Thu' && <FaChevronUp className="h-4 w-4" />}
                      {type === 'Chi' && <FaChevronDown className="h-4 w-4" />}
                      {type === 'all' ? 'Tất cả' : type}
                    </button>
                  )
                })}
              </div>
            </FilterAccordionSection>
          </div>

          {/* Chart Section */}
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Xu hướng dòng tiền</p>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Thu - chi & cân đối</h2>
              </div>
              <span className="text-xs text-slate-500 sm:text-sm">
                {chartData.length} mốc dữ liệu · Phạm vi {RANGE_LABEL_MAP[rangeType]}
              </span>
            </div>
            <div className="mt-4">
              <CashFlowBarChartMUI data={chartData} height={300} />
            </div>
          </section>

          {/* Top Categories and Stats */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {/* Top Income Categories */}
            {topIncomeCategories.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">Hạng mục thu nổi bật</h2>
                <div className="space-y-2">
                  {topIncomeCategories.map((stat) => {
                    const categoryIcon = categoryIcons[stat.category.id]
                    const totalIncome = categoryStats.filter((s) => s.income > 0).reduce((sum, s) => sum + s.income, 0)
                    const percentage = totalIncome > 0 ? ((stat.income / totalIncome) * 100).toFixed(1) : '0'

                    return (
                      <div
                        key={stat.category.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100 sm:p-4"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {categoryIcon ? (
                            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden">
                              <div className="h-full w-full flex items-center justify-center">
                                {categoryIcon}
                              </div>
                            </div>
                          ) : (
                            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                              <span className="text-slate-400 text-lg">?</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <p className="truncate text-sm font-semibold mb-1 text-slate-900">{stat.category.name}</p>
                            <p className="text-xs text-emerald-600 font-medium truncate">{percentage}% tổng thu</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-base font-bold text-emerald-600 whitespace-nowrap">
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
                <h2 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">Hạng mục chi nổi bật</h2>
                <div className="space-y-2">
                  {topExpenseCategories.map((stat) => {
                    const categoryIcon = categoryIcons[stat.category.id]
                    const totalExpense = categoryStats.filter((s) => s.expense > 0).reduce((sum, s) => sum + s.expense, 0)
                    const percentage = totalExpense > 0 ? ((stat.expense / totalExpense) * 100).toFixed(1) : '0'

                    return (
                      <div
                        key={stat.category.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-100 sm:p-4"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {categoryIcon ? (
                            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden">
                              <div className="h-full w-full flex items-center justify-center">
                                {categoryIcon}
                              </div>
                            </div>
                          ) : (
                            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                              <span className="text-slate-400 text-lg">?</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <p className="truncate text-sm font-semibold mb-1 text-slate-900">{stat.category.name}</p>
                            <p className="text-xs text-rose-600 font-medium truncate">{percentage}% tổng chi</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-base font-bold text-rose-600 whitespace-nowrap">
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
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">Giao dịch lớn nhất</h2>
                    <button
                      type="button"
                      onClick={() => setIsLargestTransactionExpanded(!isLargestTransactionExpanded)}
                      className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition hover:bg-white/50 hover:text-slate-700"
                      aria-label={isLargestTransactionExpanded ? 'Thu gọn' : 'Mở rộng'}
                    >
                      {isLargestTransactionExpanded ? (
                        <FaChevronUp className="h-4 w-4" />
                      ) : (
                        <FaChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {isLargestTransactionExpanded && (
                  <div className="space-y-2">
                    {(() => {
                      const categoryInfo = getCategoryInfo(largestTransaction.category_id)
                      const categoryIcon = categoryInfo.icon
                      const isIncome = largestTransaction.type === 'Thu'

                      return (
                        <div className="rounded-xl bg-white p-3 ring-1 ring-amber-200 sm:p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              {categoryIcon ? (
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden">
                                  <div className="h-full w-full flex items-center justify-center">
                                    {categoryIcon}
                                  </div>
                                </div>
                              ) : (
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                  <span className="text-slate-400 text-lg">?</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <p className="truncate text-sm font-semibold mb-1 text-slate-900">
                                  {largestTransaction.description || categoryInfo.name || 'Không có mô tả'}
                                </p>
                                <p className="text-xs text-slate-600 font-medium truncate">{categoryInfo.name}</p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 text-base font-bold whitespace-nowrap ${
                                isIncome ? 'text-emerald-600' : 'text-rose-600'
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
                  )}
                </section>
              )}

              {smallestTransaction && (
                <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm ring-1 ring-blue-100 sm:rounded-3xl sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">Giao dịch nhỏ nhất</h2>
                    <button
                      type="button"
                      onClick={() => setIsSmallestTransactionExpanded(!isSmallestTransactionExpanded)}
                      className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition hover:bg-white/50 hover:text-slate-700"
                      aria-label={isSmallestTransactionExpanded ? 'Thu gọn' : 'Mở rộng'}
                    >
                      {isSmallestTransactionExpanded ? (
                        <FaChevronUp className="h-4 w-4" />
                      ) : (
                        <FaChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {isSmallestTransactionExpanded && (
                  <div className="space-y-2">
                    {(() => {
                      const categoryInfo = getCategoryInfo(smallestTransaction.category_id)
                      const categoryIcon = categoryInfo.icon
                      const isIncome = smallestTransaction.type === 'Thu'

                      return (
                        <div className="rounded-xl bg-white p-3 ring-1 ring-blue-200 sm:p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              {categoryIcon ? (
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden">
                                  <div className="h-full w-full flex items-center justify-center">
                                    {categoryIcon}
                                  </div>
                                </div>
                              ) : (
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                  <span className="text-slate-400 text-lg">?</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <p className="truncate text-sm font-semibold mb-1 text-slate-900">
                                  {smallestTransaction.description || categoryInfo.name || 'Không có mô tả'}
                                </p>
                                <p className="text-xs text-slate-600 font-medium truncate">{categoryInfo.name}</p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 text-base font-bold whitespace-nowrap ${
                                isIncome ? 'text-emerald-600' : 'text-rose-600'
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
                  )}
                </section>
              )}
            </div>
          )}

        </div>
      </main>

      <FooterNav onAddClick={() => navigate('/add-transaction')} />
    </div>
  )
}

export default ReportPage
