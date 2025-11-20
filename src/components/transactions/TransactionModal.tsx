import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { FaCalendar, FaTimes, FaImage, FaWallet, FaArrowDown, FaArrowUp, FaChevronDown, FaCamera } from 'react-icons/fa'

import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { CustomSelect } from '../ui/CustomSelect'
import { getIconNode } from '../../utils/iconLoader'
import { TagSuggestions } from '../ui/TagSuggestions'
import { ModalFooterButtons } from '../ui/ModalFooterButtons'
import { TransactionModalSkeleton } from '../skeletons'

// Lazy load heavy modals
const NumberPadModal = lazy(() => import('../ui/NumberPadModal').then(module => ({ default: module.NumberPadModal })))
const CategoryPickerModal = lazy(() => import('../categories/CategoryPickerModal').then(module => ({ default: module.CategoryPickerModal })))
import { fetchCategories, type CategoryRecord, type CategoryType } from '../../lib/categoryService'
import { createTransaction, updateTransaction, type TransactionType, type TransactionRecord } from '../../lib/transactionService'
import { fetchWallets, getDefaultWallet, type WalletRecord } from '../../lib/walletService'
import { getBudgetForCategory, type BudgetWithSpending } from '../../lib/budgetService'
import { uploadMultipleToCloudinary } from '../../lib/cloudinaryService'
import { compressImageForTransaction } from '../../utils/imageCompression'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../../utils/currencyInput'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { formatDateUTC7, getNowUTC7 } from '../../utils/dateUtils'

type TransactionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultType?: TransactionType
  transaction?: TransactionRecord | null
}

type TransactionFormState = {
  type: TransactionType
  wallet_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
  tags: string[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const TransactionModal = ({ isOpen, onClose, onSuccess, defaultType = 'Chi', transaction }: TransactionModalProps) => {
  const { success, error: showError } = useNotification()
  const isEditMode = !!transaction

  const [formState, setFormState] = useState<TransactionFormState>({
    type: defaultType,
    wallet_id: '',
    category_id: '',
    amount: '',
    description: '',
    transaction_date: formatDateUTC7(getNowUTC7()),
    tags: [],
  })

  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [budgetInfo, setBudgetInfo] = useState<BudgetWithSpending | null>(null)
  const [isLoadingBudget, setIsLoadingBudget] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Load wallets và categories khi modal mở
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [walletsData, categoriesData, defaultId] = await Promise.all([
          fetchWallets(false), // Chỉ lấy ví active, không lấy ví đã ẩn
          fetchCategories(),
          getDefaultWallet(),
        ])

        setWallets(walletsData)
        setCategories(categoriesData)
        setDefaultWalletId(defaultId || null)

        // Load icons for all categories
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNode(category.icon_id)
              if (iconNode) {
                iconsMap[category.id] = iconNode
              } else {
                // Fallback to hardcoded icon
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-4 w-4" />
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-4 w-4" />
              }
            }
          })
        )
        setCategoryIcons(iconsMap)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isOpen])

  // Populate form when editing
  useEffect(() => {
    if (isOpen && transaction) {
      setFormState({
        type: transaction.type,
        wallet_id: transaction.wallet_id,
        category_id: transaction.category_id,
        amount: formatVNDInput(transaction.amount.toString()),
        description: transaction.description || '',
        transaction_date: transaction.transaction_date,
        tags: transaction.tags || [],
      })
      setUploadedImageUrls(transaction.image_urls || [])
    } else if (isOpen && !transaction) {
      // Reset form when creating new transaction
      setFormState({
        type: defaultType,
        wallet_id: defaultWalletId || '',
        category_id: '',
        amount: '',
        description: '',
        transaction_date: formatDateUTC7(getNowUTC7()),
        tags: [],
      })
      setTagInput('')
      setUploadedFiles([])
      setUploadedImageUrls([])
    }
  }, [isOpen, transaction, defaultType, defaultWalletId])

  // Filter categories theo type
  const filteredCategories = categories.filter((cat) => {
    const categoryType: CategoryType = cat.type === 'Chi tiêu' ? 'Chi tiêu' : 'Thu nhập'
    return formState.type === 'Chi' ? categoryType === 'Chi tiêu' : categoryType === 'Thu nhập'
  })

  // Reset category khi type thay đổi nếu category hiện tại không hợp lệ
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const currentCategory = filteredCategories.find((cat) => cat.id === formState.category_id)
      if (!currentCategory) {
        // Không tự chọn, chỉ reset về rỗng
        setFormState((prev) => ({ ...prev, category_id: '' }))
      }
    } else {
      setFormState((prev) => ({ ...prev, category_id: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.type, filteredCategories.length])

  // Load budget info when category, wallet, or date changes (only for expense transactions)
  useEffect(() => {
    if (!isOpen || formState.type !== 'Chi' || !formState.category_id || !formState.wallet_id || !formState.transaction_date) {
      setBudgetInfo(null)
      return
    }

    const loadBudgetInfo = async () => {
      setIsLoadingBudget(true)
      try {
        const budget = await getBudgetForCategory(
          formState.category_id,
          formState.wallet_id,
          formState.transaction_date
        )
        setBudgetInfo(budget)
      } catch (error) {
        console.error('Error loading budget info:', error)
        setBudgetInfo(null)
      } finally {
        setIsLoadingBudget(false)
      }
    }

    loadBudgetInfo()
  }, [isOpen, formState.type, formState.category_id, formState.wallet_id, formState.transaction_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation - Bắt buộc nhập các trường sau
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
    if (!formState.description || formState.description.trim() === '') {
      const message = 'Vui lòng nhập mô tả giao dịch'
      setError(message)
      showError(message)
      return
    }

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

          // Upload files to Cloudinary
          // Folder structure: {base_folder}/transactions/{user_id}
          const uploadResults = await uploadMultipleToCloudinary(uploadedFiles, {
            folder: `transactions/${user.id}`,
            transformation: {
              quality: 'auto',
              format: 'auto',
            },
          })

          // Get secure URLs
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

      if (isEditMode && transaction) {
        await updateTransaction(transaction.id, {
          wallet_id: formState.wallet_id,
          category_id: formState.category_id,
          type: formState.type,
          amount,
          description: formState.description.trim(),
          transaction_date: formState.transaction_date,
          tags: formState.tags.length > 0 ? formState.tags : undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })
        success(`Đã cập nhật ${formState.type === 'Thu' ? 'thu nhập' : 'chi tiêu'} thành công!`)
      } else {
        const result = await createTransaction({
          wallet_id: formState.wallet_id,
          category_id: formState.category_id,
          type: formState.type,
          amount,
          description: formState.description.trim(),
          transaction_date: formState.transaction_date,
          tags: formState.tags.length > 0 ? formState.tags : undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })

        // Show budget warning if exists (soft limit)
        if (result.budgetWarning) {
          showError(result.budgetWarning)
        } else {
          success(`Đã thêm ${formState.type === 'Thu' ? 'thu nhập' : 'chi tiêu'} thành công!`)
        }
      }

      // Reset form nhưng giữ lại wallet_id mặc định (để thêm liên tục)
      const resetWalletId = defaultWalletId || formState.wallet_id || ''
      setFormState({
        type: defaultType,
        wallet_id: resetWalletId, // Giữ lại wallet đã chọn hoặc wallet mặc định
        category_id: '',
        amount: '',
        description: '',
        transaction_date: formatDateUTC7(getNowUTC7()),
        tags: [],
      })
      setTagInput('')
      setUploadedFiles([])
      setUploadedImageUrls([])

      onSuccess?.()
      // KHÔNG đóng modal để có thể thêm liên tục
      // onClose()
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      // Compress all images before adding to state
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('image/')) {
            try {
              const compressed = await compressImageForTransaction(file, 1200, 1200, 50, 0.7)
              console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(2)}KB -> ${(compressed.size / 1024).toFixed(2)}KB`)
              return compressed
            } catch (error) {
              console.error('Error compressing image:', error)
              showError(`Không thể nén ảnh ${file.name}. Vui lòng thử lại.`)
              return null
            }
          }
          return file
        })
      )

      // Filter out null values (failed compressions)
      const validFiles = compressedFiles.filter((f): f is File => f !== null)
      setUploadedFiles((prev) => [...prev, ...validFiles])
    } catch (error) {
      console.error('Error handling files:', error)
      showError('Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.')
    } finally {
      // Reset input value
      if (e.target === cameraInputRef.current && cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      if (e.target === galleryInputRef.current && galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeImageUrl = (index: number) => {
    setUploadedImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
        {/* Header - Fixed */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {isEditMode ? 'Sửa' : 'Thêm'} {formState.type === 'Thu' ? 'Thu nhập' : 'Chi tiêu'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {isEditMode ? 'Chỉnh sửa thông tin giao dịch' : 'Nhập thông tin giao dịch mới'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {/* Error message */}
          {error && (
            <div className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 sm:text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          {isLoading ? (
            <TransactionModalSkeleton />
          ) : (
            <form onSubmit={handleSubmit} id="transaction-form" className="space-y-4">
              {/* Type selector */}
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, type: 'Thu' }))}
                    className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-2.5 text-center text-sm font-bold transition-all sm:py-3 sm:text-base ${formState.type === 'Thu'
                      ? 'border-emerald-600 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/50'
                      : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:border-emerald-400 hover:from-emerald-50 hover:to-emerald-100 hover:text-emerald-700 hover:shadow-md'
                      }`}
                  >
                    <FaArrowUp className={`relative z-10 h-5 w-5 transition-transform ${formState.type === 'Thu' ? 'scale-110' : ''} sm:h-6 sm:w-6`} />
                    <span className="relative z-10">Thu nhập</span>
                    {formState.type === 'Thu' && (
                      <div className="absolute inset-0 z-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, type: 'Chi' }))}
                    className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-2.5 text-center text-sm font-bold transition-all sm:py-3 sm:text-base ${formState.type === 'Chi'
                      ? 'border-rose-500 bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105'
                      : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:border-rose-300 hover:from-rose-50 hover:to-rose-100 hover:text-rose-700 hover:shadow-md'
                      }`}
                  >
                    <FaArrowDown className={`relative z-10 h-5 w-5 transition-transform ${formState.type === 'Chi' ? 'scale-110' : ''} sm:h-6 sm:w-6`} />
                    <span className="relative z-10">Chi tiêu</span>
                    {formState.type === 'Chi' && (
                      <div className="absolute inset-0 z-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
                    )}
                  </button>
                </div>
              </div>

              {/* Wallet and Category - Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Wallet selector - Required */}
                <div className="flex flex-col">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                    Chọn ví <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex-1">
                    <CustomSelect
                      options={wallets.map((wallet) => ({
                        value: wallet.id,
                        label: wallet.name,
                        metadata: formatCurrency(wallet.balance),
                        icon: <FaWallet className="h-4 w-4" />,
                      }))}
                      value={formState.wallet_id}
                      onChange={(value) => setFormState((prev) => ({ ...prev, wallet_id: value }))}
                      placeholder="Chọn ví"
                      loading={isLoading}
                      emptyMessage="Chưa có ví"
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Category selector - Required */}
                <div className="flex flex-col">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                    Chọn hạng mục <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => setIsCategoryPickerOpen(true)}
                      className="flex h-12 w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {formState.category_id && categoryIcons[formState.category_id] && (
                          <span className="shrink-0 text-slate-600">{categoryIcons[formState.category_id]}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          {formState.category_id ? (
                            <div className="truncate text-sm font-medium text-slate-900">
                              {filteredCategories.find((c) => c.id === formState.category_id)?.name || 'Chọn hạng mục'}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400">Chọn hạng mục</div>
                          )}
                        </div>
                      </div>
                      <FaChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Budget Info Display - Only for expense transactions with budget */}
              {formState.type === 'Chi' && formState.category_id && formState.wallet_id && (
                <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                  {isLoadingBudget ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
                      <span>Đang kiểm tra hạn mức...</span>
                    </div>
                  ) : budgetInfo ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Hạn mức hạng mục</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${budgetInfo.usage_percentage >= 100
                          ? 'bg-rose-100 text-rose-700'
                          : budgetInfo.usage_percentage >= 80
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          {budgetInfo.usage_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Đã chi:</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(budgetInfo.spent_amount)} / {formatCurrency(budgetInfo.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Còn lại:</span>
                        <span className={`font-bold ${budgetInfo.remaining_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                          {formatCurrency(Math.abs(budgetInfo.remaining_amount))}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${budgetInfo.usage_percentage >= 100
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                            : budgetInfo.usage_percentage >= 80
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                            }`}
                          style={{ width: `${Math.min(budgetInfo.usage_percentage, 100)}%` }}
                        />
                      </div>
                      {budgetInfo.limit_type && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${budgetInfo.limit_type === 'hard'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                            }`}>
                            {budgetInfo.limit_type === 'hard' ? '🚫 Giới hạn cứng' : '⚠️ Giới hạn mềm'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-1">
                      Không có hạn mức cho hạng mục này
                    </div>
                  )}
                </div>
              )}

              {/* Amount and Date - Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Amount - Required */}
                <div className="flex flex-col">
                  <label htmlFor="amount" className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                    Số tiền <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      id="amount"
                      value={formState.amount}
                      onChange={handleAmountChange}
                      onFocus={() => setIsNumberPadOpen(true)}
                      placeholder="Nhập số tiền"
                      className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-base font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 sm:text-lg cursor-pointer"
                      required
                      readOnly
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                      ₫
                    </span>
                  </div>
                </div>

                {/* Date - Required */}
                <div className="flex flex-col">
                  <label htmlFor="date" className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                    Ngày giao dịch <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex-1">
                    <FaCalendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      id="date"
                      value={formState.transaction_date}
                      onChange={(e) => setFormState((prev) => ({ ...prev, transaction_date: e.target.value }))}
                      className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pl-11 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Description - Required */}
              <div>
                <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Mô tả giao dịch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="description"
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Nhập mô tả giao dịch..."
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  required
                />
              </div>

              {/* Tags - Optional */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Tag (tùy chọn)
                </label>
                <div className="rounded-xl border-2 border-slate-200 bg-white p-3.5 transition-all focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 sm:p-4">
                  {formState.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {formState.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() =>
                              setFormState((prev) => ({
                                ...prev,
                                tags: prev.tags.filter((t) => t !== tag),
                              }))
                            }
                            className="hover:text-sky-900"
                          >
                            <FaTimes className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const value = tagInput.trim()
                        if (value && !formState.tags.includes(value)) {
                          setFormState((prev) => ({ ...prev, tags: [...prev.tags, value] }))
                          setTagInput('')
                        }
                      } else if (e.key === 'Backspace' && tagInput === '' && formState.tags.length > 0) {
                        setFormState((prev) => ({ ...prev, tags: prev.tags.slice(0, -1) }))
                      }
                    }}
                    placeholder="Nhập tag và nhấn Enter (tùy chọn)..."
                    className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <TagSuggestions
                  selectedTags={formState.tags}
                  onTagToggle={(tag) => {
                    setFormState((prev) => ({
                      ...prev,
                      tags: prev.tags.includes(tag)
                        ? prev.tags.filter((t) => t !== tag)
                        : [...prev.tags, tag],
                    }))
                  }}
                />
              </div>

              {/* File Upload - Optional */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Tải lên ảnh/hóa đơn (tùy chọn)
                </label>
                {/* Hidden file inputs */}
                {/* Camera input - CỐ ĐỊNH: chỉ mở camera để chụp ảnh, không cho chọn từ thư viện */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  id="camera-input"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {/* Gallery input - CỐ ĐỊNH: chỉ mở thư viện/bộ sưu tập để chọn ảnh, không mở camera */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  id="gallery-input"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {/* Two buttons: Camera and Gallery - Chức năng cố định */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Nút Chụp ảnh - CỐ ĐỊNH: luôn mở camera */}
                  <button
                    type="button"
                    onClick={() => {
                      // Đảm bảo chỉ mở camera
                      if (cameraInputRef.current) {
                        cameraInputRef.current.click()
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <FaCamera className="h-6 w-6" />
                    <span>Chụp ảnh</span>
                  </button>
                  {/* Nút Chọn từ thư viện - CỐ ĐỊNH: luôn mở bộ sưu tập */}
                  <button
                    type="button"
                    onClick={() => {
                      // Đảm bảo chỉ mở thư viện
                      if (galleryInputRef.current) {
                        galleryInputRef.current.click()
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <FaImage className="h-6 w-6" />
                    <span>Chọn từ thư viện</span>
                  </button>
                </div>
                {(uploadedFiles.length > 0 || uploadedImageUrls.length > 0) && (
                  <div className="mt-3 space-y-2">
                    {/* Display existing uploaded images */}
                    {uploadedImageUrls.map((url, index) => (
                      <div
                        key={`url-${index}`}
                        className="relative group rounded-lg border border-slate-200 bg-white overflow-hidden"
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
                    {/* Display new files to be uploaded */}
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={`file-${index}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <FaImage className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate text-xs text-slate-700 sm:text-sm">{file.name}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            ({(file.size / 1024).toFixed(1)} KB - Chưa upload)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer - Fixed */}
        <ModalFooterButtons
          onCancel={onClose}
          onConfirm={() => { }}
          confirmText={isUploadingImages ? 'Đang upload ảnh...' : isSubmitting ? 'Đang lưu...' : `${isEditMode ? 'Cập nhật' : 'Thêm'} ${formState.type === 'Thu' ? 'Thu' : 'Chi'}`}
          isSubmitting={isSubmitting}
          disabled={isSubmitting || isLoading || isUploadingImages || wallets.length === 0 || filteredCategories.length === 0}
          confirmButtonType="submit"
          formId="transaction-form"
        />
      </div>

      {/* Number Pad Modal */}
      {/* Number Pad Modal */}
      <Suspense fallback={null}>
        <NumberPadModal
          isOpen={isNumberPadOpen}
          onClose={() => setIsNumberPadOpen(false)}
          value={formState.amount}
          onChange={(value: string) => setFormState((prev) => ({ ...prev, amount: value }))}
          onConfirm={() => setIsNumberPadOpen(false)}
        />

        {/* Category Picker Modal */}
        <CategoryPickerModal
          isOpen={isCategoryPickerOpen}
          onClose={() => setIsCategoryPickerOpen(false)}
          onSelect={(categoryId: string) => {
            setFormState((prev) => ({ ...prev, category_id: categoryId }))
            setIsCategoryPickerOpen(false)
          }}
          selectedCategoryId={formState.category_id}
          categoryType={formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'}
          onEditCategory={(categoryId: string) => {
            // TODO: Mở modal chỉnh sửa category (có thể navigate đến trang Categories hoặc mở modal riêng)
            console.log('Edit category:', categoryId)
            setIsCategoryPickerOpen(false)
          }}
        />
      </Suspense>
    </div>
  )
}

