import { useEffect, useState } from 'react'
import type { WalletRecord } from '../../lib/walletService'
import { getTransactionStats } from '../../lib/transactionService'

type WalletCardProps = {
  wallet: WalletRecord
  isActive?: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const getWalletGradient = (type: string) => {
  switch (type) {
    case 'Ngân hàng':
      return 'from-blue-600 to-blue-800'
    case 'Tiết kiệm':
      return 'from-emerald-600 to-emerald-800'
    case 'Tín dụng':
      return 'from-purple-600 to-purple-800'
    case 'Đầu tư':
      return 'from-amber-600 to-amber-800'
    default:
      return 'from-slate-600 to-slate-800'
  }
}

export const WalletCard = ({ wallet, isActive = false }: WalletCardProps) => {
  const [stats, setStats] = useState({ income: 0, expense: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const transactions = await getTransactionStats(today, today, wallet.id)
        
        setStats({
          income: transactions.total_income,
          expense: transactions.total_expense,
        })
      } catch (error) {
        console.error('Error loading wallet stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isActive) {
      loadStats()
    }
  }, [wallet.id, isActive])

  const gradient = getWalletGradient(wallet.type)

  return (
    <div
      className={`relative h-48 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 transition-transform ${
        isActive ? 'scale-100' : 'scale-95 opacity-70'
      }`}
    >
      {/* Decorative waves */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-20">
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
          <path
            d="M0,50 Q100,30 200,50 T400,50 L400,100 L0,100 Z"
            fill="white"
          />
          <path
            d="M0,70 Q150,50 300,70 T400,70 L400,100 L0,100 Z"
            fill="white"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Card content */}
      <div className="relative z-10 flex h-full flex-col justify-between overflow-hidden text-white">
        {/* Top section */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-white/70 sm:text-xs">
              {wallet.type}
            </p>
            <p className="mt-1 truncate text-base font-bold sm:text-lg">{wallet.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-base font-semibold text-amber-300 sm:text-xs">BO.fin</span>
            {/* Contactless payment icon - waves */}
            <svg className="h-5 w-5 shrink-0 text-white/80 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0.3" />
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" opacity="0.5" />
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
            </svg>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-2 min-w-0">
          <p className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {formatCurrency(wallet.balance)}
          </p>
        </div>

        {/* Bottom section - Income and Expense */}
        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-white/20 pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-base text-white/70 sm:text-xs">Thu nhập</p>
            <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">
              {isLoading ? '...' : formatCurrency(stats.income)}
            </p>
          </div>
          <div className="h-6 w-px shrink-0 bg-white/20 sm:h-8" />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-base text-white/70 sm:text-xs">Chi tiêu</p>
            <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">
              {isLoading ? '...' : formatCurrency(stats.expense)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

