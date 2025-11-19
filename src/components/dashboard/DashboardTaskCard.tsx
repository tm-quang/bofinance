import { useState } from 'react'
import { FaChevronDown, FaChevronUp, FaCalendar, FaClock, FaCheckSquare, FaExclamationTriangle } from 'react-icons/fa'
import type { TaskRecord } from '../../lib/taskService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'

type DashboardTaskCardProps = {
  task: TaskRecord
  onClick?: () => void
}

export const DashboardTaskCard = ({ task, onClick }: DashboardTaskCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Format date to DD/MM/YYYY
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      return `${components.day}/${components.month}/${components.year}`
    } catch {
      return ''
    }
  }

  // Format time HH:MM
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+07:00')
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return ''
    }
  }

  // Format datetime to DD/MM/YYYY HH:MM
  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return ''
    const date = formatDate(dateStr)
    const time = formatTime(dateStr)
    return date && time ? `${date} ${time}` : date || time
  }

  // Get status text and color
  const getStatusInfo = () => {
    switch (task.status) {
      case 'completed':
        return { text: 'Hoàn thành', color: 'bg-green-500 text-white' }
      case 'in_progress':
        return { text: 'Đang làm', color: 'bg-blue-500 text-white' }
      case 'cancelled':
        return { text: 'Đã hủy', color: 'bg-slate-400 text-white' }
      default:
        return { text: 'Chờ', color: 'bg-amber-500 text-white' }
    }
  }

  const statusInfo = getStatusInfo()
  
  // Get progress color based on progress level
  const getProgressColor = () => {
    if (task.status === 'completed') return '#10B981' // green
    const progress = task.progress
    if (progress === 0) return '#EF4444' // red (0%)
    if (progress > 0 && progress <= 25) return '#F59E0B' // yellow/amber (1-25%)
    if (progress > 25 && progress <= 50) return '#60A5FA' // light blue (26-50%)
    if (progress > 50 && progress <= 75) return '#3B82F6' // blue (51-75%)
    if (progress > 75 && progress < 100) return '#3B82F6' // blue (76-99%)
    if (progress === 100) return '#10B981' // green (100%)
    return '#F59E0B' // default amber
  }

  const progressColor = getProgressColor()

  // Calculate subtask info
  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter(s => s.completed).length
  const totalSubtasks = subtasks.length

  // Check if deadline is approaching or overdue
  const isDeadlineApproaching = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  }

  const isDeadlineOverdue = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    return deadlineDate.getTime() < now.getTime() && deadlineDate.getDate() !== now.getDate()
  }

  const isApproaching = isDeadlineApproaching(task.deadline)
  const isOverdue = isDeadlineOverdue(task.deadline)

  // Get border style
  const borderStyle = task.status === 'completed' 
    ? { borderColor: '#e2e8f0', borderWidth: '2px' }
    : task.color 
      ? { borderColor: task.color, borderWidth: '2px' }
      : { borderColor: '#cbd5e1', borderWidth: '1px' }

  return (
    <div
      className="rounded-2xl bg-white border-2 transition-all hover:shadow-md cursor-pointer"
      style={borderStyle}
    >
      {/* Collapsed View */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {task.color && task.status !== 'completed' && (
              <div 
                className="h-4 w-1 rounded-full shrink-0"
                style={{ backgroundColor: task.color }}
              />
            )}
            <h4 className={`text-base font-bold text-slate-900 truncate ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </h4>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
            {task.deadline && (
              <div className="flex items-center gap-1">
                <FaCalendar className="text-slate-400" />
                <span>{formatDate(task.deadline)}</span>
                {(isOverdue || isApproaching) && (
                  <FaExclamationTriangle className={`${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                )}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium" style={{ color: progressColor }}>
                {task.progress}%
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="ml-3 p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
        >
          {isExpanded ? (
            <FaChevronUp className="text-slate-400" />
          ) : (
            <FaChevronDown className="text-slate-400" />
          )}
        </button>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3">
          {/* Description */}
          {task.description && (
            <p className="text-sm text-slate-600 mt-3">{task.description}</p>
          )}

          {/* Information Grid */}
          <div className="space-y-2">
            {/* Deadline - Highlighted in Red */}
            {task.deadline && (
              <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
                <FaCalendar className="text-red-500 shrink-0" />
                <span className="text-red-700 font-semibold">Hạn chót:</span>
                <span className={`font-bold ${isOverdue ? 'text-red-600' : isApproaching ? 'text-orange-600' : 'text-red-700'}`}>
                  {formatDate(task.deadline)} {formatTime(task.deadline)}
                </span>
                {(isOverdue || isApproaching) && (
                  <FaExclamationTriangle className={`ml-auto shrink-0 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                )}
              </div>
            )}

            {/* Created Date */}
            {task.created_at && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FaClock className="text-slate-400 shrink-0" />
                <span>Tạo:</span>
                <span className="font-medium text-slate-900">{formatDateTime(task.created_at)}</span>
              </div>
            )}

            {/* Subtasks - Highlighted in Green */}
            {totalSubtasks > 0 && (
              <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-2xl px-3 py-2">
                <FaCheckSquare className="text-green-500 shrink-0" />
                <span className="text-green-700 font-semibold">Công việc phụ:</span>
                <span className="font-bold text-green-700">
                  {completedSubtasks}/{totalSubtasks} hoàn thành
                </span>
              </div>
            )}
          </div>

          {/* Progress Section */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">Tiến độ</span>
              <span className="text-xs font-bold" style={{ color: progressColor }}>
                {task.progress}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${task.progress}%`,
                  backgroundColor: progressColor
                }}
              />
            </div>
            {totalSubtasks > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {completedSubtasks}/{totalSubtasks} công việc phụ đã hoàn thành
              </p>
            )}
          </div>

          {/* View Details Button */}
          {onClick && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="w-full mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Xem chi tiết
            </button>
          )}
        </div>
      )}
    </div>
  )
}

