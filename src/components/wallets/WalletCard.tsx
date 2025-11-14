import { useEffect, useState } from 'react'
import { RiStarFill } from 'react-icons/ri'
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

// Component logo mờ để tái sử dụng
const WalletLogo = ({ className = 'h-36 w-36' }: { className?: string }) => (
  <div className="absolute right-3 top-14 -translate-y-12 z-0 opacity-15">
    <img 
      src="/logo-nontext.png" 
      alt="BO.fin Logo" 
      className={className}
    />
  </div>
)

const getWalletGradient = (type: string) => {
  switch (type) {
    case 'Tiền mặt':
      return 'from-slate-900 via-slate-800 to-slate-950'
    case 'Ngân hàng':
      return 'from-blue-700 via-blue-800 to-indigo-900'
    case 'Tiết kiệm':
      return 'from-emerald-700 via-teal-800 to-cyan-900'
    case 'Tín dụng':
      return 'from-purple-700 via-violet-800 to-fuchsia-900'
    case 'Đầu tư':
      return 'from-amber-700 via-orange-800 to-rose-900'
    default:
      return 'from-slate-800 via-gray-900 to-slate-950'
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
          
          // Sử dụng initial_balance làm mốc (nếu có), nếu không thì dùng balance
          const initialBalance = wallet.initial_balance ?? wallet.balance ?? 0
          setStats({
            income: totalIncome,
            expense: totalExpense,
            incomePercentage: 0,
            expensePercentage: 0,
            currentBalance: initialBalance + totalIncome - totalExpense,
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

      {/* Decorative patterns - Kiểu ATM card hiện đại */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {/* Geometric patterns - Blur circles */}
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl"></div>
        <div className="absolute -right-8 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-xl"></div>
        <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-lg"></div>
        <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-white/5 blur-2xl"></div>
        
        {/* Wave patterns - Đường viền mờ dưới nền */}
        <svg className="absolute bottom-0 left-0 w-full opacity-15" viewBox="0 0 400 180" preserveAspectRatio="none">
          <path
            d="M0,120 Q100,60 200,120 T400,120 L400,180 L0,180 Z"
            fill="white"
          />
          <path
            d="M0,150 Q150,90 300,150 T400,150 L400,180 L0,180 Z"
            fill="white"
            opacity="0.6"
          />
        </svg>
        
        {/* Thêm đường viền mờ thứ 2 */}
        <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 400 180" preserveAspectRatio="none">
          <path
            d="M0,100 Q120,40 240,100 T400,100 L400,180 L0,180 Z"
            fill="white"
            opacity="0.5"
          />
        </svg>
        
        {/* Thêm đường viền mờ thứ 3 */}
        <svg className="absolute bottom-0 left-0 w-full opacity-8" viewBox="0 0 400 180" preserveAspectRatio="none">
          <path
            d="M0,130 Q80,70 160,130 T400,130 L400,180 L0,180 Z"
            fill="white"
            opacity="0.4"
          />
        </svg>

        {/* Logo mờ ở giữa 1/3 bên phải */}
        <WalletLogo className="h-24 w-24 object-contain sm:h-32 sm:w-32" />
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
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xl font-semibold text-amber-300 sm:text-xs">BO.fin</span>
            
            {/* Pulsing circle with ripple effect */}
            <div className="relative flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
            {/* Ripple waves - 3 layers for smooth effect */}
            {/* White waves for all wallets */}
            <div className="absolute h-full w-full rounded-full bg-white/40 ripple-wave" />
            <div className="absolute h-full w-full rounded-full bg-white/30 ripple-wave-delay-1" />
            <div className="absolute h-full w-full rounded-full bg-white/20 ripple-wave-delay-2" />
            {/* Center circle with glow */}
            <div className="relative z-10 h-3 w-3 rounded-full bg-white pulse-glow sm:h-3.5 sm:w-3.5" />
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-2 min-w-0">
          <p className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {formatCurrency(stats.currentBalance)}
          </p>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            {(() => {
              const initialBalance = wallet.initial_balance ?? wallet.balance ?? 0
              return stats.currentBalance !== initialBalance && (
                <p className="text-xs text-white/60">
                  Số dư ban đầu: {formatCurrency(initialBalance)}
                </p>
              )
            })()}
            {isDefault && (
              <span className="shrink-0 ml-auto flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
                <RiStarFill className="h-3 w-3" />
                <span>Ví mặc định</span>
              </span>
            )}
          </div>
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



