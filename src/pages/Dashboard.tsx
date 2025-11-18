import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDataPreloader } from '../hooks/useDataPreloader'
import { FaPlus, FaCalendar, FaExchangeAlt, FaHandHoldingHeart, FaPaperPlane, FaCog, FaFolder, FaChevronLeft, FaChevronRight, FaReceipt, FaArrowRight, FaClock } from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { QuickActionsSettings } from '../components/quickActions/QuickActionsSettings'
import { IncomeExpenseOverview } from '../components/charts/IncomeExpenseOverview'
import { TransactionActionModal } from '../components/transactions/TransactionActionModal'
import { TransactionCard } from '../components/transactions/TransactionCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { WelcomeModal } from '../components/ui/WelcomeModal'
import { LoadingRing } from '../components/ui/LoadingRing'
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
import { useSystemSettings } from '../hooks/useSystemSettings'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

// Component for Quick Action Button with image support
const QuickActionButton = ({ 
  action, 
  Icon, 
  onNavigate 
}: { 
  action: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; image?: string; color: string; bgColor: string; textColor: string }
  Icon: React.ComponentType<{ className?: string }>
  onNavigate: (id: string) => void
}) => {
  const [imageError, setImageError] = useState(false)
  
  return (
    <button
      type="button"
      onClick={() => onNavigate(action.id)}
      className="group relative flex flex-col items-center gap-2.5 rounded-2xl bg-white p-3 text-center transition-all hover:scale-105 hover:shadow-lg active:scale-95 sm:p-4"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} text-white shadow-md transition-all group-hover:scale-110 group-hover:shadow-xl sm:h-16 sm:w-16 overflow-hidden`}
      >
        {action.image && !imageError ? (
          <img
            src={action.image}
            alt={action.label}
            className="h-full w-full object-contain scale-120"
            onError={() => setImageError(true)}
          />
        ) : (
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
        )}
      </span>
      <span className={`text-[10px] font-semibold leading-tight ${action.textColor} sm:text-xs`}>
        {action.label}
      </span>
      <div className={`absolute inset-0 rounded-2xl ${action.bgColor} opacity-0 transition-opacity group-hover:opacity-20 -z-10`} />
    </button>
  )
}

const ALL_QUICK_ACTIONS = [
  { 
    id: 'send-money',
    label: 'Chi tiền', 
    icon: FaPaperPlane,
    image: '/images/quick-actions/bofin-giftmoney.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  { 
    id: 'add-transaction',
    label: 'Thêm thu/chi', 
    icon: FaPlus,
    image: '/images/quick-actions/add-transaction.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  { 
    id: 'categories',
    label: 'Hạng mục', 
    icon: FaFolder,
    image: '/images/quick-actions/categories.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
  },
  { 
    id: 'split-bill',
    label: 'Chia khoản', 
    icon: FaExchangeAlt,
    image: '/images/quick-actions/split-bill.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  { 
    id: 'reminder',
    label: 'Nhắc thu/chi', 
    icon: FaHandHoldingHeart,
    image: '/images/quick-actions/reminder.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  { 
    id: 'settings',
    label: 'Cài đặt', 
    icon: FaCog,
    image: '/images/quick-actions/settings.png', // Thêm link ảnh ở đây (tùy chọn)
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
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // Default to today
  const [selectedDateReminders, setSelectedDateReminders] = useState<ReminderRecord[]>([])
  const [isLoadingDateData, setIsLoadingDateData] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [isReloading, setIsReloading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
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
          // Mặc định: chỉ 4 chức năng đầu tiên (không bao gồm settings)
          enabled: parsed[action.id] ?? (index < 4 && action.id !== 'settings'),
        }))
      }
    } catch (error) {
      console.error('Error loading quick actions settings:', error)
    }
    // Mặc định: chỉ 4 chức năng đầu tiên (Settings là chức năng thứ 5, mặc định tắt)
    return ALL_QUICK_ACTIONS.map((action, index) => ({
      id: action.id,
      label: action.label,
      enabled: index < 4 && action.id !== 'settings',
    }))
  }

  const [quickActionsSettings, setQuickActionsSettings] = useState(getStoredActions)

  // Load quick action images from settings
  const quickActionImageKeys = [
    'quick_action_send_money',
    'quick_action_add_transaction',
    'quick_action_categories',
    'quick_action_split_bill',
    'quick_action_reminder',
    'quick_action_settings',
  ]
  const { settings: quickActionImages } = useSystemSettings(quickActionImageKeys)

  // Map quick action IDs to setting keys
  const quickActionImageMap: Record<string, string> = {
    'send-money': 'quick_action_send_money',
    'add-transaction': 'quick_action_add_transaction',
    'categories': 'quick_action_categories',
    'split-bill': 'quick_action_split_bill',
    'reminder': 'quick_action_reminder',
    'settings': 'quick_action_settings',
  }

  // Merge ALL_QUICK_ACTIONS with settings images
  const quickActionsWithSettings = ALL_QUICK_ACTIONS.map((action) => {
    const imageKey = quickActionImageMap[action.id]
    const imageFromSettings = imageKey ? quickActionImages[imageKey] : null
    return {
      ...action,
      image: imageFromSettings || action.image, // Use setting image if available, otherwise use default
    }
  })

  // Get enabled quick actions (exclude settings)
  const enabledQuickActions = quickActionsWithSettings.filter((action) => {
    if (action.id === 'settings') return false // Loại bỏ tiện ích cài đặt
    const setting = quickActionsSettings.find((s) => s.id === action.id)
    return setting?.enabled ?? false
  })

  // Handle update quick actions settings
  const handleUpdateQuickActions = (updatedActions: typeof quickActionsSettings) => {
    // updatedActions đã được filter settings từ modal, chỉ cần lưu lại
    // Đảm bảo không có quá 4 tiện ích được bật
    const enabledCount = updatedActions.filter((a) => a.enabled).length
    if (enabledCount > 4) {
      // Nếu có lỗi, giới hạn lại
      const limitedActions = updatedActions.map((action, index) => ({
        ...action,
        enabled: action.enabled && index < 4
      }))
      setQuickActionsSettings(limitedActions)
    } else {
      setQuickActionsSettings(updatedActions)
    }
    
    // Save to localStorage (không lưu settings vì đã được filter)
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


  // Load profile - force refresh on mount, then use cache
  useEffect(() => {
    let mounted = true
    let retryCount = 0
    const maxRetries = 3

    const loadProfile = async (forceRefresh = false) => {
      if (mounted) {
        setIsLoadingProfile(true)
      }
      try {
        const profileData = await getCurrentProfile(forceRefresh)
        if (mounted) {
          setProfile(profileData)
          setIsLoadingProfile(false)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        
        // Retry logic for transient errors
        if (retryCount < maxRetries && mounted) {
          retryCount++
          const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
          setTimeout(() => {
            if (mounted) {
              loadProfile(true) // Force refresh on retry
            }
          }, delay)
        } else if (mounted) {
          // If all retries failed, set to null to show default
          setProfile(null)
          setIsLoadingProfile(false)
        }
      }
    }

    // Force refresh on mount to ensure fresh data
    loadProfile(true)

    return () => {
      mounted = false
    }
  }, []) // Only run on mount

  // Also reload profile when location changes (user navigates back)
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true)
      try {
        const profileData = await getCurrentProfile(false) // Use cache if available
        setProfile(profileData)
        setIsLoadingProfile(false)
      } catch (error) {
        console.error('Error loading profile on navigation:', error)
        setIsLoadingProfile(false)
      }
    }
    loadProfile()
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
    // Trigger refresh for NetAssetsCard
    setRefreshTrigger(prev => prev + 1)
    
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

  // Handle reload - clear all cache, reset state and reload all data
  const handleReload = async () => {
    setIsReloading(true)
    // Trigger refresh for NetAssetsCard
    setRefreshTrigger(prev => prev + 1)
    try {
      // Clear toàn bộ cache và reset trạng thái
      const { clearAllCacheAndState } = await import('../utils/reloadData')
      await clearAllCacheAndState()

      // Reload all data
      const loadData = async () => {
        try {
          setIsLoadingTransactions(true)
          const [transactionsData, categoriesData, walletsData, remindersData, profileData] = await Promise.all([
            fetchTransactions({ limit: 5 }),
            fetchCategories(),
            fetchWallets(false),
            fetchReminders({ is_active: true }),
            getCurrentProfile(true), // Force refresh on reload
          ])

          // Load icons for categories
          const iconsMap: Record<string, React.ReactNode> = {}
          await Promise.all(
            categoriesData.map(async (category) => {
              try {
                const iconNode = await getIconNode(category.icon_id)
                if (iconNode) {
                  iconsMap[category.id] = <span className="h-14 w-14 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span>
                } else {
                  const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                  if (hardcodedIcon?.icon) {
                    const IconComponent = hardcodedIcon.icon
                    iconsMap[category.id] = <IconComponent className="h-14 w-14" />
                  }
                }
              } catch (error) {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-14 w-14" />
                }
              }
            })
          )
          setCategoryIcons(iconsMap)

          // Sort transactions
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
          setTransactions(sortedTransactions)
          setCategories(categoriesData)
          setWallets(walletsData)
          setProfile(profileData)

          // Reload notification count
          await loadNotificationCount()

          // Reload date data
          const dateStr = formatDateToString(selectedDate)
          const dateReminders = remindersData.filter((r) => r.reminder_date === dateStr && !r.completed_at)
          setSelectedDateReminders(dateReminders)

          success('Đã làm mới dữ liệu thành công!')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error('Error reloading data:', errorMessage, error)
          showError('Không thể tải lại dữ liệu. Vui lòng thử lại.')
        } finally {
          setIsLoadingTransactions(false)
        }
      }

      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error reloading data:', errorMessage, error)
      showError('Không thể làm mới dữ liệu. Vui lòng thử lại.')
    } finally {
      setIsReloading(false)
    }
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
          (r) => r.reminder_date === dateStr && !r.completed_at
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
        onReload={handleReload}
        isReloading={isReloading}
        isLoadingProfile={isLoadingProfile}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pt-2 pb-4 sm:pt-2 sm:pb-4">
          {/* Tài sản ròng - Tổng quan tài chính */}
          <NetAssetsCard refreshTrigger={refreshTrigger} />

          {/* Wallet Card Carousel - Đã ẩn */}
          {/* <WalletCarousel onWalletChange={handleWalletChange} onAddWallet={handleAddWallet} /> */}

        {/* Income Expense Overview - Sử dụng ví mặc định */}
        <IncomeExpenseOverview walletId={defaultWalletId || undefined} />

        {/* Date Navigation and Plan Section */}
        <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100">
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
            <div className="py-8 flex items-center justify-center">
              <LoadingRing size="md" />
            </div>
          ) : selectedDateReminders.length === 0 ? (
            <div className="py-0 text-center">
              <img 
                src="/bofin-calender.png" 
                alt="Calendar" 
                className="mx-auto h-64 w-64 object-contain opacity-60"
              />
              <p className="mt-3 mb-3 text-sm font-medium text-slate-400">
                Chưa có kế hoạch, ghi chú, thu chi
              </p>
              <button
                type="button"
                onClick={() => navigate('/reminders')}
                className="rounded-xl bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        {categoryInfo.icon ? (
                          <span>{categoryInfo.icon}</span>
                        ) : (
                          <FaCalendar className="h-5 w-5 text-slate-400" />
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Tiện ích khác</h3>
              <p className="mt-1 text-xs text-slate-500">Truy cập nhanh các tiện ích thường dùng</p>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
            >
              <FaCog className="h-3.5 w-3.5" />
              <span>Cài đặt</span>
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
                <QuickActionButton
                  key={action.id}
                  action={action}
                  Icon={Icon}
                  onNavigate={(id) => {
                    if (id === 'add-transaction') {
                      navigate('/add-transaction')
                    } else if (id === 'settings') {
                      setIsSettingsOpen(true)
                    } else if (id === 'categories') {
                      navigate('/categories')
                    } else if (id === 'reminder') {
                      navigate('/reminders')
                    }
                    // Các chức năng khác sẽ được implement sau
                  }}
                />
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
                  <FaClock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Giao dịch gần đây</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lịch sử thu chi mới nhất</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/transactions')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-lg active:scale-95"
            >
              <span>Xem thêm</span>
              <FaArrowRight className="h-3.5 w-3.5" />
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
                const walletColor = getWalletColor(transaction.wallet_id)
                
                // Format date with relative time (Hôm nay, Hôm qua, etc.)
                const formatTransactionDate = (date: Date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)
                  
                  const transactionDay = new Date(date)
                  transactionDay.setHours(0, 0, 0, 0)
                  
                  if (transactionDay.getTime() === today.getTime()) {
                    return 'Hôm nay'
                  } else if (transactionDay.getTime() === yesterday.getTime()) {
                    return 'Hôm qua'
                  } else {
                    return date.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  }
                }
                
                return (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    categoryInfo={categoryInfo}
                    walletInfo={{
                      name: getWalletName(transaction.wallet_id),
                      color: walletColor,
                    }}
                    onLongPressStart={handleLongPressStart}
                    onLongPressEnd={handleLongPressEnd}
                    onLongPressCancel={handleLongPressCancel}
                    formatCurrency={formatCurrency}
                    formatDate={formatTransactionDate}
                  />
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
        actions={quickActionsSettings.filter((action) => action.id !== 'settings')}
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

