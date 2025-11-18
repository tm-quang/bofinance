import { useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { CustomSelect } from '../ui/CustomSelect'
import { NumberPadModal } from '../ui/NumberPadModal'
import { ModalFooterButtons } from '../ui/ModalFooterButtons'
import { fetchCategories, type CategoryRecord } from '../../lib/categoryService'
import { fetchWallets, type WalletRecord } from '../../lib/walletService'
import {
  createBudget,
  updateBudget,
  getBudgetById,
  calculatePeriod,
  type BudgetInsert,
  type PeriodType,
} from '../../lib/budgetService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../../utils/currencyInput'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { getIconNode } from '../../utils/iconLoader'

type BudgetModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  budgetId?: string | null
}

const PERIOD_TYPES: { value: PeriodType; label: string }[] = [
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'yearly', label: 'Hàng năm' },
]

const MONTHS = [
  { value: 1, label: 'Tháng 1' },
  { value: 2, label: 'Tháng 2' },
  { value: 3, label: 'Tháng 3' },
  { value: 4, label: 'Tháng 4' },
  { value: 5, label: 'Tháng 5' },
  { value: 6, label: 'Tháng 6' },
  { value: 7, label: 'Tháng 7' },
  { value: 8, label: 'Tháng 8' },
  { value: 9, label: 'Tháng 9' },
  { value: 10, label: 'Tháng 10' },
  { value: 11, label: 'Tháng 11' },
  { value: 12, label: 'Tháng 12' },
]

export const BudgetModal = ({ isOpen, onClose, onSuccess, budgetId }: BudgetModalProps) => {
  const { success, error: showError } = useNotification()
  const isEditMode = !!budgetId

  const [formData, setFormData] = useState({
    category_id: '',
    wallet_id: '',
    amount: '',
    period_type: 'monthly' as PeriodType,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: '',
  })

  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [categoriesData, walletsData] = await Promise.all([
          fetchCategories(),
          fetchWallets(false),
        ])

        // Filter only expense categories
        const expenseCategories = categoriesData.filter(c => c.type === 'Chi tiêu')
        
        // Load icons for all categories
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          expenseCategories.map(async (category) => {
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
                } else {
                  iconsMap[category.id] = '💰'
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-4 w-4" />
              } else {
                iconsMap[category.id] = '💰'
              }
            }
          })
        )
        setCategoryIcons(iconsMap)
        
        setCategories(expenseCategories)
        setWallets(walletsData)

        // Load budget if editing
        if (budgetId) {
          const budget = await getBudgetById(budgetId)
          if (budget) {
            const periodStart = new Date(budget.period_start)
            setFormData({
              category_id: budget.category_id,
              wallet_id: budget.wallet_id || '',
              amount: formatVNDInput(budget.amount.toString()),
              period_type: budget.period_type,
              month: periodStart.getMonth() + 1,
              year: periodStart.getFullYear(),
              notes: budget.notes || '',
            })
          }
        } else {
          // Reset form for new budget
          const now = new Date()
          setFormData({
            category_id: '',
            wallet_id: '',
            amount: '',
            period_type: 'monthly',
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            notes: '',
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu'
        setError(message)
        showError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isOpen, budgetId, showError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.category_id) {
      const message = 'Vui lòng chọn hạng mục'
      setError(message)
      showError(message)
      return
    }

    if (!formData.amount || parseVNDInput(formData.amount) <= 0) {
      const message = 'Số tiền ngân sách phải lớn hơn 0'
      setError(message)
      showError(message)
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate period dates
      const period = calculatePeriod(
        formData.period_type,
        formData.year,
        formData.period_type === 'monthly' ? formData.month : undefined
      )
      
      const payload: BudgetInsert = {
        category_id: formData.category_id,
        wallet_id: formData.wallet_id || null,
        amount: parseVNDInput(formData.amount),
        period_type: formData.period_type,
        period_start: period.start.toISOString().split('T')[0],
        period_end: period.end.toISOString().split('T')[0],
        notes: formData.notes || undefined,
      }

      if (isEditMode && budgetId) {
        await updateBudget(budgetId, payload)
        success('Đã cập nhật ngân sách thành công!')
      } else {
        await createBudget(payload)
        success('Đã tạo ngân sách thành công!')
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể lưu ngân sách'
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
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

  const expenseCategories = categories.filter(c => c.type === 'Chi tiêu')
  const categoryOptions = expenseCategories.map(cat => ({
    value: cat.id,
    label: cat.name,
    icon: categoryIcons[cat.id] || '💰',
  }))

  const walletOptions = [
    { value: '', label: 'Tất cả ví', icon: '💼' },
    ...wallets.map(wallet => ({
      value: wallet.id,
      label: wallet.name,
      icon: wallet.icon || '💳',
      metadata: wallet.type,
    })),
  ]

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i
    return { value: year, label: `Năm ${year}` }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {isEditMode ? 'Sửa ngân sách' : 'Tạo ngân sách mới'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {isEditMode ? 'Cập nhật thông tin ngân sách' : 'Đặt ngân sách cho hạng mục chi tiêu'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Đang tải...</div>
          ) : (
            <form onSubmit={handleSubmit} id="budget-form" className="space-y-4">
              {/* Category Select */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Hạng mục <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={categoryOptions}
                  value={formData.category_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  placeholder="Chọn hạng mục"
                  emptyMessage="Chưa có hạng mục chi tiêu"
                />
              </div>

              {/* Wallet Select (Optional) */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Ví (tùy chọn)
                </label>
                <CustomSelect
                  options={walletOptions}
                  value={formData.wallet_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, wallet_id: value }))}
                  placeholder="Chọn ví (để trống = tất cả ví)"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Số tiền ngân sách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => {
                    const formatted = formatVNDInput(e.target.value)
                    setFormData((prev) => ({ ...prev, amount: formatted }))
                  }}
                  onFocus={() => setIsNumberPadOpen(true)}
                  placeholder="Nhập số tiền"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 cursor-pointer"
                  required
                  readOnly
                />
              </div>

              {/* Period Type */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Loại ngân sách <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PERIOD_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, period_type: type.value }))}
                      className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                        formData.period_type === type.value
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month and Year (for monthly) */}
              {formData.period_type === 'monthly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                      Tháng
                    </label>
                    <CustomSelect
                      options={MONTHS.map(m => ({ value: m.value.toString(), label: m.label }))}
                      value={formData.month.toString()}
                      onChange={(value) => setFormData((prev) => ({ ...prev, month: parseInt(value) }))}
                      placeholder="Chọn tháng"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                      Năm
                    </label>
                    <CustomSelect
                      options={yearOptions.map(y => ({ value: y.value.toString(), label: y.label }))}
                      value={formData.year.toString()}
                      onChange={(value) => setFormData((prev) => ({ ...prev, year: parseInt(value) }))}
                      placeholder="Chọn năm"
                    />
                  </div>
                </div>
              )}

              {/* Year (for yearly) */}
              {formData.period_type === 'yearly' && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Năm
                  </label>
                  <CustomSelect
                    options={yearOptions.map(y => ({ value: y.value.toString(), label: y.label }))}
                    value={formData.year.toString()}
                    onChange={(value) => setFormData((prev) => ({ ...prev, year: parseInt(value) }))}
                    placeholder="Chọn năm"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Thêm ghi chú cho ngân sách này..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none sm:p-4"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <ModalFooterButtons
          onCancel={onClose}
          onConfirm={() => {}}
          confirmText={isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo ngân sách'}
          isSubmitting={isSubmitting}
              disabled={isSubmitting || isLoading}
          confirmButtonType="submit"
          formId="budget-form"
        />
      </div>

      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={isNumberPadOpen}
        onClose={() => setIsNumberPadOpen(false)}
        value={formData.amount}
        onChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
        onConfirm={() => setIsNumberPadOpen(false)}
      />
    </div>
  )
}

