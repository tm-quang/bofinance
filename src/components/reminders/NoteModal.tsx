import { useEffect, useState } from 'react'
import { FaTimes, FaCalendar, FaClock, FaChevronDown, FaArrowLeft } from 'react-icons/fa'
import { createReminder, updateReminder, type ReminderRecord, type ReminderInsert } from '../../lib/reminderService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { ColorPicker } from './ColorPicker'
import { DateTimePickerModal } from '../ui/DateTimePickerModal'
import { IconPicker } from '../categories/IconPicker'
import { formatDateUTC7, getNowUTC7 } from '../../utils/dateUtils'

type NoteModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  note?: ReminderRecord | null
  defaultDate?: string
}

type NoteFormState = {
  title: string
  reminder_date: string
  reminder_time: string
  notes: string
  color: string
  enable_notification: boolean
  icon_id: string
}

export const NoteModal = ({ isOpen, onClose, onSuccess, note, defaultDate }: NoteModalProps) => {
  const { success, error: showError } = useNotification()
  const isEditMode = !!note

  const [formState, setFormState] = useState<NoteFormState>({
    title: '',
    reminder_date: formatDateUTC7(getNowUTC7()),
    reminder_time: '',
    notes: '',
    color: 'amber',
    enable_notification: true,
    icon_id: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<React.ReactNode | null>(null)

  // Populate form when editing
  useEffect(() => {
    if (isOpen && note) {
      setFormState({
        title: note.title,
        reminder_date: note.reminder_date,
        reminder_time: note.reminder_time || '',
        notes: note.notes || '',
        color: note.color || 'amber',
        enable_notification: note.enable_notification !== undefined ? note.enable_notification : true,
        icon_id: note.icon_id || '',
      })
    } else if (isOpen && !note) {
      // Reset form when creating new note
      setFormState({
        title: '',
        reminder_date: defaultDate || new Date().toISOString().split('T')[0],
        reminder_time: '',
        notes: '',
        color: 'amber',
        enable_notification: true,
        icon_id: '',
      })
      setSelectedIcon(null)
    }
  }, [isOpen, note, defaultDate])

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
          // Các loại icon khác (svg, svg-url) - không hỗ trợ hiển thị trong note
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formState.title.trim()) {
      const message = 'Vui lòng nhập tiêu đề ghi chú'
      setError(message)
      showError(message)
      return
    }
    if (!formState.reminder_date) {
      const message = 'Vui lòng chọn ngày'
      setError(message)
      showError(message)
      return
    }

    setIsSubmitting(true)
    try {
      const noteData: ReminderInsert = {
        type: 'Chi', // Default type for notes (not used for display)
        title: formState.title.trim(),
        reminder_date: formState.reminder_date,
        repeat_type: 'none',
        color: formState.color,
        enable_notification: formState.enable_notification,
      }

      if (formState.reminder_time) {
        noteData.reminder_time = formState.reminder_time
      }

      if (formState.notes.trim()) {
        noteData.notes = formState.notes.trim()
      }

      if (formState.icon_id) {
        noteData.icon_id = formState.icon_id
      }

      if (isEditMode && note) {
        await updateReminder(note.id, noteData)
        success('Đã cập nhật ghi chú thành công!')
      } else {
        await createReminder(noteData)
        success('Đã tạo ghi chú thành công!')
      }

      // Reset form
      setFormState({
        title: '',
        reminder_date: formatDateUTC7(getNowUTC7()),
        reminder_time: '',
        notes: '',
        color: 'amber',
        enable_notification: true,
        icon_id: '',
      })
      setSelectedIcon(null)

      onSuccess?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : (isEditMode ? 'Không thể cập nhật ghi chú' : 'Không thể tạo ghi chú')
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
              {isEditMode ? 'Sửa' : 'Tạo'} ghi chú
            </p>
            <div className="flex h-11 w-11 items-center justify-center">
              <button
                type="submit"
                form="note-form"
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
          <form onSubmit={handleSubmit} id="note-form" className="space-y-4">
            {/* Title - Required */}
            <div>
              <label htmlFor="title" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                Tiêu đề ghi chú <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nhập tiêu đề ghi chú..."
                className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                required
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

            {/* Date and Time */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600 sm:text-sm">
                Ngày và giờ <span className="text-rose-500">*</span>
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

            {/* Notes - Optional */}
            <div>
              <label htmlFor="notes" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                Nội dung ghi chú (tùy chọn)
              </label>
              <textarea
                id="notes"
                value={formState.notes}
                onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Nhập nội dung chi tiết..."
                rows={4}
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
    </div>
  )
}

