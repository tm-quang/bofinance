import { FaStickyNote, FaDollarSign, FaTimes } from 'react-icons/fa'

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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Action Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md animate-in slide-in-from-bottom duration-300">
        <div className="rounded-t-3xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Chọn hành động</h3>
              <p className="mt-1 text-sm text-slate-500">{formatDate(date)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>

          {/* Options */}
          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                onSelectNote()
                onClose()
              }}
              className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 text-left transition-all hover:shadow-lg active:scale-95"
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
              className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-100/50 p-4 text-left transition-all hover:shadow-lg active:scale-95"
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

          {/* Cancel Button */}
          <div className="border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

