import { useEffect } from 'react'
import { FaTimes, FaCheckCircle } from 'react-icons/fa'
import type { TaskRecord } from '../../lib/taskService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'

type TaskDayModalProps = {
  isOpen: boolean
  onClose: () => void
  tasks: TaskRecord[]
  date: string
  onTaskClick?: (task: TaskRecord) => void
}

export const TaskDayModal = ({ isOpen, onClose, tasks, date, onTaskClick }: TaskDayModalProps) => {
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

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      return `${components.day}/${components.month}/${components.year}`
    } catch {
      return dateStr
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'in_progress':
        return 'text-blue-600'
      case 'cancelled':
        return 'text-slate-400'
      default:
        return 'text-amber-600'
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành'
      case 'in_progress':
        return 'Đang làm'
      case 'cancelled':
        return 'Đã hủy'
      default:
        return 'Chờ'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[70vh] flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Công việc ngày {formatDate(date)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {tasks.length} {tasks.length === 1 ? 'công việc' : 'công việc'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Đóng"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                Không có công việc
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      if (onTaskClick) {
                        onTaskClick(task)
                      }
                      onClose()
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start gap-2">
                      {task.status === 'completed' && (
                        <FaCheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                            {getStatusText(task.status)}
                          </span>
                          {task.priority === 'urgent' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                              Khẩn
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

