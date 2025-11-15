import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDataPreloader } from '../hooks/useDataPreloader'
import { FaPlus, FaCalendar, FaExchangeAlt, FaHandHoldingHeart, FaPaperPlane, FaCog, FaWallet, FaFolder, FaChevronLeft, FaChevronRight, FaReceipt } from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { QuickActionsSettings } from '../components/quickActions/QuickActionsSettings'
import { IncomeExpenseOverview } from '../components/charts/IncomeExpenseOverview'
import { TransactionActionModal } from '../components/transactions/TransactionActionModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { WelcomeModal } from '../components/ui/WelcomeModal'
// import { WalletCarousel } from '../components/wallets/WalletCarousel'
import { TransactionListSkeleton } from '../components/skeletons'
import { NetAssetsCard } from '../components/dashboard/NetAssetsCard'
import { getAllNotifications } from '../lib/notificationService'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNode } from '../utils/iconLoader'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, deleteTransaction, type TransactionRecord } from '../lib/transactionService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { getDefaultWallet, setDefaultWallet } from '../lib/walletService'
import { getCurrentProfile, type ProfileRecord } from '../lib/profileService'
import { fetchReminders, type ReminderRecord } from '../lib/reminderService'
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
    icon: FaPaperPlane,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  { 
    id: 'add-transaction',
    label: 'Thêm thu/chi', 
    icon: FaPlus,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  { 
    id: 'categories',
    label: 'Hạng mục', 
    icon: FaFolder,
    color: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
  },
  { 
    id: 'split-bill',
    label: 'Chia khoản', 
    icon: FaExchangeAlt,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  { 
    id: 'reminder',
    label: 'Nhắc thu/chi', 
    icon: FaHandHoldingHeart,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  { 
    id: 'settings',
    label: 'Cài đặt', 
    icon: FaCog,
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
  useDataPreloader() // Preload data khi vào dashboard
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // const [selectedWallet, setSelectedWallet] = useState<WalletRecord | null>(null) // Reserved for future use
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
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
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // Default to today
  const [selectedDateReminders, setSelectedDateReminders] = useState<ReminderRecord[]>([])
  const [isLoadingDateData, setIsLoadingDateData] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  
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
    navigate('/add-transaction')
  }


  // const handleWalletChange = (wallet: WalletRecord) => {
  //   setSelectedWallet(wallet)
  //   // Chỉ cập nhật state để hiển thị, không lưu làm ví mặc định
  //   // Ví mặc định chỉ được lưu khi người dùng chủ động chọn từ trang Wallets
  // }


  // Load default wallet on mount
  useEffect(() => {
    const loadDefaultWallet = async () => {
      try {
        const savedDefaultWalletId = await getDefaultWallet()
        if (savedDefaultWalletId) {
          setDefaultWalletId(savedDefaultWalletId)
          saveDefaultWalletId(savedDefaultWalletId) // Đồng bộ với localStorage
          // WalletCarousel sẽ tự động chọn ví mặc định khi load
          // và gọi handleWalletChange để set selectedWallet
        } else {
          // Kiểm tra localStorage fallback
          const localDefaultWalletId = getDefaultWalletId()
          if (localDefaultWalletId) {
            // Kiểm tra xem ví này có còn tồn tại không
            const wallets = await fetchWallets(false)
            const walletExists = wallets.some(w => w.id === localDefaultWalletId)
            if (walletExists) {
              setDefaultWalletId(localDefaultWalletId)
              // Đồng bộ lại với database
              try {
                await setDefaultWallet(localDefaultWalletId)
              } catch (error) {
                console.error('Error syncing default wallet to database:', error)
              }
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading default wallet:', errorMessage, error)
        // Fallback về localStorage
        const savedDefaultWalletId = getDefaultWalletId()
        if (savedDefaultWalletId) {
          setDefaultWalletId(savedDefaultWalletId)
        }
      }
    }
    loadDefaultWallet()
  }, [])


  // Load profile - sử dụng cache, chỉ reload khi cần
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
    // Chỉ reload khi location.key thay đổi (navigate từ trang khác về)
  }, [location.key])

  // Check for welcome modal flag from login
  // WelcomeModal is disabled for now
  // useEffect(() => {
  //   // Use a small delay to ensure sessionStorage is set before checking
  //   const checkWelcomeModal = () => {
  //     const shouldShowWelcome = sessionStorage.getItem('showWelcomeModal')
  //     if (shouldShowWelcome === 'true') {
  //       // Clear the flag immediately so it doesn't show again
  //       sessionStorage.removeItem('showWelcomeModal')
  //       // Show modal after a short delay to ensure page is loaded
  //       setShowWelcomeModal(true)
  //     }
  //   }
  //   
  //   // Check immediately
  //   checkWelcomeModal()
  //   
  //   // Also check after a short delay to handle any race conditions
  //   const timer = setTimeout(checkWelcomeModal, 200)
  //   
  //   return () => clearTimeout(timer)
  // }, [location.key]) // Re-run when location changes (navigation)

  // const handleAddWallet = () => {
  //   navigate('/wallets')
  // }

  // Load transactions and categories - chỉ load khi cần thiết, sử dụng cache
  // Nếu đã preload, dữ liệu sẽ được lấy từ cache ngay lập tức
  // Chỉ load lại khi location.key thay đổi (navigate từ trang khác về)
  useEffect(() => {
    loadNotificationCount()
  }, [])

  // Refresh notification count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotificationCount()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const loadNotificationCount = async () => {
    try {
      const notifications = await getAllNotifications()
      const unread = notifications.filter((notif) => notif.status === 'unread').length
      setUnreadNotificationCount(unread)
    } catch (error) {
      console.error('Error loading notification count:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingTransactions(true)
      try {
        // Sử dụng cache - nếu đã preload, sẽ lấy từ cache ngay lập tức
        // Chỉ fetch khi cache hết hạn hoặc chưa có
        const [transactionsData, categoriesData, walletsData] = await Promise.all([
          fetchTransactions({ limit: 5 }),
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
                // Clone the node and wrap it to apply className
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
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading transactions:', errorMessage, error)
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    // Chỉ load lại khi location.key thay đổi (navigate từ trang khác về)
    // Không load lại khi chỉ re-render hoặc khi component re-mount
    // Nếu đã có cache, sẽ không fetch lại
    loadData()
  }, []) // Chỉ load một lần khi mount, cache sẽ được sử dụng

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
    if (selectedTransaction) {
      navigate(`/add-transaction?id=${selectedTransaction.id}`)
    }
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

  // Format date to YYYY-MM-DD (avoid timezone issues)
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Load reminders for selected date
  useEffect(() => {
    let isCancelled = false
    
    const loadDateData = async () => {
      setIsLoadingDateData(true)
      try {
        const dateStr = formatDateToString(selectedDate)
        
        // Fetch reminders for selected date
        const allReminders = await fetchReminders({ is_active: true })
        if (isCancelled) return
        
        const dateReminders = allReminders.filter(
          (r) => r.reminder_date === dateStr && r.status === 'pending'
        )
        setSelectedDateReminders(dateReminders)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading date data:', errorMessage, error)
      } finally {
        if (!isCancelled) {
          setIsLoadingDateData(false)
        }
      }
    }
    
    loadDateData()
    
    return () => {
      isCancelled = true
    }
  }, [selectedDate])

  // Auto-update to today when date changes (check every minute)
  // Use ref to track if we're viewing today to avoid infinite loops
  const isViewingTodayRef = useRef(true)
  const selectedDateRef = useRef(selectedDate)
  
  // Update refs when selectedDate changes
  useEffect(() => {
    selectedDateRef.current = selectedDate
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    isViewingTodayRef.current = selected.getTime() === today.getTime()
  }, [selectedDate])

  useEffect(() => {
    const checkDateChange = () => {
      // Only check if we're currently viewing today
      if (!isViewingTodayRef.current) {
        return
      }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayStr = formatDateToString(today)
      
      // Get last checked date from localStorage
      const lastChecked = localStorage.getItem('lastDateCheck')
      const lastCheckedStr = lastChecked ? formatDateToString(new Date(lastChecked)) : null
      
      // Only update if date actually changed and we're still viewing today
      if (lastCheckedStr !== todayStr && isViewingTodayRef.current) {
        // Date changed, update to new today
        const newToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        setSelectedDate(newToday)
        localStorage.setItem('lastDateCheck', now.toISOString())
        isViewingTodayRef.current = true
      }
    }
    
    // Don't check immediately, wait a bit to avoid initial loop
    const initialTimeout = setTimeout(() => {
      checkDateChange()
    }, 2000)
    
    // Then check every minute
    const interval = setInterval(checkDateChange, 60000) // Check every minute
    
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, []) // Empty dependency array - only run once on mount

  // Format date for display
  const formatSelectedDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const selected = new Date(date)
    selected.setHours(0, 0, 0, 0)
    
    if (selected.getTime() === today.getTime()) {
      return 'Hôm nay'
    } else if (selected.getTime() === yesterday.getTime()) {
      return 'Hôm qua'
    } else if (selected.getTime() === tomorrow.getTime()) {
      return 'Ngày mai'
    } else {
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    }
  }

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date())
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
        unreadNotificationCount={unreadNotificationCount}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
          {/* Tài sản ròng - Tổng quan tài chính */}
          <NetAssetsCard />

          {/* Wallet Card Carousel - Đã ẩn */}
          {/* <WalletCarousel onWalletChange={handleWalletChange} onAddWallet={handleAddWallet} /> */}

        {/* Income Expense Overview - Sử dụng ví mặc định */}
        <IncomeExpenseOverview walletId={defaultWalletId || undefined} />

        {/* Date Navigation and Plan Section */}
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-lg ring-1 ring-amber-100">
          {/* Date Navigation Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousDay}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              <FaChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex-1 text-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Kế hoạch {formatSelectedDate(selectedDate)}
              </h3>
              <div className="mt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                >
                  Hôm nay
                </button>
                <p className="text-xs text-slate-500">
                  {selectedDateReminders.length} sự kiện
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={goToNextDay}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              <FaChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Reminders List */}
          {isLoadingDateData ? (
            <div className="py-4 text-center text-sm text-slate-500">Đang tải...</div>
          ) : selectedDateReminders.length === 0 ? (
            <div className="py-8 text-center">
              <FaCalendar className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                Không có kế hoạch
              </p>
              <button
                type="button"
                onClick={() => navigate('/reminders')}
                className="mt-3 rounded-lg bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
              >
                Tạo nhắc nhở
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateReminders.map((reminder) => {
                const categoryInfo = getCategoryInfo(reminder.category_id || '')
                const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
                const isIncome = reminder.type === 'Thu'
                const reminderColor = reminder.color || (isNote ? 'amber' : isIncome ? 'emerald' : 'rose')
                const colorClasses: Record<string, { bg: string; icon: string }> = {
                  amber: { bg: 'bg-amber-500', icon: 'bg-amber-500' },
                  emerald: { bg: 'bg-emerald-500', icon: 'bg-emerald-500' },
                  rose: { bg: 'bg-rose-500', icon: 'bg-rose-500' },
                  sky: { bg: 'bg-sky-500', icon: 'bg-sky-500' },
                  blue: { bg: 'bg-blue-500', icon: 'bg-blue-500' },
                  purple: { bg: 'bg-purple-500', icon: 'bg-purple-500' },
                  indigo: { bg: 'bg-indigo-500', icon: 'bg-indigo-500' },
                  pink: { bg: 'bg-pink-500', icon: 'bg-pink-500' },
                  orange: { bg: 'bg-orange-500', icon: 'bg-orange-500' },
                  teal: { bg: 'bg-teal-500', icon: 'bg-teal-500' },
                }
                const colorClass = colorClasses[reminderColor] || colorClasses.amber
                
                return (
                  <div
                    key={reminder.id}
                    onClick={() => navigate('/reminders')}
                    className={`rounded-2xl p-3 cursor-pointer transition hover:shadow-md ${colorClass.bg} bg-opacity-10`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass.icon} text-white`}
                      >
                        {categoryInfo.icon ? (
                          <span className="text-white">{categoryInfo.icon}</span>
                        ) : (
                          <FaCalendar className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 text-sm truncate">
                            {reminder.title}
                          </h4>
                          {isNote && (
                            <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Ghi chú
                            </span>
                          )}
                        </div>
                        {reminder.amount && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {formatCurrency(reminder.amount)}
                          </p>
                        )}
                        {reminder.reminder_time && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {reminder.reminder_time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* View All Button */}
          {selectedDateReminders.length > 0 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate('/reminders')}
                className="text-xs font-semibold text-amber-600 transition hover:text-amber-700 hover:underline"
              >
                Xem tất cả
              </button>
            </div>
          )}
        </section>

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
            enabledQuickActions.length === 5 ? 'grid-cols-5' :
            'grid-cols-6'
          }`}>
            {enabledQuickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    if (action.id === 'add-transaction') {
                      navigate('/add-transaction')
                    } else if (action.id === 'settings') {
                      setIsSettingsOpen(true)
                    } else if (action.id === 'categories') {
                      navigate('/categories')
                    } else if (action.id === 'reminder') {
                      navigate('/reminders')
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
              <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-8 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
                <div className="mb-3 rounded-full bg-slate-100 p-3">
                  <FaReceipt className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Chưa có giao dịch nào</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((transaction) => {
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
              })
            )}
          </div>
        </section>

        </div>
      </main>

      <FooterNav onAddClick={handleAddClick} />


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


      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
    </div>
  )
}

export default DashboardPage

