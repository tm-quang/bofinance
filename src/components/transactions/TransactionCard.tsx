import { FaPlus, FaCalendar, FaWallet } from 'react-icons/fa'
import { type TransactionRecord } from '../../lib/transactionService'

export interface CategoryInfo {
  name: string
  icon: React.ReactNode | null
}

export interface WalletInfo {
  name: string
  color: {
    bg: string
    icon: string
    text: string
  }
}

interface TransactionCardProps {
  transaction: TransactionRecord
  categoryInfo: CategoryInfo
  walletInfo: WalletInfo
  onLongPressStart: (transaction: TransactionRecord) => void
  onLongPressEnd: () => void
  onLongPressCancel: () => void
  formatCurrency: (value: number) => string
  formatDate: (date: Date) => string
}

export const TransactionCard = ({
  transaction,
  categoryInfo,
  walletInfo,
  onLongPressStart,
  onLongPressEnd,
  onLongPressCancel,
  formatCurrency,
  formatDate,
}: TransactionCardProps) => {
  const isIncome = transaction.type === 'Thu'
  const categoryIcon = categoryInfo.icon
  const transactionDate = new Date(transaction.transaction_date)

  return (
    <div
      onTouchStart={() => onLongPressStart(transaction)}
      onTouchEnd={onLongPressEnd}
      onTouchCancel={onLongPressCancel}
      onMouseDown={() => onLongPressStart(transaction)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressCancel}
      className={`group relative flex gap-3 rounded-3xl p-3 shadow-lg ring-1 transition-all select-none cursor-pointer hover:shadow-md active:scale-[0.98] ${
        isIncome
          ? 'bg-emerald-50/30 ring-emerald-100/50 hover:ring-emerald-200/50'
          : 'bg-rose-50/40 ring-1 ring-rose-200/90 hover:ring-rose-500/50'
      }`}
    >
      {/* Icon Container */}
      <div
        className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden"
      >
        {categoryIcon ? (
          <div className="h-full w-full flex items-center justify-center">
            {categoryIcon}
          </div>
        ) : (
          <FaPlus className={`h-6 w-6 ${
            isIncome ? 'text-emerald-600' : 'text-rose-600'
          }`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
        {/* Left side: Description, Date, Category, Tags */}
        <div className="flex-1 min-w-0">
          {/* Description - Nếu null thì hiển thị tên hạng mục */}
          <p className="truncate text-sm font-semibold mb-1.5 text-slate-900">
            {transaction.description || categoryInfo.name}
          </p>

          {/* Date */}
          <div className="flex items-center gap-1 mb-1.5 text-xs text-slate-600">
            <FaCalendar className="h-3 w-3 text-slate-400" />
            <span className="whitespace-nowrap font-medium">
              {formatDate(transactionDate)}
            </span>
          </div>

          {/* Category - Hiển thị dưới ngày */}
          <div className="mb-1.5 text-xs text-slate-600">
            <span className="font-medium truncate">
              {categoryInfo.name}
            </span>
          </div>

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {transaction.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
              {transaction.tags.length > 2 && (
                <span className="text-xs text-slate-400 font-medium">
                  +{transaction.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side: Amount and Wallet */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Amount */}
          <span className={`text-base font-bold whitespace-nowrap ${
            isIncome ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {isIncome ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </span>
          {/* Wallet */}
          <div className={`flex items-center gap-1.5 rounded-full ${walletInfo.color.bg} px-2.5 py-1`}>
            <FaWallet className={`h-3 w-3 ${walletInfo.color.icon}`} />
            <span className={`text-xs font-semibold ${walletInfo.color.text} whitespace-nowrap`}>
              {walletInfo.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

