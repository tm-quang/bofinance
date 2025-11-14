import { useEffect, useState } from 'react'
import type { WalletRecord } from '../../lib/walletService'
import { getWalletCashFlowStats } from '../../lib/walletBalanceService'

type WalletCardProps = {
  wallet: WalletRecord
  isActive?: boolean
  isDefault?: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const formatPercentage = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return '0%'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

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

export const WalletCard = ({ wallet, isActive = false, isDefault = false }: WalletCardProps) => {
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    incomePercentage: 0,
    expensePercentage: 0,
    currentBalance: wallet.balance,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load stats cho tất cả thời gian (không giới hạn ngày) để hiển thị tổng hợp
        // Nếu muốn chỉ hiển thị hôm nay, có thể dùng: const today = new Date().toISOString().split('T')[0]
        const cashFlowStats = await getWalletCashFlowStats(wallet)
        
        setStats({
          income: cashFlowStats.totalIncome,
          expense: cashFlowStats.totalExpense,
          incomePercentage: cashFlowStats.incomePercentage,
          expensePercentage: cashFlowStats.expensePercentage,
          currentBalance: cashFlowStats.currentBalance,
        })
      } catch (error) {
        console.error('Error loading wallet stats:', error)
        // Fallback to basic stats - thử tính từ transactions trực tiếp
        try {
          const { fetchTransactions } = await import('../../lib/transactionService')
          const transactions = await fetchTransactions({ wallet_id: wallet.id })
          const totalIncome = transactions
            .filter((t) => t.type === 'Thu')
            .reduce((sum, t) => sum + Number(t.amount), 0)
          const totalExpense = transactions
            .filter((t) => t.type === 'Chi')
            .reduce((sum, t) => sum + Number(t.amount), 0)
          
          setStats({
            income: totalIncome,
            expense: totalExpense,
            incomePercentage: 0,
            expensePercentage: 0,
            currentBalance: wallet.balance + totalIncome - totalExpense,
          })
        } catch (fallbackError) {
          console.error('Error in fallback calculation:', fallbackError)
          setStats({
            income: 0,
            expense: 0,
            incomePercentage: 0,
            expensePercentage: 0,
            currentBalance: wallet.balance,
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    // Luôn load stats để hiển thị số liệu, không chỉ khi isActive
    // isActive chỉ ảnh hưởng đến việc hiển thị animation/scale
    loadStats()
  }, [wallet])

  const gradient = getWalletGradient(wallet.type)

  return (
    <div className="relative">
      <div
        className={`relative h-[13.5rem] w-full overflow-visible rounded-3xl bg-gradient-to-br ${gradient} p-5 ring-2 shadow-none transition-all duration-300 ${
          isDefault 
            ? 'ring-4 scale-100' 
            : isActive 
              ? 'ring-1 scale-100' 
              : 'ring-1 scale-95 opacity-70'
        }`}
        style={{ boxShadow: 'none' }}
      >

      {/* Decorative waves */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-20 pointer-events-none z-0">
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
      <div className="relative z-10 flex h-[11.5rem] flex-col justify-between text-white">
        {/* Top section */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-white/70 sm:text-xs">
              {wallet.type}
            </p>
            <p className="mt-1 truncate text-base font-bold sm:text-lg">{wallet.name}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <div className="flex items-center gap-2">
              {/* Logo */}
              <img 
                src="/logo-nontext.png" 
                alt="BO.fin Logo" 
                className="h-9 w-9 shrink-0 object-contain sm:h-6 sm:w-6"
              />
              <span className="text-xl font-semibold text-amber-300 sm:text-xs">BO.fin</span>
              
              {/* Pulsing circle with ripple effect */}
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
              {/* Ripple waves - 3 layers for smooth effect */}
              {/* Red waves for default wallet, white for others */}
              {isDefault ? (
                <>
                  <div className="absolute h-full w-full rounded-full bg-red-500/50 ripple-wave" />
                  <div className="absolute h-full w-full rounded-full bg-red-500/40 ripple-wave-delay-1" />
                  <div className="absolute h-full w-full rounded-full bg-red-500/30 ripple-wave-delay-2" />
                  {/* Center circle with red glow */}
                  <div className="relative z-10 h-3 w-3 rounded-full bg-red-500 pulse-glow-red sm:h-3.5 sm:w-3.5" />
                </>
              ) : (
                <>
                  <div className="absolute h-full w-full rounded-full bg-white/40 ripple-wave" />
                  <div className="absolute h-full w-full rounded-full bg-white/30 ripple-wave-delay-1" />
                  <div className="absolute h-full w-full rounded-full bg-white/20 ripple-wave-delay-2" />
                  {/* Center circle with glow */}
                  <div className="relative z-10 h-3 w-3 rounded-full bg-white pulse-glow sm:h-3.5 sm:w-3.5" />
                </>
              )}
              </div>
            </div>
            {/* Tagline */}
            <p className="text-[8px] font-medium text-white/60 sm:text-[8px]">
              Theo dõi chi tiêu, tối ưu tài chính
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-2 min-w-0">
          <p className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {formatCurrency(stats.currentBalance)}
          </p>
          {stats.currentBalance !== wallet.balance && (
            <p className="mt-0.5 text-xs text-white/60">
              Số dư ban đầu: {formatCurrency(wallet.balance)}
            </p>
          )}
        </div>

        {/* Bottom section - Income and Expense */}
        <div className="mt-auto flex items-start justify-between gap-3 border-t border-white/20 pt-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 sm:text-[10px]">Thu nhập</p>
            <p className="mt-1 break-words text-sm font-bold leading-tight sm:text-base">
              {isLoading ? '...' : formatCurrency(stats.income || 0)}
            </p>
            {!isLoading && stats.currentBalance > 0 && stats.income > 0 && (
              <p className="mt-0.5 text-[10px] text-white/50 sm:text-xs">
                {formatPercentage(stats.incomePercentage)} số dư
              </p>
            )}
          </div>
          <div className="h-12 w-px shrink-0 bg-white/20" />
          <div className="flex-1 min-w-0 text-right">
            <p className="text-xs text-white/70 sm:text-[10px]">Chi tiêu</p>
            <p className="mt-1 break-words text-sm font-bold leading-tight sm:text-base">
              {isLoading ? '...' : formatCurrency(stats.expense || 0)}
            </p>
            {!isLoading && stats.currentBalance > 0 && stats.expense > 0 && (
              <p className="mt-0.5 text-[10px] text-white/50 sm:text-xs">
                {formatPercentage(stats.expensePercentage)} số dư
              </p>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

