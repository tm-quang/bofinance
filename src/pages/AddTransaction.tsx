import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FaCalendar, FaImage, FaWallet, FaArrowDown, FaArrowUp, FaChevronDown, FaTimes } from 'react-icons/fa'

import HeaderBar from '../components/layout/HeaderBar'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { CustomSelect } from '../components/ui/CustomSelect'
import { getIconNode } from '../utils/iconLoader'
import { TagSuggestions } from '../components/ui/TagSuggestions'
import { NumberPadModal } from '../components/ui/NumberPadModal'
import { CategoryPickerModal } from '../components/categories/CategoryPickerModal'
import { fetchCategories, type CategoryRecord, type CategoryType } from '../lib/categoryService'
import { createTransaction, updateTransaction, type TransactionType } from '../lib/transactionService'
import { fetchWallets, getDefaultWallet, getTotalBalanceWalletIds, type WalletRecord } from '../lib/walletService'
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
  tags: string[]
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
    tags: [],
  })

  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
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
        
        // Calculate total balance from selected wallets (Tiền mặt + Ngân hàng by default)
        const walletIds = await getTotalBalanceWalletIds()
        const selectedWallets = walletsData.filter((w) => walletIds.includes(w.id))
        const total = selectedWallets.reduce((sum, w) => sum + (w.balance ?? 0), 0)
        setTotalBalance(total)

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

        // Load transaction if editing
        if (transactionId) {
          const { fetchTransactions } = await import('../lib/transactionService')
          const transactions = await fetchTransactions({})
          const foundTransaction = transactions.find(t => t.id === transactionId)
          if (foundTransaction) {
            setFormState({
              type: foundTransaction.type,
              wallet_id: foundTransaction.wallet_id,
              category_id: foundTransaction.category_id,
              amount: formatVNDInput(foundTransaction.amount.toString()),
              description: foundTransaction.description || '',
              transaction_date: foundTransaction.transaction_date,
              tags: foundTransaction.tags || [],
            })
            setUploadedImageUrls(foundTransaction.image_urls || [])
          }
        } else {
          // Reset form when creating new transaction
          setFormState({
            type: defaultType,
            wallet_id: defaultId || '',
            category_id: '',
            amount: '',
            description: '',
            transaction_date: new Date().toISOString().split('T')[0],
            tags: [],
          })
          setTagInput('')
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

  // Update total balance when wallets change
  useEffect(() => {
    const updateTotalBalance = async () => {
      if (wallets.length > 0) {
        try {
          // Get selected wallet IDs (Tiền mặt + Ngân hàng by default)
          const walletIds = await getTotalBalanceWalletIds()
          const selectedWallets = wallets.filter((w) => walletIds.includes(w.id))
          const total = selectedWallets.reduce((sum, w) => sum + (w.balance ?? 0), 0)
          setTotalBalance(total)
        } catch (error) {
          console.error('Error updating total balance:', error)
          // Fallback: calculate from Tiền mặt + Ngân hàng
          const total = wallets
            .filter((w) => (w.type === 'Tiền mặt' || w.type === 'Ngân hàng') && w.is_active)
            .reduce((sum, w) => sum + (w.balance ?? 0), 0)
          setTotalBalance(total)
        }
      }
    }
    updateTotalBalance()
  }, [wallets])

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
          description: formState.description.trim(),
          transaction_date: formState.transaction_date,
          tags: formState.tags.length > 0 ? formState.tags : undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })
        success(`Đã cập nhật ${formState.type === 'Thu' ? 'thu nhập' : 'chi tiêu'} thành công!`)
      } else {
        await createTransaction({
          wallet_id: formState.wallet_id,
          category_id: formState.category_id,
          type: formState.type,
          amount,
          description: formState.description.trim(),
          transaction_date: formState.transaction_date,
          tags: formState.tags.length > 0 ? formState.tags : undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })
        success(`Đã thêm ${formState.type === 'Thu' ? 'thu nhập' : 'chi tiêu'} thành công!`)
      }

      // Navigate back
      navigate(-1)
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
        title={isEditMode ? 'SỬA GIAO DỊCH' : formState.type === 'Thu' ? 'THÊM THU NHẬP' : 'THÊM CHI TIÊU'}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4 sm:py-6">
          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 sm:text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} id="transaction-form" className="space-y-4">
            {/* Type selector */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormState((prev) => ({ ...prev, type: 'Thu' }))}
                  className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-2.5 text-center text-sm font-bold transition-all sm:py-3 sm:text-base ${
                    formState.type === 'Thu'
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                      : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:border-emerald-300 hover:from-emerald-50 hover:to-emerald-100 hover:text-emerald-700 hover:shadow-md'
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
                  className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-2.5 text-center text-sm font-bold transition-all sm:py-3 sm:text-base ${
                    formState.type === 'Chi'
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
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {/* Wallet selector */}
              <div>
                <label className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Chọn ví <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  options={wallets.map((wallet) => ({
                    value: wallet.id,
                    label: wallet.name,
                    metadata: formatCurrency(totalBalance),
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

              {/* Category selector */}
              <div>
                <label className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Chọn hạng mục <span className="text-rose-500">*</span>
                </label>
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

            {/* Amount and Date - Grid */}
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {/* Amount */}
              <div>
                <label htmlFor="amount" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Số tiền <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="amount"
                    value={formState.amount}
                    onChange={handleAmountChange}
                    onFocus={() => setIsNumberPadOpen(true)}
                    placeholder="Nhập số tiền"
                    className="h-full w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-base font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 sm:text-lg cursor-pointer"
                    required
                    readOnly
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                    ₫
                  </span>
                </div>
              </div>

              {/* Date */}
              <div>
                <label htmlFor="date" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Ngày giao dịch <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FaCalendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    id="date"
                    value={formState.transaction_date}
                    onChange={(e) => setFormState((prev) => ({ ...prev, transaction_date: e.target.value }))}
                    className="h-full w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pl-11 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
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

            {/* Tags */}
            <div>
              <label className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
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

            {/* File Upload */}
            <div>
              <label className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
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
                className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 sm:p-5"
              >
                <FaImage className="h-5 w-5" />
                <span>Tải lên hóa đơn/ảnh (tùy chọn)</span>
              </button>
              {(uploadedFiles.length > 0 || uploadedImageUrls.length > 0) && (
                <div className="mt-3 space-y-2">
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
        </div>
      </main>

      {/* Fixed Footer with Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-md gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:py-3 sm:text-base"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="transaction-form"
            className={`flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 sm:py-3 sm:text-base ${
              formState.type === 'Thu' ? 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' : ''
            }`}
            disabled={isSubmitting || isLoading || isUploadingImages || wallets.length === 0 || filteredCategories.length === 0}
          >
            {isUploadingImages ? 'Đang upload ảnh...' : isSubmitting ? 'Đang lưu...' : `${isEditMode ? 'Cập nhật' : 'Thêm'} ${formState.type === 'Thu' ? 'Thu' : 'Chi'}`}
          </button>
        </div>
      </div>

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
    </div>
  )
}

export default AddTransactionPage

