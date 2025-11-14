import { getBudgetColor, type BudgetStatus } from '../../lib/budgetService'

type BudgetStatusBadgeProps = {
  status: BudgetStatus
  percentage: number
  className?: string
}

const statusLabels = {
  safe: 'An toàn',
  warning: 'Cảnh báo',
  danger: 'Vượt ngân sách',
  critical: 'Vượt quá nhiều',
}

export const BudgetStatusBadge = ({ status, percentage, className = '' }: BudgetStatusBadgeProps) => {
  const color = getBudgetColor(status)

  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
  }[color]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorClasses} ${className}`}
    >
      <span>{statusLabels[status]}</span>
      <span className="font-bold">{percentage.toFixed(1)}%</span>
    </span>
  )
}

