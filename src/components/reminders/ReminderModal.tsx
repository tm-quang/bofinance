import { useEffect, useState } from 'react'
import { FaCalendar, FaTimes, FaArrowDown, FaArrowUp, FaClock, FaChevronDown, FaArrowLeft } from 'react-icons/fa'
import { CustomSelect } from '../ui/CustomSelect'
import { NumberPadModal } from '../ui/NumberPadModal'
import { DateTimePickerModal } from '../ui/DateTimePickerModal'
import { createReminder, updateReminder, type ReminderRecord, type ReminderInsert, type ReminderType, type RepeatType } from '../../lib/reminderService'
import { fetchCategories, type CategoryRecord, type CategoryType } from '../../lib/categoryService'
import { fetchWallets, getDefaultWallet, type WalletRecord } from '../../lib/walletService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../../utils/currencyInput'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { formatDateUTC7, getNowUTC7 } from '../../utils/dateUtils'
import { getIconNode } from '../../utils/iconLoader'
import { ColorPicker } from './ColorPicker'
import { IconPicker } from '../categories/IconPicker'

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
  icon_id: string
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
    icon_id: '',
    reminder_date: formatDateUTC7(getNowUTC7()),
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
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<React.ReactNode | null>(null)

  // Load wallets và categories khi modal mở
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Load wallets, categories, and default wallet with individual error handling
        let walletsData: WalletRecord[] = []
        let categoriesData: CategoryRecord[] = []
        let defaultId: string | null = null

        try {
          walletsData = await fetchWallets(false)
        } catch (err) {
          console.error('Error loading wallets:', err)
          // Continue with empty wallets array
        }

        try {
          categoriesData = await fetchCategories()
        } catch (err) {
          console.error('Error loading categories:', err)
          // Continue with empty categories array
        }

        try {
          defaultId = await getDefaultWallet()
        } catch (err) {
          console.error('Error loading default wallet:', err)
          // Continue without default wallet
        }

        setWallets(walletsData)
        setCategories(categoriesData)
        setDefaultWalletId(defaultId || null)

        // Load icons for all categories with better error handling
        const iconsMap: Record<string, React.ReactNode> = {}
        if (categoriesData.length > 0) {
          // Use Promise.allSettled instead of Promise.all to handle individual failures
          const iconPromises = categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNode(category.icon_id)
              if (iconNode) {
                // Wrap icon với kích thước cố định để hiển thị đúng trong CustomSelect
                return { 
                  categoryId: category.id, 
                  iconNode: (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
                      {iconNode}
                    </span>
                  )
                }
              } else {
                // Fallback to hardcoded icon
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  return { categoryId: category.id, iconNode: <IconComponent className="h-5 w-5" /> }
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                return { categoryId: category.id, iconNode: <IconComponent className="h-5 w-5" /> }
              }
            }
            return null
          })

          const results = await Promise.allSettled(iconPromises)
          results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              iconsMap[result.value.categoryId] = result.value.iconNode
            } else if (result.status === 'rejected') {
              // Try hardcoded fallback
              const category = categoriesData[index]
              if (category) {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-5 w-5" />
                }
              }
            }
          })
        }
        setCategoryIcons(iconsMap)
      } catch (err) {
        console.error('Unexpected error in loadData:', err)
        const errorMessage = err instanceof Error ? err.message : 'Không thể tải dữ liệu'
        setError(errorMessage)
        showError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadData().catch((err) => {
      console.error('Unhandled error in loadData:', err)
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
      showError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
      setIsLoading(false)
    })
  }, [isOpen, showError])

  // Populate form when editing
  useEffect(() => {
    if (isOpen && reminder) {
      setFormState({
        type: reminder.type,
        title: reminder.title,
        amount: reminder.amount ? formatVNDInput(reminder.amount.toString()) : '',
        category_id: reminder.category_id || '',
        wallet_id: reminder.wallet_id || '',
        icon_id: reminder.icon_id || '',
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
        icon_id: '',
        reminder_date: defaultDate || new Date().toISOString().split('T')[0],
        reminder_time: '',
        repeat_type: 'none',
        notes: '',
        color: 'rose',
        enable_notification: true,
      })
      setSelectedIcon(null)
    }
  }, [isOpen, reminder, defaultWalletId, defaultDate])

  // Load icon when icon_id changes
  useEffect(() => {
    const loadIcon = async () => {
      if (!formState.icon_id || !isOpen) {
        setSelectedIcon(null)
        return
      }

      try {
        // Fetch icon từ database bằng ID
        const { getIconById } = await import('../../lib/iconService')
        const icon = await getIconById(formState.icon_id)
        
        if (!icon) {
          setSelectedIcon(null)
          return
        }

        // Nếu có image_url, hiển thị ảnh trực tiếp
        if (icon.image_url) {
          setSelectedIcon(
            <img
              src={icon.image_url}
              alt={icon.label || 'Icon'}
              className="h-full w-full object-contain"
              onError={(e) => {
                console.warn('Failed to load icon image:', icon.image_url)
                e.currentTarget.style.display = 'none'
                setSelectedIcon(null)
              }}
            />
          )
        } else if (icon.icon_type === 'react-icon' && icon.react_icon_name && icon.react_icon_library) {
          // Nếu là react-icon, load icon component
          try {
            const { getCachedIconLibrary } = await import('../../utils/iconLoader')
            const library = await getCachedIconLibrary(icon.react_icon_library)
            if (library && library[icon.react_icon_name]) {
              const IconComponent = library[icon.react_icon_name]
              setSelectedIcon(<IconComponent className="h-full w-full" />)
            } else {
              console.warn('Icon component not found:', icon.react_icon_name, 'in library:', icon.react_icon_library)
              setSelectedIcon(null)
            }
          } catch (error) {
            console.error('Error loading react icon:', error)
            setSelectedIcon(null)
          }
        } else {
          // Các loại icon khác (svg, svg-url) - không hỗ trợ hiển thị trong reminder
          setSelectedIcon(null)
        }
      } catch (error) {
        // Không log error nếu là lỗi "not found" (đó là trường hợp bình thường)
        if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
          console.error('Error loading icon:', error)
        }
        setSelectedIcon(null)
      }
    }

    loadIcon()
  }, [formState.icon_id, isOpen])

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
        try {
          const amount = parseVNDInput(formState.amount)
          if (amount > 0) {
            reminderData.amount = amount
          }
        } catch (err) {
          console.error('Error parsing amount:', err)
          // Continue without amount if parsing fails
        }
      }

      if (formState.category_id) {
        reminderData.category_id = formState.category_id
      }

      if (formState.wallet_id) {
        reminderData.wallet_id = formState.wallet_id
      }

      if (formState.icon_id) {
        reminderData.icon_id = formState.icon_id
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
        icon_id: '',
        reminder_date: formatDateUTC7(getNowUTC7()),
        reminder_time: '',
        repeat_type: 'none',
        notes: '',
        color: 'rose',
        enable_notification: true,
      })
      setSelectedIcon(null)

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error submitting reminder:', err)
      let message = isEditMode ? 'Không thể cập nhật nhắc nhở' : 'Không thể tạo nhắc nhở'
      
      if (err instanceof Error) {
        // Provide more user-friendly error messages
        if (err.message.includes('not authenticated') || err.message.includes('User not authenticated')) {
          message = 'Bạn cần đăng nhập để tạo nhắc nhở'
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          message = 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại'
        } else if (err.message) {
          message = err.message
        }
      }
      
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F7F9FC]">
      {/* Header - Giống HeaderBar */}
      <header className="pointer-events-none relative z-10 flex-shrink-0 bg-[#F7F9FC]">
        <div className="relative px-1 py-1">
          <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100"
              aria-label="Đóng"
            >
              <FaArrowLeft className="h-5 w-5" />
            </button>
            <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
              {isEditMode ? 'Sửa' : 'Thêm'} kế hoạch
            </p>
            <div className="flex h-11 w-11 items-center justify-center">
              <button
                type="submit"
                form="reminder-form"
                disabled={isSubmitting}
                className="text-sm font-semibold text-sky-600 disabled:text-slate-400"
              >
                {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-h-0">
        <div className="mx-auto max-w-md">
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
                  Hạng mục (tùy chọn)
                </label>
                <CustomSelect
                  options={filteredCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                    icon: categoryIcons[category.id] || undefined,
                  }))}
                  value={formState.category_id}
                  onChange={(value) => setFormState((prev) => ({ ...prev, category_id: value }))}
                  placeholder="Chọn hạng mục"
                  loading={isLoading}
                  emptyMessage="Chưa có hạng mục"
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

            {/* Date and Time */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600 sm:text-sm">
                Ngày và giờ nhắc nhở <span className="text-rose-500">*</span>
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
                      try {
                        const date = new Date(formState.reminder_date)
                        if (isNaN(date.getTime())) {
                          return 'Chưa chọn ngày'
                        }
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
                      } catch (error) {
                        console.error('Error formatting date:', error)
                        return 'Chưa chọn ngày'
                      }
                    })()}
                  </div>
                  {formState.reminder_time && (
                    <>
                      <FaClock className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{formState.reminder_time}</span>
                    </>
                  )}
                </div>
                <FaChevronDown className="h-4 w-4 text-slate-400" />
              </button>
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

            {/* Icon Picker */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600 sm:text-sm">
                Biểu tượng (tùy chọn)
              </label>
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
              >
                {selectedIcon ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                    {selectedIcon}
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <span className="text-sm">?</span>
                  </div>
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">
                    {formState.icon_id ? 'Đã chọn biểu tượng' : 'Chọn biểu tượng'}
                  </span>
                </div>
                {formState.icon_id && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setFormState((prev) => ({ ...prev, icon_id: '' }))
                      setSelectedIcon(null)
                    }}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        setFormState((prev) => ({ ...prev, icon_id: '' }))
                        setSelectedIcon(null)
                      }
                    }}
                  >
                    <FaTimes className="h-4 w-4" />
                  </div>
                )}
              </button>
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
      </div>

      {/* Icon Picker Modal */}
      <IconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(iconId) => {
          setFormState((prev) => ({ ...prev, icon_id: iconId }))
          setIsIconPickerOpen(false)
        }}
        selectedIconId={formState.icon_id}
      />

      {/* DateTime Picker Modal */}
      <DateTimePickerModal
        isOpen={isDateTimePickerOpen}
        onClose={() => setIsDateTimePickerOpen(false)}
        onConfirm={(date, time) => {
          setFormState((prev) => ({
            ...prev,
            reminder_date: date,
            reminder_time: time || '',
          }))
        }}
        initialDate={formState.reminder_date}
        initialTime={formState.reminder_time}
        showTime={true}
      />

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


