import { useEffect, useState } from 'react'
import { FaTimes, FaCalendar } from 'react-icons/fa'
import { createReminder, updateReminder, type ReminderRecord, type ReminderInsert } from '../../lib/reminderService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { ColorPicker } from './ColorPicker'

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
}

export const NoteModal = ({ isOpen, onClose, onSuccess, note, defaultDate }: NoteModalProps) => {
  const { success, error: showError } = useNotification()
  const isEditMode = !!note

  const [formState, setFormState] = useState<NoteFormState>({
    title: '',
    reminder_date: new Date().toISOString().split('T')[0],
    reminder_time: '',
    notes: '',
    color: 'amber',
    enable_notification: true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      })
    }
  }, [isOpen, note, defaultDate])

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
        reminder_date: new Date().toISOString().split('T')[0],
        reminder_time: '',
        notes: '',
        color: 'amber',
        enable_notification: true,
      })

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
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {isEditMode ? 'Sửa' : 'Tạo'} ghi chú
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {isEditMode ? 'Chỉnh sửa thông tin ghi chú' : 'Thêm ghi chú công việc mới'}
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

            {/* Date and Time - Grid */}
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {/* Date - Required */}
              <div>
                <label htmlFor="reminder_date" className="mb-0 block text-xs font-medium text-slate-600 sm:text-sm">
                  Ngày <span className="text-rose-500">*</span>
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
              form="note-form"
              className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 sm:py-3 sm:text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : `${isEditMode ? 'Cập nhật' : 'Tạo'} ghi chú`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

