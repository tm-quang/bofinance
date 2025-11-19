import { FaClock, FaExclamationTriangle, FaCalendar, FaCheckSquare, FaEdit } from 'react-icons/fa'
import type { TaskRecord } from '../../lib/taskService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'

type TaskCardProps = {
    task: TaskRecord
    onClick: () => void
    isDeadlineApproaching: boolean
    isDeadlineOverdue: boolean
}

export const TaskCard = ({
    task,
    onClick,
    isDeadlineApproaching,
    isDeadlineOverdue,
}: TaskCardProps) => {
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
        if (isDeadlineOverdue) {
            return { text: 'Quá hạn', color: 'bg-red-500 text-white' }
        }
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
        // If completed, always green
        if (task.status === 'completed') return '#10B981' // green

        // If overdue, always red
        if (isDeadlineOverdue) return '#EF4444' // red

        // Color based on progress level: 0% (red), 25% (yellow), 50% (light blue), 75% (blue), 100% (green)
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

    // Get border style
    const borderStyle = task.status === 'completed'
        ? { borderColor: '#e2e8f0', borderWidth: '2px' } // slate-200
        : task.color
            ? { borderColor: task.color, borderWidth: '2px' }
            : { borderColor: '#cbd5e1', borderWidth: '1px' } // slate-300

    return (
        <div
            onClick={onClick}
            className="relative rounded-3xl bg-white p-5 shadow-lg transition-all active:scale-[0.99] hover:shadow-xl cursor-pointer"
            style={borderStyle}
        >
            {/* Color Indicator Bar */}
            {task.color && task.status !== 'completed' && (
                <div
                    className="h-1 w-full rounded-full mb-3"
                    style={{ backgroundColor: task.color }}
                />
            )}

            {/* Task Title */}
            <h4 className={`text-lg font-bold text-slate-900 mb-4 ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                {task.title}
            </h4>

            {/* Status Badge */}
            <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${statusInfo.color}`}>
                    {statusInfo.text}
                </span>
            </div>

            {/* Information Grid */}
            <div className="space-y-3 mb-4">
                {/* Deadline - Highlighted in Red */}
                {task.deadline && (
                    <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded-3xl px-3 py-2.5">
                        <FaCalendar className="text-red-500 shrink-0" />
                        <span className="text-red-700 font-semibold">Hạn chót:</span>
                        <span className={`font-bold ${isDeadlineOverdue ? 'text-red-600' : isDeadlineApproaching ? 'text-orange-600' : 'text-red-700'}`}>
                            {formatDate(task.deadline)} {formatTime(task.deadline)}
                        </span>
                        {(isDeadlineOverdue || isDeadlineApproaching) && (
                            <FaExclamationTriangle className={`ml-auto shrink-0 ${isDeadlineOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                        )}
                    </div>
                )}

                {/* Created Date */}
                {task.created_at && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FaEdit className="text-slate-400 shrink-0" />
                        <span>Tạo:</span>
                        <span className="font-medium text-slate-900">{formatDateTime(task.created_at)}</span>
                    </div>
                )}

                {/* Updated Date */}
                {task.updated_at && task.updated_at !== task.created_at && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FaClock className="text-slate-400 shrink-0" />
                        <span>Cập nhật:</span>
                        <span className="font-medium text-slate-900">{formatDateTime(task.updated_at)}</span>
                    </div>
                )}

                {/* Subtasks - Highlighted in Green */}
                {totalSubtasks > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-3xl px-3 py-2.5">
                        <FaCheckSquare className="text-green-500 shrink-0" />
                        <span className="text-green-700 font-semibold">Công việc phụ:</span>
                        <span className="font-bold text-green-700">
                            {completedSubtasks}/{totalSubtasks} hoàn thành
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Section */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex-1">
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

                {/* Circular Progress Indicator */}
                <div className="relative h-16 w-16 ml-4 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        {/* Background Circle */}
                        <path
                            className="text-slate-100"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                        />
                        {/* Progress Circle */}
                        <path
                            strokeDasharray={`${task.progress}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={progressColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="transition-all duration-500 ease-out"
                        />
                    </svg>
                    <div
                        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                        style={{ color: progressColor }}
                    >
                        {task.progress}%
                    </div>
                </div>
            </div>
        </div>
    )
}
