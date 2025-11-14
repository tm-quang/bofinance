import { useMemo } from 'react'

type CombinedChartPoint = {
  label: string
  income: number
  expense: number
  balance: number
}

type CombinedTrendChartProps = {
  data: CombinedChartPoint[]
  height?: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const CombinedTrendChart = ({ data, height = 200 }: CombinedTrendChartProps) => {
  const { maxBarValue, balanceScale, balancePoints } = useMemo(() => {
    if (data.length === 0) {
      return {
        maxBarValue: 0,
        balanceScale: { min: 0, max: 1 },
        balancePoints: [] as { x: number; y: number }[],
      }
    }

    const maxBarValue = Math.max(...data.flatMap((item) => [item.income, item.expense]))
    const minBalance = Math.min(...data.map((item) => item.balance))
    const maxBalance = Math.max(...data.map((item) => item.balance))
    const padding = Math.max(Math.abs(minBalance), Math.abs(maxBalance)) * 0.1

    const scaleMin = Math.min(minBalance, -padding)
    const scaleMax = Math.max(maxBalance, padding)

    const balancePoints = data.map((item, index) => {
      const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100
      const normalized = (item.balance - scaleMin) / (scaleMax - scaleMin || 1)
      const y = 100 - normalized * 100
      return { x, y }
    })

    return {
      maxBarValue,
      balanceScale: { min: scaleMin, max: scaleMax },
      balancePoints,
    }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        Chưa có dữ liệu để hiển thị
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
        <span className="flex items-center gap-2 text-emerald-600">
          <span className="h-2 w-8 rounded-full bg-emerald-500" />
          Thu nhập
        </span>
        <span className="flex items-center gap-2 text-rose-600">
          <span className="h-2 w-8 rounded-full bg-rose-500" />
          Chi tiêu
        </span>
        <span className="flex items-center gap-2 text-sky-600">
          <span className="h-2 w-8 rounded-full bg-sky-500" />
          Cân đối
        </span>
      </div>

      <div className="relative rounded-3xl bg-slate-50 p-4 sm:p-6">
        <div className="absolute inset-x-4 top-4 bottom-10 flex flex-col justify-between text-[10px] text-slate-400 sm:text-xs">
          <span>{formatCurrency(balanceScale.max)}</span>
          <span>{formatCurrency((balanceScale.max + balanceScale.min) / 2)}</span>
          <span>{formatCurrency(balanceScale.min)}</span>
        </div>
        <div className="relative overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {data.map((item, index) => {
                const incomeHeight = maxBarValue > 0 ? (item.income / maxBarValue) * height : 0
                const expenseHeight = maxBarValue > 0 ? (item.expense / maxBarValue) * height : 0

                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                <div className="relative flex w-full items-end justify-center gap-1" style={{ height: `${height}px` }}>
                  <div className="flex-1">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:from-emerald-600 hover:to-emerald-500"
                      style={{ height: `${Math.max(incomeHeight, 4)}px`, minHeight: '4px' }}
                      title={`Thu: ${formatCurrency(item.income)}`}
                    />
                  </div>
                  <div className="flex-1">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-rose-500 to-rose-400 transition-all hover:from-rose-600 hover:to-rose-500"
                      style={{ height: `${Math.max(expenseHeight, 4)}px`, minHeight: '4px' }}
                      title={`Chi: ${formatCurrency(item.expense)}`}
                    />
                  </div>
                </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[10px] text-slate-400">Cân đối: {formatCurrency(item.balance)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {balancePoints.length > 1 && (
                <>
                  <path
                    d={`M ${balancePoints[0].x} ${balancePoints[0].y} ${balancePoints
                      .slice(1)
                      .map((point) => `L ${point.x} ${point.y}`)
                      .join(' ')}`}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={`M ${balancePoints[0].x} ${balancePoints[0].y} ${balancePoints
                      .slice(1)
                      .map((point) => `L ${point.x} ${point.y}`)
                      .join(' ')} L 100 100 L 0 100 Z`}
                    fill="url(#balanceGradient)"
                    stroke="none"
                    opacity={0.4}
                  />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}


