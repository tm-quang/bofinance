import { useEffect, useMemo, useRef, useState } from 'react'
import { useDataPreloader } from '../hooks/useDataPreloader'
import {
  FaPlus,
  FaArrowDown,
  FaArrowUp,
  FaCalendar,
  FaSearch,
  FaWallet,
} from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { TransactionActionModal } from '../components/transactions/TransactionActionModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TransactionListSkeleton } from '../components/skeletons'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNode } from '../utils/iconLoader'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, deleteTransaction, type TransactionRecord } from '../lib/transactionService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { useNotification } from '../contexts/notificationContext.helpers'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const ITEMS_PER_PAGE = 20

const TransactionsPage = () => {
  const { success, error: showError } = useNotification()
  useDataPreloader() // Preload data khi vào trang
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')
  const [walletFilter, setWalletFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Long press handler refs
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTargetRef = useRef<TransactionRecord | null>(null)

  // Load data - sử dụng cache, chỉ reload khi cần
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Sử dụng cache - chỉ fetch khi cache hết hạn hoặc chưa có
        const [transactionsData, categoriesData, walletsData] = await Promise.all([
          fetchTransactions(),
          fetchCategories(),
          fetchWallets(false), // Chỉ lấy ví active, không lấy ví đã ẩn
        ])
        
        // Load icons for all categories
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNode(category.icon_id)
              if (iconNode) {
                iconsMap[category.id] = <span className="h-5 w-5">{iconNode}</span>
              } else {
                // Fallback to hardcoded icon
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-5 w-5" />
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-5 w-5" />
              }
            }
          })
        )
        setCategoryIcons(iconsMap)
        
        // Sort by date: newest first
        const sortedTransactions = [...transactionsData].sort((a, b) => {
          const dateA = new Date(a.transaction_date).getTime()
          const dateB = new Date(b.transaction_date).getTime()
          if (dateB !== dateA) {
            return dateB - dateA
          }
          const createdA = new Date(a.created_at).getTime()
          const createdB = new Date(b.created_at).getTime()
          return createdB - createdA
        })
        setAllTransactions(sortedTransactions)
        setCategories(categoriesData)
        setWallets(walletsData)
      } catch (error) {
        console.error('Error loading transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    // Chỉ load một lần khi mount, cache sẽ được sử dụng
    // Nếu đã preload, dữ liệu sẽ lấy từ cache ngay lập tức
    loadData()
  }, []) // Chỉ load một lần, cache sẽ được sử dụng cho các lần sau

  // Filter and paginate transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions]

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter)
    }

    // Filter by wallet
    if (walletFilter !== 'all') {
      filtered = filtered.filter((t) => t.wallet_id === walletFilter)
    }

    // Enhanced search: tên giao dịch, danh mục, khoảng số tiền, ngày cập nhật
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((t) => {
        const category = categories.find((c) => c.id === t.category_id)
        const categoryName = category?.name.toLowerCase() || ''
        const description = (t.description || '').toLowerCase()
        const notes = (t.notes || '').toLowerCase()
        const formattedAmount = formatCurrency(t.amount).toLowerCase().replace(/\s/g, '')
        const amountString = t.amount.toString()
        
        // Tìm kiếm theo tên giao dịch
        if (description.includes(term) || notes.includes(term)) return true
        
        // Tìm kiếm theo danh mục
        if (categoryName.includes(term)) return true
        
        // Tìm kiếm theo số tiền (hỗ trợ khoảng số tiền)
        if (formattedAmount.includes(term) || amountString.includes(term)) {
          // Hỗ trợ tìm kiếm khoảng số tiền (ví dụ: "100000-500000" hoặc "100k-500k")
          const rangeMatch = term.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
          if (rangeMatch) {
            const min = parseFloat(rangeMatch[1].replace(/\./g, ''))
            const max = parseFloat(rangeMatch[2].replace(/\./g, ''))
            return t.amount >= min && t.amount <= max
          }
          return true
        }
        
        // Tìm kiếm theo ngày cập nhật (created_at)
        const createdDate = new Date(t.created_at).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).toLowerCase()
        const transactionDate = new Date(t.transaction_date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).toLowerCase()
        
        if (createdDate.includes(term) || transactionDate.includes(term)) return true
        
        return false
      })
    }

    return filtered
  }, [allTransactions, typeFilter, walletFilter, searchTerm, categories])

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTransactions, currentPage])

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, walletFilter, searchTerm])

  // Get category info for a transaction
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category) return { name: 'Khác', icon: null }

    return {
      name: category.name,
      icon: categoryIcons[category.id] || null,
    }
  }

  // Get wallet name
  const getWalletName = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId)
    return wallet?.name || 'Không xác định'
  }

  // Get wallet color based on ID (consistent color for same wallet)
  const getWalletColor = (walletId: string) => {
    // Array of beautiful color combinations
    const colors = [
      { bg: 'bg-sky-100', icon: 'text-sky-600', text: 'text-sky-700' },
      { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700' },
      { bg: 'bg-rose-100', icon: 'text-rose-600', text: 'text-rose-700' },
      { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-700' },
      { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-700' },
      { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' },
      { bg: 'bg-pink-100', icon: 'text-pink-600', text: 'text-pink-700' },
      { bg: 'bg-cyan-100', icon: 'text-cyan-600', text: 'text-cyan-700' },
      { bg: 'bg-orange-100', icon: 'text-orange-600', text: 'text-orange-700' },
      { bg: 'bg-teal-100', icon: 'text-teal-600', text: 'text-teal-700' },
    ]

    // Simple hash function to convert wallet ID to index
    let hash = 0
    for (let i = 0; i < walletId.length; i++) {
      hash = walletId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // Reload transactions when a new transaction is added/updated/deleted
  const handleTransactionSuccess = () => {
    const loadTransactions = async () => {
      try {
        const transactionsData = await fetchTransactions()
        const sortedTransactions = [...transactionsData].sort((a, b) => {
          const dateA = new Date(a.transaction_date).getTime()
          const dateB = new Date(b.transaction_date).getTime()
          if (dateB !== dateA) {
            return dateB - dateA
          }
          const createdA = new Date(a.created_at).getTime()
          const createdB = new Date(b.created_at).getTime()
          return createdB - createdA
        })
        setAllTransactions(sortedTransactions)
      } catch (error) {
        console.error('Error reloading transactions:', error)
      }
    }
    loadTransactions()
  }

  // Long press handlers
  const handleLongPressStart = (transaction: TransactionRecord) => {
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }

    longPressTargetRef.current = transaction

    // Set timer for long press (500ms)
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressTargetRef.current) {
        setSelectedTransaction(longPressTargetRef.current)
        setIsActionModalOpen(true)
      }
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTargetRef.current = null
  }

  const handleLongPressCancel = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTargetRef.current = null
  }

  // Handle edit
  const handleEditClick = () => {
    setIsEditConfirmOpen(true)
  }

  const handleEditConfirm = () => {
    setIsEditConfirmOpen(false)
    setIsActionModalOpen(false)
    setIsTransactionModalOpen(true)
  }

  // Handle delete
  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTransaction) return

    setIsDeleting(true)
    try {
      await deleteTransaction(selectedTransaction.id)
      success('Đã xóa giao dịch thành công!')
      handleTransactionSuccess()
      setSelectedTransaction(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa giao dịch'
      showError(message)
    } finally {
      setIsDeleting(false)
      setIsDeleteConfirmOpen(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Lịch sử giao dịch" />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4 sm:py-6">
          {/* Search and Filters */}
          <section className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm giao dịch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Type Toggle Switch */}
              <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setTypeFilter('Thu')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    typeFilter === 'Thu'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  <FaArrowUp className="h-4 w-4" />
                  <span>Thu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('Chi')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    typeFilter === 'Chi'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-rose-50'
                  }`}
                >
                  <FaArrowDown className="h-4 w-4" />
                  <span>Chi</span>
                </button>
                {typeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className="ml-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                    title="Hiển thị tất cả"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Wallet Filter */}
              <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                <FaWallet className="h-4 w-4 text-slate-500" />
                <select
                  value={walletFilter}
                  onChange={(e) => setWalletFilter(e.target.value)}
                  className="border-none bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">Tất cả ví</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="text-xs text-slate-500">
              Hiển thị {paginatedTransactions.length} / {filteredTransactions.length} giao dịch
            </div>
          </section>

          {/* Transactions List */}
          <section className="space-y-3">
            {isLoading ? (
              <TransactionListSkeleton count={10} />
            ) : paginatedTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 shadow-lg ring-1 ring-slate-100">
                <FaSearch className="mb-4 h-12 w-12 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  {searchTerm || typeFilter !== 'all' || walletFilter !== 'all'
                    ? 'Không tìm thấy giao dịch phù hợp'
                    : 'Chưa có giao dịch nào'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {searchTerm || typeFilter !== 'all' || walletFilter !== 'all'
                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                    : 'Bắt đầu bằng cách thêm giao dịch mới'}
                </p>
              </div>
            ) : (
              <>
                {paginatedTransactions.map((transaction) => {
                  const categoryInfo = getCategoryInfo(transaction.category_id)
                  const categoryIcon = categoryInfo.icon
                  const isIncome = transaction.type === 'Thu'

                  return (
                    <div
                      key={transaction.id}
                      onTouchStart={() => handleLongPressStart(transaction)}
                      onTouchEnd={handleLongPressEnd}
                      onTouchCancel={handleLongPressCancel}
                      onMouseDown={() => handleLongPressStart(transaction)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressCancel}
                      className={`relative flex gap-2.5 rounded-2xl p-2.5 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 transition-all hover:shadow-xl select-none ${
                        isIncome
                          ? 'bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-white border-l-4 border-emerald-500'
                          : 'bg-gradient-to-r from-rose-50 via-rose-50/80 to-white border-l-4 border-rose-500'
                      }`}
                    >
                      {/* Icon */}
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base shadow-sm transition-transform ${
                          isIncome
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                            : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'
                        }`}
                      >
                        {categoryIcon ? (
                          categoryIcon
                        ) : (
                          <FaPlus className="h-5 w-5" />
                        )}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                        {/* Left side: Description, Date, Category */}
                        <div className="flex-1 min-w-0">
                          {/* Description */}
                          <p
                            className={`truncate text-sm font-semibold mb-1 ${
                              isIncome ? 'text-emerald-900' : 'text-rose-900'
                            }`}
                          >
                            {transaction.description || 'Không có mô tả'}
                          </p>

                          {/* Date and Category - Compact */}
                          <div className="flex items-center gap-2 text-xs">
                            <div
                              className={`flex items-center gap-1 shrink-0 ${
                                isIncome ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              <FaCalendar className="h-3 w-3" />
                              <span className="whitespace-nowrap">
                                {new Date(transaction.transaction_date).toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <span className="text-slate-400">•</span>
                            <span
                              className={`font-medium truncate ${
                                isIncome ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {categoryInfo.name}
                            </span>
                          </div>
                        </div>

                        {/* Right side: Amount and Wallet */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {/* Amount - Top Right */}
                          <span
                            className={`text-base font-bold ${
                              isIncome ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                          {/* Wallet - Bottom Right */}
                          {(() => {
                            const walletColor = getWalletColor(transaction.wallet_id)
                            return (
                              <div className={`flex items-center gap-1 rounded-full ${walletColor.bg} px-2 py-0.5`}>
                                <FaWallet className={`h-3 w-3 ${walletColor.icon}`} />
                                <span className={`text-xs font-semibold ${walletColor.text} whitespace-nowrap`}>
                                  {getWalletName(transaction.wallet_id)}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    <span className="rounded-xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <FooterNav onAddClick={() => setIsTransactionModalOpen(true)} />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false)
          setSelectedTransaction(null)
          setIsActionModalOpen(false)
        }}
        onSuccess={() => {
          handleTransactionSuccess()
          setSelectedTransaction(null)
        }}
        transaction={selectedTransaction}
      />

      <TransactionActionModal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false)
          setSelectedTransaction(null)
        }}
        onEdit={() => {
          setIsActionModalOpen(false)
          // Keep selectedTransaction for edit action
          handleEditClick()
        }}
        onDelete={() => {
          setIsActionModalOpen(false)
          // Keep selectedTransaction for delete action
          handleDeleteClick()
        }}
      />

      <ConfirmDialog
        isOpen={isEditConfirmOpen}
        onClose={() => setIsEditConfirmOpen(false)}
        onConfirm={handleEditConfirm}
        type="warning"
        title="Xác nhận sửa giao dịch"
        message="Bạn có chắc chắn muốn sửa giao dịch này? Thông tin giao dịch sẽ được cập nhật và có thể ảnh hưởng đến số dư ví."
        confirmText="Sửa"
        cancelText="Hủy"
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        type="error"
        title="Xác nhận xóa giao dịch"
        message="Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác và sẽ ảnh hưởng đến số dư ví."
        confirmText="Xóa"
        cancelText="Hủy"
        isLoading={isDeleting}
      />
    </div>
  )
}

export default TransactionsPage

