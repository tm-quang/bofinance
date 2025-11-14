import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RiAddLine, RiCalendarLine, RiExchangeDollarLine, RiHandCoinLine, RiHandHeartLine, RiSendPlaneFill, RiSettings3Line, RiWallet3Line } from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { QuickActionsSettings } from '../components/quickActions/QuickActionsSettings'
import { TransactionChart } from '../components/charts/TransactionChart'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { TransactionActionModal } from '../components/transactions/TransactionActionModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { WelcomeModal } from '../components/ui/WelcomeModal'
import { WalletCarousel } from '../components/wallets/WalletCarousel'
import { TransactionListSkeleton } from '../components/skeletons'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, deleteTransaction, type TransactionRecord } from '../lib/transactionService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { getDefaultWallet, setDefaultWallet } from '../lib/walletService'
import { getCurrentProfile, type ProfileRecord } from '../lib/profileService'
import { useNotification } from '../contexts/notificationContext.helpers'

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
const DEFAULT_WALLET_KEY = 'bofin_default_wallet_id'

// Utility functions for default wallet
const getDefaultWalletId = (): string | null => {
  try {
    return localStorage.getItem(DEFAULT_WALLET_KEY)
  } catch {
    return null
  }
}

const saveDefaultWalletId = (walletId: string): void => {
  try {
    localStorage.setItem(DEFAULT_WALLET_KEY, walletId)
  } catch (error) {
    console.error('Error saving default wallet:', error)
  }
}

export const DashboardPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { success, error: showError } = useNotification()
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<WalletRecord | null>(null)
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
  const [showDefaultWalletModal, setShowDefaultWalletModal] = useState(false)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  
  // Long press handler refs
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTargetRef = useRef<TransactionRecord | null>(null)

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
    // Chỉ cập nhật state để hiển thị, không lưu làm ví mặc định
    // Ví mặc định chỉ được lưu khi người dùng chủ động chọn từ trang Wallets
  }

  const handleConfirmDefaultWallet = async () => {
    if (selectedWallet) {
      try {
        // Lưu vào database
        await setDefaultWallet(selectedWallet.id)
        setDefaultWalletId(selectedWallet.id) // Lưu vào state
        saveDefaultWalletId(selectedWallet.id) // Lưu vào localStorage để fallback
        setShowDefaultWalletModal(false)
      } catch (error) {
        console.error('Error setting default wallet:', error)
        // Vẫn lưu vào localStorage để fallback
        setDefaultWalletId(selectedWallet.id)
        saveDefaultWalletId(selectedWallet.id)
        setShowDefaultWalletModal(false)
      }
    }
  }

  // Load default wallet on mount
  useEffect(() => {
    const loadDefaultWallet = async () => {
      try {
        const savedDefaultWalletId = await getDefaultWallet()
        if (savedDefaultWalletId) {
          setDefaultWalletId(savedDefaultWalletId)
          // WalletCarousel sẽ tự động chọn ví mặc định khi load
          // và gọi handleWalletChange để set selectedWallet
        } else {
          // Nếu chưa có ví mặc định, hiển thị modal yêu cầu chọn sau khi wallets đã load
          // Modal sẽ được hiển thị khi selectedWallet được set
        }
      } catch (error) {
        console.error('Error loading default wallet:', error)
        // Fallback về localStorage
        const savedDefaultWalletId = getDefaultWalletId()
        if (savedDefaultWalletId) {
          setDefaultWalletId(savedDefaultWalletId)
        }
      }
    }
    loadDefaultWallet()
  }, [])

  // Hiển thị modal nếu chưa có ví mặc định và đã có ví được chọn
  useEffect(() => {
    if (!defaultWalletId && selectedWallet && !showDefaultWalletModal) {
      // Đợi một chút để đảm bảo UI đã render
      const timer = setTimeout(() => {
        setShowDefaultWalletModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [defaultWalletId, selectedWallet, showDefaultWalletModal])

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await getCurrentProfile()
        setProfile(profileData)
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }
    loadProfile()
  }, [location.key]) // Reload when navigating back to dashboard

  // Check for welcome modal flag from login
  useEffect(() => {
    // Use a small delay to ensure sessionStorage is set before checking
    const checkWelcomeModal = () => {
      const shouldShowWelcome = sessionStorage.getItem('showWelcomeModal')
      if (shouldShowWelcome === 'true') {
        // Clear the flag immediately so it doesn't show again
        sessionStorage.removeItem('showWelcomeModal')
        // Show modal after a short delay to ensure page is loaded
        setShowWelcomeModal(true)
      }
    }
    
    // Check immediately
    checkWelcomeModal()
    
    // Also check after a short delay to handle any race conditions
    const timer = setTimeout(checkWelcomeModal, 200)
    
    return () => clearTimeout(timer)
  }, [location.key]) // Re-run when location changes (navigation)

  const handleAddWallet = () => {
    navigate('/wallets')
  }

  // Load transactions and categories
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingTransactions(true)
      try {
        const [transactionsData, categoriesData, walletsData] = await Promise.all([
          fetchTransactions({ limit: 5 }),
          fetchCategories(),
          fetchWallets(),
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
        setWallets(walletsData)
      } catch (error) {
        console.error('Error loading transactions:', error)
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    loadData()
  }, [])

  // Reload transactions when a new transaction is added/updated/deleted
  const handleTransactionSuccess = () => {
    const loadTransactions = async () => {
      try {
        // Đợi một chút để đảm bảo wallet balance đã được sync
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const transactionsData = await fetchTransactions({ limit: 5 })
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

  // Long press handlers
  const handleLongPressStart = (transaction: TransactionRecord) => {
    // Clear any existing timer
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar 
        userName={profile?.full_name || 'Người dùng'} 
        avatarUrl={profile?.avatar_url || undefined}
        badgeColor="bg-sky-500" 
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
          {/* Wallet Card Carousel */}
          <WalletCarousel onWalletChange={handleWalletChange} onAddWallet={handleAddWallet} />

        {/* Transaction Chart - Sử dụng ví mặc định */}
        <TransactionChart walletId={defaultWalletId || undefined} />

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
              onClick={() => navigate('/transactions')}
              className="text-sm font-semibold text-sky-500 transition hover:text-sky-600 hover:underline"
            >
              Xem thêm
            </button>
          </header>
          <div className="space-y-3">
            {isLoadingTransactions ? (
              <TransactionListSkeleton count={5} />
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center rounded-3xl bg-white p-8 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">Chưa có giao dịch nào</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((transaction) => {
                const categoryInfo = getCategoryInfo(transaction.category_id)
                const IconComponent = categoryInfo.icon
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
                    className={`relative flex gap-2.5 rounded-2xl p-2.5 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 transition-all select-none ${
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
                      {IconComponent ? (
                        <IconComponent className="h-5 w-5" />
                      ) : (
                        <RiAddLine className="h-5 w-5" />
                      )}
                    </span>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                      {/* Left side: Description, Date, Category */}
                      <div className="flex-1 min-w-0">
                        {/* Description */}
                        <p className={`truncate text-sm font-semibold mb-1 ${
                          isIncome ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {transaction.description || 'Không có mô tả'}
                        </p>
                        
                        {/* Date and Category - Compact */}
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`flex items-center gap-1 shrink-0 ${
                            isIncome ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            <RiCalendarLine className="h-3 w-3" />
                            <span className="whitespace-nowrap">
                              {new Date(transaction.transaction_date).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <span className="text-slate-400">•</span>
                          <span className={`font-medium truncate ${
                            isIncome ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {categoryInfo.name}
                          </span>
                        </div>
                      </div>
                      
                      {/* Right side: Amount and Wallet */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {/* Amount - Top Right */}
                        <span className={`text-base font-bold ${
                          isIncome ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {isIncome ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                        {/* Wallet - Bottom Right */}
                        {(() => {
                          const walletColor = getWalletColor(transaction.wallet_id)
                          return (
                            <div className={`flex items-center gap-1 rounded-full ${walletColor.bg} px-2 py-0.5`}>
                              <RiWallet3Line className={`h-3 w-3 ${walletColor.icon}`} />
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

      <QuickActionsSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        actions={quickActionsSettings}
        onUpdate={handleUpdateQuickActions}
      />

      {/* Modal yêu cầu chọn ví mặc định */}
      {showDefaultWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Chọn ví mặc định
            </h2>
            <p className="mb-6 text-sm text-slate-600">
              Vui lòng chọn một ví làm ví mặc định để tính toán luồng tiền Thu và Chi. Bạn có thể thay đổi ví mặc định bất cứ lúc nào.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDefaultWallet}
                disabled={!selectedWallet}
                className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận
              </button>
              <button
                onClick={() => navigate('/wallets')}
                className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Thêm ví mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
    </div>
  )
}

export default DashboardPage

