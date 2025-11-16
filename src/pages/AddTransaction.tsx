import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FaCalendar, FaImage, FaWallet, FaArrowDown, FaArrowUp, FaChevronDown, FaTimes, FaClock, FaStar, FaEdit, FaPlus, FaChevronRight, FaChevronUp } from 'react-icons/fa'

import HeaderBar from '../components/layout/HeaderBar'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { CustomSelect } from '../components/ui/CustomSelect'
import { getIconNode } from '../utils/iconLoader'
import { NumberPadModal } from '../components/ui/NumberPadModal'
import { CategoryPickerModal } from '../components/categories/CategoryPickerModal'
import { FavoriteCategoriesModal } from '../components/categories/FavoriteCategoriesModal'
import { DateTimePickerModal } from '../components/ui/DateTimePickerModal'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import { fetchCategories, fetchCategoriesHierarchical, type CategoryRecord, type CategoryType, type CategoryWithChildren } from '../lib/categoryService'
import { getFavoriteCategories, initializeDefaultFavorites } from '../lib/favoriteCategoriesService'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { createTransaction, updateTransaction, type TransactionType } from '../lib/transactionService'
import { fetchWallets, getDefaultWallet, getTotalBalanceWalletIds, type WalletRecord } from '../lib/walletService'
import { invalidateCache } from '../lib/cache'
import { uploadMultipleToCloudinary } from '../lib/cloudinaryService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../utils/currencyInput'
import { getSupabaseClient } from '../lib/supabaseClient'

type TransactionFormState = {
  type: TransactionType
  wallet_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
  transaction_time?: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const AddTransactionPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { success, error: showError } = useNotification()
  
  const transactionId = searchParams.get('id')
  const defaultType = (searchParams.get('type') as TransactionType) || 'Chi'
  const isEditMode = !!transactionId
  
  const [formState, setFormState] = useState<TransactionFormState>({
    type: defaultType,
    wallet_id: '',
    category_id: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  })

  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [defaultWalletId, setDefaultWalletId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false)
  const [favoriteCategories, setFavoriteCategories] = useState<CategoryWithChildren[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load wallets và categories
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [walletsData, categoriesData, defaultId] = await Promise.all([
          fetchWallets(false),
          fetchCategories(),
          getDefaultWallet(),
        ])

        setWallets(walletsData)
        setCategories(categoriesData)
        
        // Get selected wallets for default wallet selection
        const walletIds = await getTotalBalanceWalletIds()
        const selectedWallets = walletsData.filter((w) => walletIds.includes(w.id))
        
        // Set default wallet ID (first wallet in selected list or default wallet)
        if (selectedWallets.length > 0) {
          setDefaultWalletId(selectedWallets[0].id)
        } else if (defaultId) {
          setDefaultWalletId(defaultId)
        } else if (walletsData.length > 0) {
          setDefaultWalletId(walletsData[0].id)
        }

        // Load icons for all categories
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNode(category.icon_id)
              if (iconNode) {
                iconsMap[category.id] = iconNode
              } else {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-4 w-4" />
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-4 w-4" />
              }
            }
          })
        )
        setCategoryIcons(iconsMap)

        // Load hierarchical categories and favorite categories
        const categoryTypeForFetch = defaultType === 'Chi' ? 'Chi tiêu' : 'Thu nhập'
        
        // Initialize default favorites for new users
        await initializeDefaultFavorites(categoryTypeForFetch)
        
        const [hierarchicalData, favoriteIdsArray] = await Promise.all([
          fetchCategoriesHierarchical(),
          getFavoriteCategories(categoryTypeForFetch),
        ])

        // Extract favorite categories (limit to 7)
        const favorites: CategoryWithChildren[] = []
        const favoriteIdsSet = new Set(favoriteIdsArray.slice(0, 7))

        // Helper to find category by ID in hierarchical structure
        const findCategoryById = (cats: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
          for (const cat of cats) {
            if (cat.id === id) return cat
            if (cat.children) {
              const found = findCategoryById(cat.children, id)
              if (found) return found
            }
          }
          return null
        }

        // Get favorite categories
        favoriteIdsSet.forEach((id) => {
          const category = findCategoryById(hierarchicalData, id)
          if (category) {
            favorites.push(category)
          }
        })

        setFavoriteCategories(favorites)

        // Load transaction if editing
        if (transactionId) {
          const { fetchTransactions } = await import('../lib/transactionService')
          const transactions = await fetchTransactions({})
          const foundTransaction = transactions.find(t => t.id === transactionId)
          if (foundTransaction) {
            // transaction_date is YYYY-MM-DD format, parse to get date only
            // Time is not stored in transaction_date, so we'll default to current time
            const now = new Date()
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

            setFormState({
              type: foundTransaction.type,
              wallet_id: foundTransaction.wallet_id,
              category_id: foundTransaction.category_id,
              amount: formatVNDInput(foundTransaction.amount.toString()),
              description: foundTransaction.description || '',
              transaction_date: foundTransaction.transaction_date.split('T')[0],
              transaction_time: currentTime,
            })
            setUploadedImageUrls(foundTransaction.image_urls || [])
          }
        } else {
          // Reset form when creating new transaction
          // For expense, use default wallet ID (will be set after wallets load)
          const initialWalletId = defaultType === 'Chi' ? '' : (defaultId || '')
          const now = new Date()
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
          
          setFormState({
            type: defaultType,
            wallet_id: initialWalletId,
            category_id: '',
            amount: '',
            description: '',
            transaction_date: now.toISOString().split('T')[0],
            transaction_time: currentTime,
          })
          setUploadedFiles([])
          setUploadedImageUrls([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [transactionId, defaultType])

  // Update default wallet when wallets change
  useEffect(() => {
    const updateDefaultWallet = async () => {
      if (wallets.length > 0) {
        try {
          // Get selected wallet IDs (from Quản lý ví settings)
          const walletIds = await getTotalBalanceWalletIds()
          const selectedWallets = wallets.filter((w) => walletIds.includes(w.id))
          
          // Update default wallet ID if not set
          if (selectedWallets.length > 0 && !defaultWalletId) {
            setDefaultWalletId(selectedWallets[0].id)
            // Auto-set wallet_id if not set
            if (!formState.wallet_id) {
              setFormState((prev) => ({ ...prev, wallet_id: selectedWallets[0].id }))
            }
          }
        } catch (error) {
          console.error('Error updating default wallet:', error)
          // Fallback: use Tiền mặt + Ngân hàng
          const netAssetsWallets = wallets.filter((w) => (w.type === 'Tiền mặt' || w.type === 'Ngân hàng') && w.is_active)
          
          // Update default wallet ID if not set
          if (netAssetsWallets.length > 0 && !defaultWalletId) {
            setDefaultWalletId(netAssetsWallets[0].id)
            // Auto-set wallet_id if not set
            if (!formState.wallet_id) {
              setFormState((prev) => ({ ...prev, wallet_id: netAssetsWallets[0].id }))
            }
          }
        }
      }
    }
    updateDefaultWallet()
  }, [wallets, defaultWalletId, formState.type, formState.wallet_id])

  // Filter categories theo type
  const filteredCategories = categories.filter((cat) => {
    const categoryType: CategoryType = cat.type === 'Chi tiêu' ? 'Chi tiêu' : 'Thu nhập'
    return formState.type === 'Chi' ? categoryType === 'Chi tiêu' : categoryType === 'Thu nhập'
  })

  // Reset category khi type thay đổi
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const currentCategory = filteredCategories.find((cat) => cat.id === formState.category_id)
      if (!currentCategory) {
        setFormState((prev) => ({ ...prev, category_id: '' }))
      }
    } else {
      setFormState((prev) => ({ ...prev, category_id: '' }))
    }
  }, [formState.type, filteredCategories.length])

  // Auto-set wallet_id when type changes (if not set)
  useEffect(() => {
    if (defaultWalletId && !formState.wallet_id) {
      setFormState((prev) => ({ ...prev, wallet_id: defaultWalletId }))
    }
  }, [formState.type, defaultWalletId, formState.wallet_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formState.wallet_id) {
      const message = 'Vui lòng chọn ví'
      setError(message)
      showError(message)
      return
    }
    if (!formState.category_id) {
      const message = 'Vui lòng chọn hạng mục'
      setError(message)
      showError(message)
      return
    }
    const amount = parseVNDInput(formState.amount)
    if (!amount || amount <= 0) {
      const message = 'Vui lòng nhập số tiền hợp lệ'
      setError(message)
      showError(message)
      return
    }
    if (!formState.transaction_date) {
      const message = 'Vui lòng chọn ngày giao dịch'
      setError(message)
      showError(message)
      return
    }

    // transaction_date only stores date (YYYY-MM-DD), time is for display only
    const finalTransactionDate = formState.transaction_date

    setIsSubmitting(true)
    try {
      // Upload images to Cloudinary if there are new files
      let imageUrls = [...uploadedImageUrls]
      if (uploadedFiles.length > 0) {
        setIsUploadingImages(true)
        try {
          const supabase = getSupabaseClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            throw new Error('Bạn cần đăng nhập để upload ảnh.')
          }

          const uploadResults = await uploadMultipleToCloudinary(uploadedFiles, {
            folder: `transactions/${user.id}`,
            transformation: {
              quality: 'auto',
              format: 'auto',
            },
          })

          const newUrls = uploadResults.map((result) => result.secure_url)
          imageUrls = [...imageUrls, ...newUrls]
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Không thể upload ảnh'
          setError(message)
          showError(message)
          setIsUploadingImages(false)
          return
        } finally {
          setIsUploadingImages(false)
        }
      }

      if (isEditMode && transactionId) {
        await updateTransaction(transactionId, {
          wallet_id: formState.wallet_id,
          category_id: formState.category_id,
          type: formState.type,
          amount,
          description: formState.description.trim() || undefined,
          transaction_date: finalTransactionDate,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })
        success(`Đã cập nhật ${formState.type === 'Thu' ? 'khoản thu' : 'khoản chi'} thành công!`)
        // Navigate back after edit
        navigate(-1)
      } else {
        await createTransaction({
          wallet_id: formState.wallet_id,
          category_id: formState.category_id,
          type: formState.type,
          amount,
          description: formState.description.trim() || undefined,
          transaction_date: finalTransactionDate,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })
        success(`Đã thêm ${formState.type === 'Thu' ? 'khoản thu' : 'khoản chi'} thành công!`)
        
        // Reset form for continuous input instead of navigating back
        const now = new Date()
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const currentTime = `${hours}:${minutes}`
        
        // Reload data (wallets, categories, favorites) to get updated balances
        // Invalidate cache first to ensure we get fresh data from database
        try {
          await invalidateCache('fetchWallets')
          await invalidateCache('getDefaultWallet')
          await invalidateCache('getTotalBalanceWalletIds')
          
          // Small delay to ensure database transaction is committed
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const [walletsData, categoriesData, defaultId] = await Promise.all([
            fetchWallets(false),
            fetchCategories(),
            getDefaultWallet(),
          ])
          
          setWallets(walletsData)
          setCategories(categoriesData)
          
          // Get selected wallets for default wallet
          const walletIds = await getTotalBalanceWalletIds()
          const selectedWallets = walletsData.filter((w) => walletIds.includes(w.id))
          
          // Determine wallet_id for reset
          let resetWalletId = ''
          // Use first wallet from selected wallets or default wallet
          resetWalletId = selectedWallets.length > 0 ? selectedWallets[0].id : (defaultId || '')
          
          // Update default wallet ID
          if (selectedWallets.length > 0) {
            setDefaultWalletId(selectedWallets[0].id)
          } else if (defaultId) {
            setDefaultWalletId(defaultId)
          }
          
          // Reload favorite categories
          const categoryTypeForReload = formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'
          const favoriteIdsArray = await getFavoriteCategories(categoryTypeForReload)
          const favoriteIdsSet = new Set(favoriteIdsArray)
          const favoriteCats = categoriesData.filter((cat) => favoriteIdsSet.has(cat.id))
          setFavoriteCategories(favoriteCats)
          
          // Reset form after data is reloaded
          setFormState((prev) => ({
            ...prev,
            amount: '',
            category_id: '',
            description: '',
            wallet_id: resetWalletId,
            transaction_date: now.toISOString().split('T')[0],
            transaction_time: currentTime,
          }))
          setUploadedFiles([])
          setUploadedImageUrls([])
        } catch (reloadError) {
          console.error('Error reloading data:', reloadError)
          // Reset form even if reload fails
          setFormState((prev) => ({
            ...prev,
            amount: '',
            category_id: '',
            description: '',
            transaction_date: now.toISOString().split('T')[0],
            transaction_time: currentTime,
          }))
          setUploadedFiles([])
          setUploadedImageUrls([])
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (isEditMode ? 'Không thể cập nhật giao dịch' : 'Không thể tạo giao dịch')
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatVNDInput(e.target.value)
    setFormState((prev) => ({ ...prev, amount: formatted }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeImageUrl = (index: number) => {
    setUploadedImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar 
        variant="page" 
        title={isEditMode ? 'SỬA GIAO DỊCH' : formState.type === 'Thu' ? 'THÊM KHOẢN THU' : 'THÊM KHOẢN CHI'}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 py-4 sm:py-6">
          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 sm:text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} id="transaction-form" className="space-y-2">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, type: 'Thu' }))}
                className={`group flex items-center justify-center gap-2 rounded-2xl border-2 py-3 px-4 text-center text-sm font-bold transition-all ${
                  formState.type === 'Thu'
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <FaArrowUp className="h-5 w-5" />
                <span>Khoản thu</span>
              </button>
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, type: 'Chi' }))}
                className={`group flex items-center justify-center gap-2 rounded-2xl border-2 py-3 px-4 text-center text-sm font-bold transition-all ${
                  formState.type === 'Chi'
                    ? 'border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50'
                }`}
              >
                <FaArrowDown className="h-5 w-5" />
                <span>Khoản chi</span>
              </button>
            </div>

            {/* Wallet Selection - For both Income and Expense */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                {formState.type === 'Chi' ? 'Chọn ví' : 'Chọn ví'} <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                options={wallets.map((wallet) => ({
                  value: wallet.id,
                  label: wallet.name,
                  metadata: formatCurrency(wallet.balance ?? 0),
                  icon: <FaWallet className="h-4 w-4" />,
                }))}
                value={formState.wallet_id}
                onChange={(value) => setFormState((prev) => ({ ...prev, wallet_id: value }))}
                placeholder={formState.type === 'Chi' ? 'Chọn ví chi ra' : 'Chọn ví'}
                loading={isLoading}
                emptyMessage="Chưa có ví"
                className="h-14"
              />
            </div>

            {/* Amount - Compact and Clean */}
            <div 
              className="rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-md border border-slate-200/50 p-4 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md"
              onClick={() => setIsNumberPadOpen(true)}
            >
              <div className="flex items-center justify-between">
                <label htmlFor="amount" className="text-base font-semibold text-slate-600 shrink-0">
                  Số tiền
                </label>
                <div className="flex items-baseline gap-1.5 flex-1 justify-end">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="amount"
                    value={formState.amount}
                    onChange={handleAmountChange}
                    onFocus={() => setIsNumberPadOpen(true)}
                    placeholder="0"
                    className={`text-right bg-transparent border-0 text-3xl font-bold transition-all placeholder:text-slate-300 focus:outline-none cursor-pointer min-w-[80px] ${
                      formState.type === 'Thu'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                    required
                    readOnly
                  />
                  <span className={`text-xl font-semibold shrink-0 ${
                    formState.type === 'Thu' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    ₫
                  </span>
                </div>
              </div>
            </div>

            {/* Category Selection Section - Like in the image */}
            <div className="rounded-3xl bg-gradient-to-br from-white to-slate-50 shadow-md border border-slate-200/50 p-5">
              {/* Selected Category Display or Add Button */}
              <div className="flex items-center justify-between mb-2">
                {formState.category_id ? (
                  // Show selected category
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 ring-2 ring-sky-400/30 hover:ring-sky-400/50 transition-all active:scale-95 flex-1 mr-3"
                  >
                    {/* Category Icon */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white shrink-0">
                      {categoryIcons[formState.category_id] ? (
                        <span className="text-xl">
                          {categoryIcons[formState.category_id]}
                        </span>
                      ) : (
                        <CategoryIcon
                          iconId={categories.find(c => c.id === formState.category_id)?.icon_id || ''}
                          className="h-5 w-5 text-white"
                          fallback={
                            <span className="text-lg font-bold text-white">
                              {categories.find(c => c.id === formState.category_id)?.name[0]?.toUpperCase() || '?'}
                            </span>
                          }
                        />
                      )}
                    </div>
                    {/* Category Info */}
                    <div className="flex flex-col items-start flex-1">
                      <span className="text-xs font-medium text-slate-500">Mục đang chọn</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {categories.find(c => c.id === formState.category_id)?.name || 'Chưa chọn'}
                      </span>
                    </div>
                    <FaChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                ) : (
                  // Show add button when no category selected
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 flex-1 mr-3"
                  >
                    <FaPlus className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-semibold text-slate-900">Chọn hạng mục</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCategoryPickerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-all shrink-0"
                >
                  <span>Tất cả</span>
                  <FaChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Favorite Categories Section */}
              {favoriteCategories.length > 0 && (
                <div>
                  {/* "Mục hay dùng" Title with Collapse Icon */}
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-semibold text-slate-900">
                      Mục hay dùng
                    </h4>
                    <FaChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  
                  {/* Categories Grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {favoriteCategories.slice(0, 7).map((category) => {
                      const isSelected = formState.category_id === category.id
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setFormState((prev) => ({ ...prev, category_id: category.id }))}
                          className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-sky-50 to-blue-50 ring-2 ring-sky-400 shadow-lg'
                              : 'bg-white hover:bg-slate-50 shadow-md border border-slate-200/50'
                          }`}
                        >
                          {/* Star Icon - Top Right Corner */}
                          <FaStar className="absolute top-2 right-2 h-3 w-3 text-amber-500 fill-current drop-shadow-md z-10" />
                          
                          {/* Category Icon */}
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
                              isSelected
                                ? 'bg-gradient-to-br from-sky-400 to-blue-500 text-white scale-105 shadow-lg'
                                : 'bg-gradient-to-br from-blue-50 to-sky-50 text-slate-700'
                            }`}
                          >
                            {categoryIcons[category.id] ? (
                              <span className={`text-2xl ${isSelected ? 'text-white' : ''}`}>
                                {categoryIcons[category.id]}
                              </span>
                            ) : (
                              <CategoryIcon
                                iconId={category.icon_id}
                                className={`h-7 w-7 ${isSelected ? 'text-white' : 'text-slate-600'}`}
                                fallback={
                                  <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                                    {category.name[0]?.toUpperCase() || '?'}
                                  </span>
                                }
                              />
                            )}
                          </div>
                          
                          {/* Category Name */}
                          <span
                            className={`text-xs font-medium text-center leading-tight line-clamp-2 ${
                              isSelected ? 'text-sky-900 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            {category.name}
                          </span>
                        </button>
                      )
                    })}
                    
                    {/* Edit Button as 8th item */}
                    <button
                      type="button"
                      onClick={() => setIsFavoriteModalOpen(true)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white hover:bg-slate-50 shadow-md border border-slate-200/50 transition-all active:scale-95"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
                        <FaEdit className="h-6 w-6 text-slate-600" />
                      </div>
                      <span className="text-xs font-medium text-center text-slate-700 leading-tight">
                        Chỉnh sửa
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ngày và giờ giao dịch <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsDateTimePickerOpen(true)}
                className="relative flex w-full items-center justify-between rounded-2xl border-2 border-slate-200 bg-white p-4 pl-12 text-left transition-all hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20"
              >
                <FaCalendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    {(() => {
                      const date = new Date(formState.transaction_date)
                      const day = String(date.getDate()).padStart(2, '0')
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const year = date.getFullYear()
                      const dateStr = `${day}/${month}/${year}`
                      
                      // Check if today
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const selectedDate = new Date(date)
                      selectedDate.setHours(0, 0, 0, 0)
                      
                      if (selectedDate.getTime() === today.getTime()) {
                        return `Hôm nay - ${dateStr}`
                      }
                      return dateStr
                    })()}
                  </div>
                  {formState.transaction_time && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <FaClock className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{formState.transaction_time}</span>
                    </div>
                  )}
                </div>
                <FaChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </div>

            {/* Description - Optional */}
            <div>
              <label htmlFor="description" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mô tả (tùy chọn)
              </label>
              <input
                type="text"
                id="description"
                value={formState.description}
                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả giao dịch..."
                className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20"
              />
            </div>

            {/* File Upload - Optional */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tải lên ảnh/hóa đơn (tùy chọn)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                id="receipt"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
              >
                <FaImage className="h-5 w-5" />
                <span>Tải lên hóa đơn/ảnh</span>
              </button>
              {(uploadedFiles.length > 0 || uploadedImageUrls.length > 0) && (
                <div className="mt-3 space-y-2">
                  {uploadedImageUrls.map((url, index) => (
                    <div
                      key={`url-${index}`}
                      className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Receipt ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageUrl(index)}
                        className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={`file-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FaImage className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate text-sm text-slate-700">{file.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </form>
        </div>
      </main>

      {/* Fixed Footer with Action Buttons */}
      <ModalFooterButtons
        onCancel={() => navigate(-1)}
        onConfirm={() => {}}
        confirmText={isUploadingImages ? 'Đang upload ảnh...' : isSubmitting ? 'Đang lưu...' : `${isEditMode ? 'Cập nhật' : 'Thêm'} ${formState.type === 'Thu' ? 'Thu' : 'Chi'}`}
        isSubmitting={isSubmitting}
            disabled={isSubmitting || isLoading || isUploadingImages || wallets.length === 0 || filteredCategories.length === 0}
        confirmButtonType="submit"
        formId="transaction-form"
        fixed={true}
      />

      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={isNumberPadOpen}
        onClose={() => setIsNumberPadOpen(false)}
        value={formState.amount}
        onChange={(value) => setFormState((prev) => ({ ...prev, amount: value }))}
        onConfirm={() => setIsNumberPadOpen(false)}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelect={(categoryId) => {
          setFormState((prev) => ({ ...prev, category_id: categoryId }))
          setIsCategoryPickerOpen(false)
        }}
        selectedCategoryId={formState.category_id}
        categoryType={formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'}
        onEditCategory={(categoryId) => {
          console.log('Edit category:', categoryId)
          setIsCategoryPickerOpen(false)
        }}
      />

      {/* DateTime Picker Modal */}
      <DateTimePickerModal
        isOpen={isDateTimePickerOpen}
        onClose={() => setIsDateTimePickerOpen(false)}
        onConfirm={(date, time) => {
          setFormState((prev) => ({
            ...prev,
            transaction_date: date,
            transaction_time: time,
          }))
        }}
        initialDate={formState.transaction_date}
        initialTime={formState.transaction_time}
        showTime={true}
      />

      {/* Favorite Categories Modal */}
      <FavoriteCategoriesModal
        isOpen={isFavoriteModalOpen}
        onClose={() => {
          setIsFavoriteModalOpen(false)
          // Reload favorites when modal closes
          const reloadFavorites = async () => {
            try {
              const categoryTypeForReload = formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'
              const [hierarchicalData, favoriteIdsArray] = await Promise.all([
                fetchCategoriesHierarchical(),
                getFavoriteCategories(categoryTypeForReload),
              ])
              const favorites: CategoryWithChildren[] = []
              const favoriteIdsSet = new Set(favoriteIdsArray.slice(0, 7))

              const findCategoryById = (cats: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
                for (const cat of cats) {
                  if (cat.id === id) return cat
                  if (cat.children) {
                    const found = findCategoryById(cat.children, id)
                    if (found) return found
                  }
                }
                return null
              }

              favoriteIdsSet.forEach((id) => {
                const category = findCategoryById(hierarchicalData, id)
                if (category) {
                  favorites.push(category)
                }
              })

              setFavoriteCategories(favorites)
            } catch (error) {
              console.error('Error reloading favorites:', error)
            }
          }
          reloadFavorites()
        }}
        categoryType={formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'}
      />
    </div>
  )
}

export default AddTransactionPage

