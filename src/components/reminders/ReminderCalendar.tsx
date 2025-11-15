import { useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import type { ReminderRecord } from '../../lib/reminderService'

type ReminderCalendarProps = {
  reminders: ReminderRecord[]
  onDateClick: (date: string) => void
  selectedDate?: string
}

const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
]

export const ReminderCalendar = ({
  reminders,
  onDateClick,
  selectedDate,
}: ReminderCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Get reminders with colors for each date
  const remindersByDate: Record<string, { count: number; colors: string[] }> = {}
  reminders.forEach((reminder) => {
    if (reminder.status === 'pending') {
      const date = reminder.reminder_date
      if (!remindersByDate[date]) {
        remindersByDate[date] = { count: 0, colors: [] }
      }
      remindersByDate[date].count += 1
      
      // Get color for reminder
      let color = reminder.color || 'amber'
      if (!reminder.color) {
        // Default colors based on type
        if (reminder.amount && reminder.category_id) {
          // It's a reminder (has amount/category)
          color = reminder.type === 'Thu' ? 'emerald' : 'rose'
        } else {
          // It's a note
          color = 'amber'
        }
      }
      if (!remindersByDate[date].colors.includes(color)) {
        remindersByDate[date].colors.push(color)
      }
    }
  })

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Check if date is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  // Format date string (avoid timezone issues)
  const formatDate = (day: number) => {
    const date = new Date(year, month, day)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Check if date is selected
  const isSelected = (day: number) => {
    if (!selectedDate) return false
    const dateStr = formatDate(day)
    return dateStr === selectedDate
  }

  // Generate calendar days
  const calendarDays: (number | null)[] = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-100">
      {/* Calendar Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
        >
          <FaChevronLeft className="h-4 w-4" />
        </button>
        
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-slate-900">
            {MONTHS[month]} {year}
          </h3>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-200"
          >
            Hôm nay
          </button>
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
        >
          <FaChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center py-2 text-xs font-semibold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const dateStr = formatDate(day)
          const dateReminders = remindersByDate[dateStr]
          const hasReminders = dateReminders && dateReminders.count > 0
          const reminderCount = dateReminders?.count || 0
          const reminderColors = dateReminders?.colors || []
          const today = isToday(day)
          const selected = isSelected(day)

          // Get primary color for the date (first color or default)
          const primaryColor = reminderColors[0] || 'amber'
          const colorClasses: Record<string, { bg: string; text: string; dot: string; selected: string }> = {
            amber: { bg: 'bg-amber-500', text: 'text-white', dot: 'bg-amber-600', selected: 'bg-amber-500' },
            emerald: { bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-emerald-600', selected: 'bg-emerald-500' },
            rose: { bg: 'bg-rose-500', text: 'text-white', dot: 'bg-rose-600', selected: 'bg-rose-500' },
            sky: { bg: 'bg-sky-500', text: 'text-white', dot: 'bg-sky-600', selected: 'bg-sky-500' },
            blue: { bg: 'bg-blue-500', text: 'text-white', dot: 'bg-blue-600', selected: 'bg-blue-500' },
            purple: { bg: 'bg-purple-500', text: 'text-white', dot: 'bg-purple-600', selected: 'bg-purple-500' },
            indigo: { bg: 'bg-indigo-500', text: 'text-white', dot: 'bg-indigo-600', selected: 'bg-indigo-500' },
            pink: { bg: 'bg-pink-500', text: 'text-white', dot: 'bg-pink-600', selected: 'bg-pink-500' },
            orange: { bg: 'bg-orange-500', text: 'text-white', dot: 'bg-orange-600', selected: 'bg-orange-500' },
            teal: { bg: 'bg-teal-500', text: 'text-white', dot: 'bg-teal-600', selected: 'bg-teal-500' },
          }
          const colorClass = colorClasses[primaryColor] || colorClasses.amber

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDateClick(dateStr)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                selected
                  ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-300'
                  : today
                    ? hasReminders
                      ? `${colorClass.bg} ${colorClass.text} ring-2 ring-sky-300 shadow-md`
                      : 'bg-sky-100 text-sky-700 ring-2 ring-sky-300'
                    : hasReminders
                      ? `${colorClass.bg} ${colorClass.text} shadow-md hover:opacity-90`
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{day}</span>
              {hasReminders && !selected && reminderColors.length > 1 && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {reminderColors.slice(1, 4).map((color, idx) => (
                    <span
                      key={idx}
                      className={`flex h-1.5 w-1.5 items-center justify-center rounded-full ${
                        colorClasses[color]?.dot || colorClasses.amber.dot
                      }`}
                    />
                  ))}
                </div>
              )}
              {hasReminders && (
                <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  selected
                    ? 'bg-white text-sky-600'
                    : 'bg-white/90 text-slate-700 shadow-sm'
                }`}>
                  {reminderCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-sky-100 ring-2 ring-sky-300" />
          <span>Hôm nay</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-50" />
          <span>Có nhắc nhở</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-sky-500" />
          <span>Đã chọn</span>
        </div>
      </div>
    </div>
  )
}

