import { useEffect, useRef, useState } from 'react'
import { RiCalendarLine, RiCloseLine, RiImageAddLine, RiWallet3Line, RiArrowDownCircleLine, RiArrowUpCircleLine } from 'react-icons/ri'

import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { CustomSelect } from '../ui/CustomSelect'
import { TagSuggestions } from '../ui/TagSuggestions'
import { fetchCategories, type CategoryRecord, type CategoryType } from '../../lib/categoryService'
import { createTransaction, type TransactionType } from '../../lib/transactionService'
import { fetchWallets, type WalletRecord } from '../../lib/walletService'

type TransactionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultType?: TransactionType
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

export const TransactionModal = ({ isOpen, onClose, onSuccess, defaultType = 'Chi' }: TransactionModalProps) => {
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load wallets và categories khi modal mở
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [walletsData, categoriesData] = await Promise.all([
          fetchWallets(),
          fetchCategories(),
        ])

        setWallets(walletsData)
        setCategories(categoriesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formState.wallet_id) {
      setError('Vui lòng chọn ví')
      return
    }
    if (!formState.category_id) {
      setError('Vui lòng chọn danh mục')
      return
    }
    const amount = parseFloat(formState.amount.replace(/[^\d]/g, ''))
    if (!amount || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ')
      return
    }

    setIsSubmitting(true)
    try {
      await createTransaction({
        wallet_id: formState.wallet_id,
        category_id: formState.category_id,
        type: formState.type,
        amount,
        description: formState.description || undefined,
        transaction_date: formState.transaction_date,
        tags: formState.tags.length > 0 ? formState.tags : undefined,
      })

      // Reset form
      setFormState({
        type: defaultType,
        wallet_id: '',
        category_id: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        tags: [],
      })
      setTagInput('')
      setUploadedFiles([])

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo giao dịch')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '')
    setFormState((prev) => ({ ...prev, amount: value }))
  }

  const formatAmountForDisplay = (value: string) => {
    if (!value) return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('vi-VN').format(num)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-md bg-slate-950/50">
      <div className="flex w-full max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-t-3xl">
        {/* Header - Fixed */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              Thêm {formState.type === 'Thu' ? 'Thu nhập' : 'Chi tiêu'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Nhập thông tin giao dịch mới</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <RiCloseLine className="h-4 w-4 sm:h-5 sm:w-5" />
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
          <form onSubmit={handleSubmit} id="transaction-form" className="space-y-4">
          {/* Type selector */}
          <div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, type: 'Thu' }))}
                className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-center text-sm font-bold transition-all sm:py-4.5 sm:text-base ${
                  formState.type === 'Thu'
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                    : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:border-emerald-300 hover:from-emerald-50 hover:to-emerald-100 hover:text-emerald-700 hover:shadow-md'
                }`}
              >
                <RiArrowUpCircleLine className={`relative z-10 h-5 w-5 transition-transform ${formState.type === 'Thu' ? 'scale-110' : ''} sm:h-6 sm:w-6`} />
                <span className="relative z-10">Thu nhập</span>
                {formState.type === 'Thu' && (
                  <div className="absolute inset-0 z-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, type: 'Chi' }))}
                className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-center text-sm font-bold transition-all sm:py-4.5 sm:text-base ${
                  formState.type === 'Chi'
                    ? 'border-rose-500 bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105'
                    : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:border-rose-300 hover:from-rose-50 hover:to-rose-100 hover:text-rose-700 hover:shadow-md'
                }`}
              >
                <RiArrowDownCircleLine className={`relative z-10 h-5 w-5 transition-transform ${formState.type === 'Chi' ? 'scale-110' : ''} sm:h-6 sm:w-6`} />
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
            <CustomSelect
              options={wallets.map((wallet) => ({
                value: wallet.id,
                label: wallet.name,
                metadata: formatCurrency(wallet.balance),
                icon: <RiWallet3Line className="h-4 w-4" />,
              }))}
              value={formState.wallet_id}
              onChange={(value) => setFormState((prev) => ({ ...prev, wallet_id: value }))}
              placeholder="Chọn ví"
              loading={isLoading}
              emptyMessage="Chưa có ví"
              className="h-full"
            />

            {/* Category selector */}
            <CustomSelect
              options={filteredCategories.map((category) => {
                const iconData = CATEGORY_ICON_MAP[category.icon_id]
                const IconComponent = iconData?.icon
                return {
                  value: category.id,
                  label: category.name,
                  icon: IconComponent ? <IconComponent className="h-4 w-4" /> : undefined,
                }
              })}
              value={formState.category_id}
              onChange={(value) => setFormState((prev) => ({ ...prev, category_id: value }))}
              placeholder="Chọn danh mục"
              loading={isLoading}
              emptyMessage="Chưa có danh mục"
              className="h-full"
            />
          </div>

          {/* Amount and Date - Grid */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            {/* Amount - chỉ nhập số */}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                id="amount"
                value={formState.amount ? formatAmountForDisplay(formState.amount) : ''}
                onChange={handleAmountChange}
                placeholder="Nhập số tiền"
                className="h-full w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-base font-semibold text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 sm:text-lg"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                VND
              </span>
            </div>

            {/* Date */}
            <div className="relative">
              <RiCalendarLine className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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

          {/* Description */}
          <input
            type="text"
            id="description"
            value={formState.description}
            onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Mô tả giao dịch..."
            className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
          />

          {/* Tags */}
          <div>
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
                        <RiCloseLine className="h-3 w-3" />
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
                placeholder="Nhập tag và nhấn Enter..."
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
              <RiImageAddLine className="h-5 w-5" />
              <span>Tải lên hóa đơn/ảnh (nếu có)</span>
            </button>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <RiImageAddLine className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate text-xs text-slate-700 sm:text-sm">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <RiCloseLine className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
        </div>

        {/* Footer - Fixed */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
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
              disabled={isSubmitting || isLoading || wallets.length === 0 || filteredCategories.length === 0}
            >
              {isSubmitting ? 'Đang lưu...' : `Thêm ${formState.type === 'Thu' ? 'Thu' : 'Chi'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

