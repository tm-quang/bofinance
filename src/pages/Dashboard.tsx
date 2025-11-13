import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiAddLine, RiCalendarLine, RiExchangeDollarLine, RiHandCoinLine, RiHandHeartLine, RiSendPlaneFill, RiSettings3Line } from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { QuickActionsSettings } from '../components/quickActions/QuickActionsSettings'
import { TransactionChart } from '../components/charts/TransactionChart'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { WalletCarousel } from '../components/wallets/WalletCarousel'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, type TransactionRecord } from '../lib/transactionService'
import type { WalletRecord } from '../lib/walletService'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const ALL_QUICK_ACTIONS = [
  { 
    id: 'send-money',
    label: 'Chi tiền', 
    icon: RiSendPlaneFill,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  { 
    id: 'add-transaction',
    label: 'Thêm thu/chi', 
    icon: RiAddLine,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  { 
    id: 'split-bill',
    label: 'Chia khoản', 
    icon: RiExchangeDollarLine,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  { 
    id: 'reminder',
    label: 'Nhắc thu/chi', 
    icon: RiHandHeartLine,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  { 
    id: 'settings',
    label: 'Cài đặt', 
    icon: RiSettings3Line,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
  },
]

const STORAGE_KEY = 'quickActionsSettings'

export const DashboardPage = () => {
  const navigate = useNavigate()
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<WalletRecord | null>(null)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)

  // Load quick actions settings from localStorage
  const getStoredActions = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return ALL_QUICK_ACTIONS.map((action, index) => ({
          id: action.id,
          label: action.label,
          enabled: parsed[action.id] ?? (index < 4 || action.id === 'settings'), // Mặc định 4 chức năng đầu + cài đặt
        }))
      }
    } catch (error) {
      console.error('Error loading quick actions settings:', error)
    }
    // Mặc định: 4 chức năng đầu tiên + cài đặt (tổng 5 chức năng)
    return ALL_QUICK_ACTIONS.map((action, index) => ({
      id: action.id,
      label: action.label,
      enabled: index < 4 || action.id === 'settings',
    }))
  }

  const [quickActionsSettings, setQuickActionsSettings] = useState(getStoredActions)

  // Get enabled quick actions
  const enabledQuickActions = ALL_QUICK_ACTIONS.filter((action) => {
    const setting = quickActionsSettings.find((s) => s.id === action.id)
    return setting?.enabled ?? false
  })

  // Handle update quick actions settings
  const handleUpdateQuickActions = (updatedActions: typeof quickActionsSettings) => {
    setQuickActionsSettings(updatedActions)
    // Save to localStorage
    const settingsMap: Record<string, boolean> = {}
    updatedActions.forEach((action) => {
      settingsMap[action.id] = action.enabled
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsMap))
  }

  const handleAddClick = () => {
    setIsTransactionModalOpen(true)
  }


  const handleWalletChange = (wallet: WalletRecord) => {
    setSelectedWallet(wallet)
  }

  const handleAddWallet = () => {
    navigate('/wallets')
  }

  // Load transactions and categories
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingTransactions(true)
      try {
        const [transactionsData, categoriesData] = await Promise.all([
          fetchTransactions({ limit: 10 }),
          fetchCategories(),
        ])
        // Sort by date: newest first (transaction_date desc, then created_at desc)
        const sortedTransactions = [...transactionsData].sort((a, b) => {
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
        setTransactions(sortedTransactions)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error loading transactions:', error)
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    loadData()
  }, [])

  // Reload transactions when a new transaction is added
  const handleTransactionSuccess = () => {
    const loadTransactions = async () => {
      try {
        const transactionsData = await fetchTransactions({ limit: 10 })
        // Sort by date: newest first (transaction_date desc, then created_at desc)
        const sortedTransactions = [...transactionsData].sort((a, b) => {
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
        setTransactions(sortedTransactions)
      } catch (error) {
        console.error('Error reloading transactions:', error)
      }
    }
    loadTransactions()
  }

  // Get category info for a transaction
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category) return { name: 'Khác', icon: null }
    
    const iconData = CATEGORY_ICON_MAP[category.icon_id]
    const IconComponent = iconData?.icon
    
    return {
      name: category.name,
      icon: IconComponent || null,
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar userName="Minh Quang" badgeColor="bg-sky-500" />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
          {/* Wallet Card Carousel */}
          <WalletCarousel onWalletChange={handleWalletChange} onAddWallet={handleAddWallet} />

        {/* Transaction Chart */}
        <TransactionChart walletId={selectedWallet?.id} />

        <section className="rounded-3xl bg-gradient-to-br from-white via-slate-50/50 to-white p-5 shadow-lg ring-1 ring-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">CHỨC NĂNG NHANH</h3>
              <p className="mt-1 text-xs text-slate-500">Truy cập nhanh các tính năng thường dùng</p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
            >
              Xem tất cả
            </button>
          </div>
          <div className={`grid gap-2.5 sm:gap-3 ${
            enabledQuickActions.length === 1 ? 'grid-cols-1' :
            enabledQuickActions.length === 2 ? 'grid-cols-2' :
            enabledQuickActions.length === 3 ? 'grid-cols-3' :
            enabledQuickActions.length === 4 ? 'grid-cols-4' :
            'grid-cols-5'
          }`}>
            {enabledQuickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    if (action.id === 'add-transaction') {
                      setIsTransactionModalOpen(true)
                    } else if (action.id === 'settings') {
                      setIsSettingsOpen(true)
                    }
                    // Các chức năng khác sẽ được implement sau
                  }}
                  className="group relative flex flex-col items-center gap-2.5 rounded-2xl bg-white p-3 text-center transition-all hover:scale-105 hover:shadow-lg active:scale-95 sm:p-4"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} text-white shadow-md transition-all group-hover:scale-110 group-hover:shadow-xl sm:h-16 sm:w-16`}
                  >
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </span>
                  <span className={`text-[10px] font-semibold leading-tight ${action.textColor} sm:text-xs`}>
                    {action.label}
                  </span>
                  <div className={`absolute inset-0 rounded-2xl ${action.bgColor} opacity-0 transition-opacity group-hover:opacity-20 -z-10`} />
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Giao dịch gần đây
              </p>
              <p className="text-sm text-slate-500">Theo dõi lịch sử thu chi mới nhất.</p>
            </div>
            <button 
              onClick={() => navigate('/reports')}
              className="text-sm font-semibold text-sky-500 transition hover:text-sky-600 hover:underline"
            >
              Xem thêm
            </button>
          </header>
          <div className="space-y-3">
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center rounded-3xl bg-white p-8 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">Đang tải giao dịch...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center rounded-3xl bg-white p-8 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">Chưa có giao dịch nào</p>
              </div>
            ) : (
              transactions.map((transaction) => {
                const categoryInfo = getCategoryInfo(transaction.category_id)
                const IconComponent = categoryInfo.icon
                const isIncome = transaction.type === 'Thu'
                
                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between rounded-3xl p-4 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 transition-all ${
                      isIncome
                        ? 'bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-white border-l-4 border-emerald-500'
                        : 'bg-gradient-to-r from-rose-50 via-rose-50/80 to-white border-l-4 border-rose-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg shadow-md transition-transform hover:scale-110 ${
                          isIncome
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                            : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'
                        }`}
                      >
                        {IconComponent ? (
                          <IconComponent className="h-6 w-6" />
                        ) : (
                          <RiAddLine className="h-6 w-6" />
                        )}
                      </span>
                      <div>
                        <p className={`font-semibold ${
                          isIncome ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {transaction.description || 'Không có mô tả'}
                        </p>
                        <div className={`flex items-center gap-2 text-xs ${
                          isIncome ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          <RiCalendarLine className="h-3.5 w-3.5" />
                          {new Date(transaction.transaction_date).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                          {transaction.created_at && (
                            <>
                              {' '}
                              {new Date(transaction.created_at).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                          <span>• {categoryInfo.name}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-base font-bold ${
                        isIncome ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-[0_22px_60px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Kế hoạch hôm nay
              </p>
              <p className="text-sm text-slate-500">
                Đóng tiền bảo hiểm sức khoẻ và kiểm tra lại hạn mức ăn uống.
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-xl text-slate-600 shadow-[0_12px_28px_rgba(15,40,80,0.12)]">
              <RiHandCoinLine />
            </span>
          </div>
        </section>
        </div>
      </main>

      <FooterNav onAddClick={handleAddClick} />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
      />

      <QuickActionsSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        actions={quickActionsSettings}
        onUpdate={handleUpdateQuickActions}
      />
    </div>
  )
}

export default DashboardPage

