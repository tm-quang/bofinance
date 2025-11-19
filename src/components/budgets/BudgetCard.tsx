import { FaEdit, FaTrash, FaExclamationTriangle, FaBan } from 'react-icons/fa'
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

  const statusLabels = {
    safe: 'An toàn',
    warning: 'Cảnh báo',
    danger: 'Vượt ngân sách',
    critical: 'Vượt quá nhiều',
  }

  const usagePercentage = Math.min(budget.usage_percentage, 120) // Cap at 120% for display
  const isOverBudget = budget.usage_percentage > 100

  // Enhanced color classes with gradients
  const enhancedColorClasses = {
    emerald: {
      cardBg: 'bg-gradient-to-br from-emerald-50/50 to-white',
      progressBg: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
      progressGlow: 'shadow-emerald-500/20',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      text: 'text-emerald-700',
      border: 'border-emerald-200/50',
    },
    amber: {
      cardBg: 'bg-gradient-to-br from-amber-50/50 to-white',
      progressBg: 'bg-gradient-to-r from-amber-400 to-amber-500',
      progressGlow: 'shadow-amber-500/20',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      text: 'text-amber-700',
      border: 'border-amber-200/50',
    },
    red: {
      cardBg: 'bg-gradient-to-br from-red-50/50 to-white',
      progressBg: 'bg-gradient-to-r from-red-400 to-red-500',
      progressGlow: 'shadow-red-500/20',
      badge: 'bg-red-100 text-red-700 border-red-200',
      text: 'text-red-700',
      border: 'border-red-200/50',
    },
    rose: {
      cardBg: 'bg-gradient-to-br from-rose-50/50 to-white',
      progressBg: 'bg-gradient-to-r from-rose-500 to-rose-600',
      progressGlow: 'shadow-rose-500/30',
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      text: 'text-rose-700',
      border: 'border-rose-200/50',
    },
  } as const

  const enhancedColors = enhancedColorClasses[color] || enhancedColorClasses.emerald

  return (
    <div className={`group relative rounded-3xl ${enhancedColors.cardBg} p-4 sm:p-5 shadow-lg border ${enhancedColors.border} hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center overflow-hidden">
              {categoryIcon}
            </div>
            {budget.limit_type && (
              <div className={`absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center ${budget.limit_type === 'hard'
                  ? 'bg-rose-500 text-white'
                  : 'bg-amber-500 text-white'
                } shadow-lg`}>
                {budget.limit_type === 'hard' ? (
                  <FaBan className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                ) : (
                  <FaExclamationTriangle className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                )}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">{categoryName}</h3>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {formatDate(budget.period_start)} - {formatDate(budget.period_end)}
              </p>
              {walletName && (
                <>
                  <span className="text-slate-300 shrink-0">•</span>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate font-medium">{walletName}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold border ${enhancedColors.badge} shadow-sm whitespace-nowrap`}>
            {budget.usage_percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2 gap-2">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium mb-0.5">Đã chi</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 break-words leading-tight">
              {formatCurrency(budget.spent_amount)}
            </span>
          </div>
          <div className="flex flex-col items-end min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium mb-0.5">Ngân sách</span>
            <span className="text-sm sm:text-base font-bold text-slate-700 break-words leading-tight text-right">
              {formatCurrency(budget.amount)}
            </span>
          </div>
        </div>
        <div className="relative w-full bg-slate-200/60 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className={`h-full ${enhancedColors.progressBg} ${enhancedColors.progressGlow} transition-all duration-500 ease-out rounded-full relative overflow-hidden`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          >
            {usagePercentage > 100 && (
              <div
                className={`absolute right-0 top-0 h-full ${enhancedColors.progressBg} opacity-60`}
                style={{ width: `${usagePercentage - 100}%` }}
              />
            )}
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
          {isOverBudget && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white drop-shadow-sm">
                Vượt {budget.usage_percentage.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        {budget.status !== 'safe' && (
          <div className="flex items-center gap-1.5 mt-2">
            <FaExclamationTriangle className={`h-3.5 w-3.5 ${enhancedColors.text}`} />
            <p className={`text-xs ${enhancedColors.text} font-semibold`}>
              {statusLabels[budget.status]}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-200/60 gap-2">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium mb-0.5">Số tiền còn lại</span>
          <span className={`text-sm sm:text-lg font-bold break-words leading-tight ${budget.remaining_amount >= 0 ? 'text-slate-900' : enhancedColors.text}`}>
            {budget.remaining_amount >= 0 ? (
              <span className="text-emerald-600">{formatCurrency(budget.remaining_amount)}</span>
            ) : (
              <span className={enhancedColors.text}>{formatCurrency(Math.abs(budget.remaining_amount))}</span>
            )}
          </span>
        </div>
        <div className="flex gap-1 sm:gap-1.5 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all hover:scale-110 active:scale-95"
              aria-label="Sửa ngân sách"
            >
              <FaEdit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95"
              aria-label="Xóa ngân sách"
            >
              <FaTrash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

