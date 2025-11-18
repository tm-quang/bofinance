import { FaStickyNote, FaDollarSign, FaArrowLeft } from 'react-icons/fa'

type CalendarActionSheetProps = {
  isOpen: boolean
  onClose: () => void
  onSelectNote: () => void
  onSelectReminder: () => void
  date: string
}

export const CalendarActionSheet = ({
  isOpen,
  onClose,
  onSelectNote,
  onSelectReminder,
  date,
}: CalendarActionSheetProps) => {
  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

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
            <div className="flex-1 px-4 text-center">
              <p className="text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
                Chọn hành động
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(date)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center text-slate-500">
              {/* Empty space để cân bằng layout */}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 min-h-0">
        <div className="mx-auto max-w-md space-y-3">
          <button
            type="button"
            onClick={() => {
              onSelectNote()
              onClose()
            }}
            className="flex w-full items-center gap-4 rounded-2xl bg-white ring-1 ring-slate-200 p-4 text-left transition-all hover:shadow-lg active:scale-95"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <FaStickyNote className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900">Tạo ghi chú</h4>
              <p className="mt-1 text-sm text-slate-600">
                Thêm ghi chú công việc với thông báo
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectReminder()
              onClose()
            }}
            className="flex w-full items-center gap-4 rounded-2xl bg-white ring-1 ring-slate-200 p-4 text-left transition-all hover:shadow-lg active:scale-95"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white">
              <FaDollarSign className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900">Nhập khoản thu/chi</h4>
              <p className="mt-1 text-sm text-slate-600">
                Tạo nhắc nhở về khoản thu nhập hoặc chi tiêu
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

