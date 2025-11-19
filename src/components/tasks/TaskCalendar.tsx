import { useState, useEffect, useMemo, useRef } from 'react'
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaCalendarWeek } from 'react-icons/fa'
import type { TaskRecord } from '../../lib/taskService'
import { createDateUTC7, formatDateUTC7, getDateComponentsUTC7, getNowUTC7 } from '../../utils/dateUtils'

type TaskCalendarProps = {
  tasks: TaskRecord[]
  onDateClick: (date: string) => void
  selectedDate?: string
  onMonthChange?: (year: number, month: number) => void
  disableRipple?: boolean
  onDateWithTasksClick?: (date: string) => void
}

const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

export const TaskCalendar = ({
  tasks,
  onDateClick,
  selectedDate,
  onMonthChange,
  disableRipple = false,
  onDateWithTasksClick,
}: TaskCalendarProps) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(() => {
    const now = getNowUTC7()
    return now
  })
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTargetRef = useRef<{ date: string; hasTasks: boolean } | null>(null)
  const longPressActivatedRef = useRef<boolean>(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Notify parent when month changes (initial load)
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(year, month + 1)
    }
  }, [year, month, onMonthChange])

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  // Get tasks with colors for each date based on deadline
  const tasksByDate = useMemo(() => {
    const map: Record<string, { count: number; colors: string[]; hasUrgent: boolean; primaryColor: string | null; tasks: TaskRecord[] }> = {}
    tasks.forEach((task) => {
      if (task.status !== 'completed' && task.deadline) {
        const date = task.deadline.split('T')[0]
        if (!map[date]) {
          map[date] = { count: 0, colors: [], hasUrgent: false, primaryColor: null, tasks: [] }
        }
        map[date].count += 1
        map[date].tasks.push(task)

        // Determine color
        let color = task.color
        if (!color) {
          if (task.priority === 'urgent') color = 'red'
          else if (task.priority === 'high') color = 'orange'
          else if (task.priority === 'medium') color = 'yellow'
          else if (task.priority === 'low') color = 'green'
          else color = 'blue'

          // Check overdue
          const deadlineDate = new Date(task.deadline + 'T00:00:00+07:00')
          const now = getNowUTC7()
          if (deadlineDate.getTime() < now.getTime() && deadlineDate.getDate() !== now.getDate()) {
            color = 'red'
          }
        }

        // Set primary color if task has explicit color
        if (task.color && !map[date].primaryColor) {
          map[date].primaryColor = task.color
        }

        // Check for urgent/high priority for ripple effect
        if (task.priority === 'urgent' || task.priority === 'high') {
          map[date].hasUrgent = true
        }

        if (!map[date].colors.includes(color)) {
          map[date].colors.push(color)
        }
      }
    })
    return map
  }, [tasks])

  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    const today = getNowUTC7()
    setCurrentDate(today)
    if (onDateClick) {
      const components = getDateComponentsUTC7(today)
      onDateClick(formatDateUTC7(createDateUTC7(components.year, components.month, components.day, 0, 0, 0, 0)))
    }
  }

  // Generate days to display
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = []

    if (viewMode === 'month') {
      const firstDayOfMonth = new Date(year, month, 1)
      const lastDayOfMonth = new Date(year, month + 1, 0)
      const daysInMonth = lastDayOfMonth.getDate()
      const startingDayOfWeek = firstDayOfMonth.getDay()

      // Empty slots
      for (let i = 0; i < startingDayOfWeek; i++) days.push(null)
      // Days
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i))
      }
    } else {
      // Week view
      const currentDay = currentDate.getDay() // 0-6
      const diff = currentDate.getDate() - currentDay // Adjust to Sunday start
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(diff)

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        days.push(day)
      }
    }
    return days
  }, [viewMode, year, month, currentDate])

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const isToday = (date: Date) => {
    const today = getNowUTC7()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800">
            {viewMode === 'month'
              ? `${MONTHS[month]} ${year}`
              : `Tuần ${getDateComponentsUTC7(currentDate).day}/${getDateComponentsUTC7(currentDate).month}`
            }
          </h3>
          <button
            onClick={() => setViewMode(v => v === 'month' ? 'week' : 'month')}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            {viewMode === 'month' ? <FaCalendarWeek /> : <FaCalendarAlt />}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevious}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <FaChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
          >
            Hôm nay
          </button>
          <button
            onClick={goToNext}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <FaChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
        {calendarDays.map((date, idx) => {
          if (!date) return <div key={idx} />

          const dateStr = formatDateStr(date)
          const data = tasksByDate[dateStr]
          const isSelected = selectedDate === dateStr
          const isCurrentDay = isToday(date)

          const hasColor = data?.primaryColor && !isSelected
          const bgColor = hasColor ? (data.primaryColor || undefined) : undefined

          const handleDateClick = () => {
            // Only handle normal click if long press was not activated
            if (!longPressActivatedRef.current) {
              onDateClick(dateStr)
            }
            // Reset flag after click
            longPressActivatedRef.current = false
          }

          const handleLongPressStart = () => {
            if (data && data.tasks.length > 0 && onDateWithTasksClick) {
              longPressActivatedRef.current = false
              longPressTargetRef.current = { date: dateStr, hasTasks: true }
              // Set timer for long press (500ms)
              longPressTimerRef.current = window.setTimeout(() => {
                if (longPressTargetRef.current && longPressTargetRef.current.hasTasks) {
                  longPressActivatedRef.current = true
                  onDateWithTasksClick(longPressTargetRef.current.date)
                }
              }, 500)
            }
          }

          const handleLongPressEnd = () => {
            if (longPressTimerRef.current) {
              window.clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
            // If long press was activated, prevent normal click
            if (longPressActivatedRef.current) {
              // Reset after a short delay to allow click handler to check the flag
              setTimeout(() => {
                longPressActivatedRef.current = false
              }, 100)
            }
            longPressTargetRef.current = null
          }

          const handleLongPressCancel = () => {
            if (longPressTimerRef.current) {
              window.clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
            longPressActivatedRef.current = false
            longPressTargetRef.current = null
          }

          return (
            <button
              key={idx}
              onClick={handleDateClick}
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressCancel}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressCancel}
              className={`
                relative flex flex-col items-center justify-center h-10 rounded-xl transition-all
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-md scale-105 z-10'
                  : isCurrentDay && !hasColor
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : hasColor
                      ? 'text-white font-semibold shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50'
                }
              `}
              style={hasColor ? { backgroundColor: bgColor } : {}}
            >
              <span className="text-sm relative z-10">{date.getDate()}</span>

              {/* Ripple Effect for Urgent/High Priority - covers entire cell */}
              {data?.hasUrgent && !isSelected && !disableRipple && (
                <span className="absolute inset-0 z-0 rounded-xl overflow-hidden">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-red-400 opacity-20"></span>
                </span>
              )}

              {/* Dots - only show if no primary color */}
              {!hasColor && (
                <div className="flex gap-0.5 mt-0.5 h-1.5 relative z-10">
                  {data?.colors.slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : (!color.startsWith('#') ? `bg-${color}-500` : '')}`}
                      style={color.startsWith('#') && !isSelected ? { backgroundColor: color } : {}}
                    />
                  ))}
                  {data?.count > 3 && (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

