import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HeaderBar from '../components/layout/HeaderBar'
import { CustomSelect } from '../components/ui/CustomSelect'
import { NumberPadModal } from '../components/ui/NumberPadModal'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import { fetchCategories } from '../lib/categoryService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import {
  createBudget,
  updateBudget,
  getBudgetById,
  calculatePeriod,
  type BudgetInsert,
  type PeriodType,
} from '../lib/budgetService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../utils/currencyInput'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNodeFromCategory } from '../utils/iconLoader'
import { LoadingRing } from '../components/ui/LoadingRing'
import { FaWallet } from 'react-icons/fa'
import { fetchCategoriesHierarchical, type CategoryWithChildren } from '../lib/categoryService'
import { CategorySelectHierarchical } from '../components/ui/CategorySelectHierarchical'

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

export const AddBudgetPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { success, error: showError } = useNotification()
  
  const budgetId = searchParams.get('id')
  const isEditMode = !!budgetId

  const [formData, setFormData] = useState({
    category_id: '',
    wallet_id: '',
    amount: '',
    period_type: 'monthly' as PeriodType,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    weekStartDate: new Date().toISOString().split('T')[0], // For weekly: date to calculate week from
    limit_type: 'soft' as 'hard' | 'soft',
    notes: '',
  })

  const [hierarchicalCategories, setHierarchicalCategories] = useState<CategoryWithChildren[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [categoriesData, hierarchicalData, walletsData] = await Promise.all([
          fetchCategories(),
          fetchCategoriesHierarchical('Chi tiêu'),
          fetchWallets(false),
        ])

        // Filter only expense categories
        const expenseCategories = categoriesData.filter(c => c.type === 'Chi tiêu')
        
        // Load icons for all categories using icon_url from category
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          expenseCategories.map(async (category) => {
            try {
              const iconNode = await getIconNodeFromCategory(category.icon_id, category.icon_url, 'h-full w-full object-cover rounded-full')
              if (iconNode) {
                // Wrap icon to ensure consistent small size
                iconsMap[category.id] = (
                  <span className="text-sm inline-flex items-center justify-center h-3.5 w-3.5 rounded-full overflow-hidden">
                    {iconNode}
                  </span>
                )
              } else {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-3.5 w-3.5" />
                } else {
                  iconsMap[category.id] = <span className="text-sm">💰</span>
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-3.5 w-3.5" />
              } else {
                iconsMap[category.id] = <span className="text-sm">💰</span>
              }
            }
          })
        )
        setCategoryIcons(iconsMap)
        
        setHierarchicalCategories(hierarchicalData)
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
              weekStartDate: budget.period_type === 'weekly' ? budget.period_start : new Date().toISOString().split('T')[0],
              limit_type: budget.limit_type || 'soft',
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
            weekStartDate: now.toISOString().split('T')[0],
            limit_type: 'soft',
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
  }, [budgetId, showError])

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
      const message = 'Số tiền hạn mức phải lớn hơn 0'
      setError(message)
      showError(message)
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate period dates - ensure not in the past
      const weekStartDate = formData.period_type === 'weekly' ? new Date(formData.weekStartDate) : undefined
      const period = calculatePeriod(
        formData.period_type,
        formData.year,
        formData.period_type === 'monthly' ? formData.month : undefined,
        weekStartDate
      )
      
      // Format dates in UTC+7 timezone
      const { formatDateUTC7 } = await import('../utils/dateUtils')
      
      const payload: BudgetInsert = {
        category_id: formData.category_id,
        wallet_id: formData.wallet_id || null,
        amount: parseVNDInput(formData.amount),
        period_type: formData.period_type,
        period_start: formatDateUTC7(period.start),
        period_end: formatDateUTC7(period.end),
        limit_type: formData.limit_type,
        notes: formData.notes || undefined,
      }

      if (isEditMode && budgetId) {
        await updateBudget(budgetId, payload)
        success('Đã cập nhật hạn mức thành công!')
      } else {
        await createBudget(payload)
        success('Đã tạo hạn mức thành công!')
      }

      // Navigate back
      navigate(-1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể lưu hạn mức'
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Category options are now handled by CategorySelectHierarchical

  const walletOptions = [
    { value: '', label: 'Tất cả ví', icon: <FaWallet className="h-4 w-4" /> },
    ...wallets.map(wallet => ({
      value: wallet.id,
      label: wallet.name,
      icon: <FaWallet className="h-4 w-4" />,
      metadata: wallet.type,
    })),
  ]

  // Get current date for filtering
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Year options: only current year and future years
  const yearOptions = Array.from({ length: 3 }, (_, i) => {
    const year = currentYear + i
    return { value: year, label: `Năm ${year}` }
  })

  // Month options: only current month and future months (if same year) or all months (if future year)
  const getAvailableMonths = () => {
    if (formData.year === currentYear) {
      // Only show current month and future months
      return MONTHS.filter(m => m.value >= currentMonth)
    } else if (formData.year > currentYear) {
      // Show all months for future years
      return MONTHS
    } else {
      // Past year - should not happen, but show current month onwards
      return MONTHS.filter(m => m.value >= currentMonth)
    }
  }

  // Get Monday of a given date (week starts on Monday)
  const getMonday = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(d.setDate(diff))
  }

  // Get Sunday of a given week (week ends on Sunday)
  const getSunday = (monday: Date): Date => {
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return sunday
  }

  // Format week range for display
  const formatWeekRange = (dateStr: string): string => {
    const date = new Date(dateStr)
    const monday = getMonday(date)
    const sunday = getSunday(monday)
    
    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      return `${day}/${month}/${d.getFullYear()}`
    }
    
    return `${formatDate(monday)} - ${formatDate(sunday)}`
  }

  // Get minimum date for week picker (current week start)
  const getMinWeekDate = (): string => {
    const currentWeekStart = getMonday(now)
    return currentWeekStart.toISOString().split('T')[0]
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar 
        variant="page" 
        title={isEditMode ? 'SỬA HẠN MỨC' : 'TẠO HẠN MỨC'}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-2 pb-5 sm:pt-2 sm:pb-6">
          {error && (
            <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-200 p-4 text-sm text-rose-700 font-medium shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <LoadingRing size="md" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="budget-form" className="space-y-5">
              {/* Category Select */}
              <div>
                <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                  Hạng mục <span className="text-red-500">*</span>
                </label>
                <CategorySelectHierarchical
                  categories={hierarchicalCategories}
                  categoryIcons={categoryIcons}
                  value={formData.category_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  placeholder="Chọn hạng mục"
                  emptyMessage="Chưa có hạng mục chi tiêu"
                />
              </div>

              {/* Wallet Select (Optional) */}
              <div>
                <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
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
                <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                  Số tiền hạn mức <span className="text-red-500">*</span>
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
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-base font-semibold text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-5 cursor-pointer"
                  required
                  readOnly
                />
              </div>

              {/* Period Type */}
              <div>
                <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                  Loại hạn mức <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PERIOD_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        const now = new Date()
                        setFormData((prev) => ({
                          ...prev,
                          period_type: type.value,
                          // Reset to current period when changing type
                          month: now.getMonth() + 1,
                          year: now.getFullYear(),
                          weekStartDate: now.toISOString().split('T')[0],
                        }))
                      }}
                      className={`rounded-2xl border-2 p-4 text-sm font-semibold transition-all ${
                        formData.period_type === type.value
                          ? 'border-sky-500 bg-gradient-to-br from-sky-50 to-blue-50 text-sky-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit Type */}
              <div>
                <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                  Loại giới hạn <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, limit_type: 'soft' }))}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      formData.limit_type === 'soft'
                        ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1.5">Giới hạn mềm</div>
                    <div className="text-xs text-slate-600 font-medium">Cảnh báo khi vượt quá</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, limit_type: 'hard' }))}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      formData.limit_type === 'hard'
                        ? 'border-rose-500 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1.5">Giới hạn cứng</div>
                    <div className="text-xs text-slate-600 font-medium">Từ chối khi vượt quá</div>
                  </button>
                </div>
                <div className={`mt-3 rounded-xl p-3 ${
                  formData.limit_type === 'soft' 
                    ? 'bg-amber-50 border border-amber-200' 
                    : 'bg-rose-50 border border-rose-200'
                }`}>
                  <p className="text-xs font-medium text-slate-700">
                    {formData.limit_type === 'soft' 
                      ? '⚠️ Hệ thống sẽ cảnh báo nhưng vẫn cho phép giao dịch khi vượt quá hạn mức'
                      : '🚫 Hệ thống sẽ từ chối giao dịch khi vượt quá hạn mức'}
                  </p>
                </div>
              </div>

              {/* Month and Year (for monthly) */}
              {formData.period_type === 'monthly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                      Tháng
                    </label>
                    <CustomSelect
                      options={getAvailableMonths().map(m => ({ value: m.value.toString(), label: m.label }))}
                      value={formData.month.toString()}
                      onChange={(value) => {
                        const month = parseInt(value)
                        setFormData((prev) => {
                          // If selected month is in the past, use current month
                          if (prev.year === currentYear && month < currentMonth) {
                            return { ...prev, month: currentMonth }
                          }
                          return { ...prev, month }
                        })
                      }}
                      placeholder="Chọn tháng"
                    />
                    {formData.year === currentYear && formData.month < currentMonth && (
                      <p className="mt-1 text-xs text-amber-600">Đã tự động chọn tháng hiện tại</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                      Năm
                    </label>
                    <CustomSelect
                      options={yearOptions.map(y => ({ value: y.value.toString(), label: y.label }))}
                      value={formData.year.toString()}
                      onChange={(value) => {
                        const year = parseInt(value)
                        setFormData((prev) => {
                          // If selected year is current year and month is in the past, use current month
                          if (year === currentYear && prev.month < currentMonth) {
                            return { ...prev, year, month: currentMonth }
                          }
                          return { ...prev, year }
                        })
                      }}
                      placeholder="Chọn năm"
                    />
                  </div>
                </div>
              )}

              {/* Week selection (for weekly) */}
              {formData.period_type === 'weekly' && (
                <div>
                  <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                    Tuần bắt đầu
                  </label>
                  <input
                    type="date"
                    value={formData.weekStartDate}
                    min={getMinWeekDate()}
                    onChange={(e) => {
                      const selectedDate = e.target.value
                      const date = new Date(selectedDate)
                      const weekStart = getMonday(date)
                      const weekEnd = getSunday(weekStart)
                      
                      // If selected week is in the past, use current week
                      if (weekEnd < now) {
                        const currentWeekStart = getMonday(now)
                        setFormData((prev) => ({ ...prev, weekStartDate: currentWeekStart.toISOString().split('T')[0] }))
                      } else {
                        setFormData((prev) => ({ ...prev, weekStartDate: weekStart.toISOString().split('T')[0] }))
                      }
                    }}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-5"
                  />
                  <p className="mt-2 text-xs text-slate-600">
                    Tuần: {formatWeekRange(formData.weekStartDate)}
                  </p>
                  {new Date(formData.weekStartDate) < getMonday(now) && (
                    <p className="mt-1 text-xs text-amber-600">Đã tự động chọn tuần hiện tại</p>
                  )}
                </div>
              )}

              {/* Year (for yearly) */}
              {formData.period_type === 'yearly' && (
                <div>
                  <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
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
                <label className="mb-2.5 block text-sm font-bold text-slate-900 sm:text-base">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Thêm ghi chú cho hạn mức này..."
                  rows={3}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none sm:p-5"
                />
              </div>

            </form>
          )}
        </div>
      </main>

      {/* Fixed Footer with Action Buttons */}
      <ModalFooterButtons
        onCancel={() => navigate(-1)}
        onConfirm={() => {}}
        confirmText={isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo hạn mức'}
        isSubmitting={isSubmitting}
        disabled={isSubmitting || isLoading}
        confirmButtonType="submit"
        formId="budget-form"
        fixed={true}
      />

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

export default AddBudgetPage

