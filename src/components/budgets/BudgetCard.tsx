import { FaEdit, FaTrash } from 'react-icons/fa'
import { getBudgetColor, type BudgetWithSpending } from '../../lib/budgetService'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

type BudgetCardProps = {
  budget: BudgetWithSpending
  categoryName: string
  categoryIcon: React.ReactNode
  walletName?: string | null
  onEdit?: () => void
  onDelete?: () => void
}

export const BudgetCard = ({
  budget,
  categoryName,
  categoryIcon,
  walletName,
  onEdit,
  onDelete,
}: BudgetCardProps) => {
  const color = getBudgetColor(budget.status) as 'emerald' | 'amber' | 'red' | 'rose'
  
  const colorClassesMap = {
    emerald: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      progress: 'bg-emerald-500',
      border: 'border-emerald-200',
    },
    amber: {
      bg: 'bg-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      progress: 'bg-amber-500',
      border: 'border-amber-200',
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      progress: 'bg-red-500',
      border: 'border-red-200',
    },
    rose: {
      bg: 'bg-rose-600',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-700',
      progress: 'bg-rose-600',
      border: 'border-rose-200',
    },
  } as const

  const colorClasses = colorClassesMap[color] || colorClassesMap.emerald

  const statusLabels = {
    safe: 'An toàn',
    warning: 'Cảnh báo',
    danger: 'Vượt ngân sách',
    critical: 'Vượt quá nhiều',
  }

  const usagePercentage = Math.min(budget.usage_percentage, 120) // Cap at 120% for display

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="text-2xl shrink-0">{categoryIcon}</div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 truncate">{categoryName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500">
                {formatDate(budget.period_start)} - {formatDate(budget.period_end)}
              </p>
              {walletName && (
                <>
                  <span className="text-slate-300">•</span>
                  <p className="text-xs text-slate-500 truncate">{walletName}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses.badge}`}>
            {budget.usage_percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600">
            {formatCurrency(budget.spent_amount)} / {formatCurrency(budget.amount)}
          </span>
          <span className={`font-semibold ${colorClasses.text}`}>
            {budget.usage_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full ${colorClasses.progress} transition-all duration-300 rounded-full`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
        {budget.status !== 'safe' && (
          <p className={`text-xs mt-1 ${colorClasses.text} font-medium`}>
            ⚠️ {statusLabels[budget.status]}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
        <div className="flex flex-col">
          <span className="text-slate-500 text-xs">Còn lại</span>
          <span className={`font-semibold ${budget.remaining_amount >= 0 ? 'text-slate-900' : colorClasses.text}`}>
            {formatCurrency(Math.abs(budget.remaining_amount))}
          </span>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
              aria-label="Sửa ngân sách"
            >
              <FaEdit className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Xóa ngân sách"
            >
              <FaTrash className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

