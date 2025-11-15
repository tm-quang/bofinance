import { useEffect, useState } from 'react'
import { FaCalendar, FaTimes, FaArrowDown, FaArrowUp } from 'react-icons/fa'
import { CustomSelect } from '../ui/CustomSelect'
import { NumberPadModal } from '../ui/NumberPadModal'
import { createReminder, updateReminder, type ReminderRecord, type ReminderInsert, type ReminderType, type RepeatType } from '../../lib/reminderService'
import { fetchCategories, type CategoryRecord, type CategoryType } from '../../lib/categoryService'
import { fetchWallets, getDefaultWallet, type WalletRecord } from '../../lib/walletService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../../utils/currencyInput'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { getIconNode } from '../../utils/iconLoader'
import { ColorPicker } from './ColorPicker'

type ReminderModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  reminder?: ReminderRecord | null
  defaultDate?: string
}

type ReminderFormState = {
  type: ReminderType
  title: string
  amount: string
  category_id: string
  wallet_id: string
  reminder_date: string
  reminder_time: string
  repeat_type: RepeatType
  notes: string
  color: string
  enable_notification: boolean
}

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'Không lặp lại' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'yearly', label: 'Hàng năm' },
]

export const ReminderModal = ({ isOpen, onClose, onSuccess, reminder, defaultDate }: ReminderModalProps) => {
  const { success, error: showError } = useNotification()
  const isEditMode = !!reminder

  const [formState, setFormState] = useState<ReminderFormState>({
    type: 'Chi',
    title: '',
    amount: '',
    category_id: '',
    wallet_id: '',
    reminder_date: new Date().toISOString().split('T')[0],
    reminder_time: '',
    repeat_type: 'none',
    notes: '',
    color: 'rose',
    enable_notification: true,
  })

  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)

  // Load wallets và categories khi modal mở
  useEffect(() => {
    if (!isOpen) return

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
    if (isOpen && reminder) {
      setFormState({
        type: reminder.type,
        title: reminder.title,
        amount: reminder.amount ? formatVNDInput(reminder.amount.toString()) : '',
        category_id: reminder.category_id || '',
        wallet_id: reminder.wallet_id || '',
        reminder_date: reminder.reminder_date,
        reminder_time: reminder.reminder_time || '',
        repeat_type: reminder.repeat_type || 'none',
        notes: reminder.notes || '',
        color: reminder.color || (reminder.type === 'Thu' ? 'emerald' : 'rose'),
        enable_notification: reminder.enable_notification !== undefined ? reminder.enable_notification : true,
      })
    } else if (isOpen && !reminder) {
      // Reset form when creating new reminder
      setFormState({
        type: 'Chi',
        title: '',
        amount: '',
        category_id: '',
        wallet_id: defaultWalletId || '',
        reminder_date: defaultDate || new Date().toISOString().split('T')[0],
        reminder_time: '',
        repeat_type: 'none',
        notes: '',
        color: 'rose',
        enable_notification: true,
      })
    }
  }, [isOpen, reminder, defaultWalletId, defaultDate])

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
    if (!formState.title.trim()) {
      const message = 'Vui lòng nhập mô tả nhắc nhở'
      setError(message)
      showError(message)
      return
    }
    if (!formState.reminder_date) {
      const message = 'Vui lòng chọn ngày nhắc nhở'
      setError(message)
      showError(message)
      return
    }

    setIsSubmitting(true)
    try {
      const reminderData: ReminderInsert = {
        type: formState.type,
        title: formState.title.trim(),
        reminder_date: formState.reminder_date,
        repeat_type: formState.repeat_type,
      }

      if (formState.amount) {
        const amount = parseVNDInput(formState.amount)
        if (amount > 0) {
          reminderData.amount = amount
        }
      }

      if (formState.category_id) {
        reminderData.category_id = formState.category_id
      }

      if (formState.wallet_id) {
        reminderData.wallet_id = formState.wallet_id
      }

      if (formState.reminder_time) {
        reminderData.reminder_time = formState.reminder_time
      }

      if (formState.notes.trim()) {
        reminderData.notes = formState.notes.trim()
      }

      reminderData.color = formState.color
      reminderData.enable_notification = formState.enable_notification

      if (isEditMode && reminder) {
        await updateReminder(reminder.id, reminderData)
        success('Đã cập nhật nhắc nhở thành công!')
      } else {
        await createReminder(reminderData)
        success('Đã tạo nhắc nhở thành công!')
      }

      // Reset form
      setFormState({
        type: 'Chi',
        title: '',
        amount: '',
        category_id: '',
        wallet_id: '',
        reminder_date: new Date().toISOString().split('T')[0],
        reminder_time: '',
        repeat_type: 'none',
        notes: '',
        color: 'rose',
        enable_notification: true,
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : (isEditMode ? 'Không thể cập nhật nhắc nhở' : 'Không thể tạo nhắc nhở')
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

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {isEditMode ? 'Sửa' : 'Thêm'} nhắc nhở
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {isEditMode ? 'Chỉnh sửa thông tin nhắc nhở' : 'Tạo nhắc nhở mới'}
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
          <form onSubmit={handleSubmit} id="reminder-form" className="space-y-4">
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

            {/* Title - Required */}
            <div>
              <label htmlFor="title" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                Mô tả nhắc nhở <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nhập mô tả nhắc nhở..."
                className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                required
              />
            </div>

            {/* Amount and Category - Grid */}
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {/* Amount - Optional */}
              <div>
                <label htmlFor="amount" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Số tiền (tùy chọn)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="amount"
                    value={formState.amount}
                    onChange={(e) => {
                      const formatted = formatVNDInput(e.target.value)
                      setFormState((prev) => ({ ...prev, amount: formatted }))
                    }}
                    onFocus={() => setIsNumberPadOpen(true)}
                    placeholder="Nhập số tiền"
                    className="h-full w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-base font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 sm:text-lg cursor-pointer"
                    readOnly
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                    ₫
                  </span>
                </div>
              </div>

              {/* Category - Optional */}
              <div>
                <label className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Danh mục (tùy chọn)
                </label>
                <CustomSelect
                  options={filteredCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                    icon: categoryIcons[category.id] || undefined,
                  }))}
                  value={formState.category_id}
                  onChange={(value) => setFormState((prev) => ({ ...prev, category_id: value }))}
                  placeholder="Chọn danh mục"
                  loading={isLoading}
                  emptyMessage="Chưa có danh mục"
                  className="h-12"
                />
              </div>
            </div>

            {/* Wallet - Optional */}
            <div>
              <label className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                Ví (tùy chọn)
              </label>
              <CustomSelect
                options={wallets.map((wallet) => ({
                  value: wallet.id,
                  label: wallet.name,
                  metadata: formatVNDInput(wallet.balance.toString()),
                }))}
                value={formState.wallet_id}
                onChange={(value) => setFormState((prev) => ({ ...prev, wallet_id: value }))}
                placeholder="Chọn ví"
                loading={isLoading}
                emptyMessage="Chưa có ví"
                className="h-12"
              />
            </div>

            {/* Date and Time - Grid */}
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {/* Date - Required */}
              <div>
                <label htmlFor="reminder_date" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Ngày nhắc nhở <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FaCalendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    id="reminder_date"
                    value={formState.reminder_date}
                    onChange={(e) => setFormState((prev) => ({ ...prev, reminder_date: e.target.value }))}
                    className="h-full w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pl-11 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                    required
                  />
                </div>
              </div>

              {/* Time - Optional */}
              <div>
                <label htmlFor="reminder_time" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Giờ (tùy chọn)
                </label>
                <input
                  type="time"
                  id="reminder_time"
                  value={formState.reminder_time}
                  onChange={(e) => setFormState((prev) => ({ ...prev, reminder_time: e.target.value }))}
                  className="h-full w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                />
              </div>
            </div>

            {/* Repeat Type */}
            <div>
              <label className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                Lặp lại
              </label>
              <CustomSelect
                options={REPEAT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={formState.repeat_type}
                onChange={(value) => setFormState((prev) => ({ ...prev, repeat_type: value as RepeatType }))}
                placeholder="Chọn tần suất"
                className="h-12"
              />
            </div>

            {/* Notes - Optional */}
            <div>
              <label htmlFor="notes" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                id="notes"
                value={formState.notes}
                onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Nhập ghi chú..."
                rows={3}
                className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 resize-none"
              />
            </div>

            {/* Color Picker */}
            <div>
              <ColorPicker
                value={formState.color}
                onChange={(color) => setFormState((prev) => ({ ...prev, color }))}
                label="Màu sắc"
              />
            </div>

            {/* Enable Notification */}
            <div className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-4">
              <div>
                <label htmlFor="enable_notification" className="text-sm font-medium text-slate-900">
                  Bật thông báo
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Nhận thông báo khi đến giờ nhắc nhở
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, enable_notification: !prev.enable_notification }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formState.enable_notification ? 'bg-sky-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formState.enable_notification ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
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
              form="reminder-form"
              className={`flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 sm:py-3 sm:text-base ${
                formState.type === 'Thu' ? 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' : ''
              }`}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Đang lưu...' : `${isEditMode ? 'Cập nhật' : 'Tạo'} nhắc nhở`}
            </button>
          </div>
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
    </div>
  )
}

