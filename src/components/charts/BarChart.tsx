import { useMemo } from 'react'
import { FaChartBar } from 'react-icons/fa'

type BarChartData = {
  label: string
  income: number
  expense: number
}

type BarChartProps = {
  data: BarChartData[]
  height?: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const BarChart = ({ data, height = 200 }: BarChartProps) => {
  const maxValue = useMemo(() => {
    if (data.length === 0) return 1
    return Math.max(...data.flatMap((item) => [item.income, item.expense]))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        <div className="mb-3 rounded-full bg-white p-3">
          <FaChartBar className="h-6 w-6 text-slate-400" />
        </div>
        <span>Chưa có dữ liệu để hiển thị</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
        <span className="flex items-center gap-2 text-emerald-600">
          <span className="h-2 w-8 rounded-full bg-emerald-500" />
          Thu nhập
        </span>
        <span className="flex items-center gap-2 text-rose-600">
          <span className="h-2 w-8 rounded-full bg-rose-500" />
          Chi tiêu
        </span>
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-slate-50 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data.map((item, index) => {
            const incomeHeight = maxValue > 0 ? (item.income / maxValue) * height : 0
            const expenseHeight = maxValue > 0 ? (item.expense / maxValue) * height : 0

            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="relative flex w-full items-end justify-center gap-1" style={{ height: `${height}px` }}>
                  {/* Income Bar */}
                  <div className="flex-1">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:from-emerald-600 hover:to-emerald-500"
                      style={{ height: `${Math.max(incomeHeight, 4)}px`, minHeight: '4px' }}
                      title={`Thu: ${formatCurrency(item.income)}`}
                    />
                  </div>
                  {/* Expense Bar */}
                  <div className="flex-1">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-rose-500 to-rose-400 transition-all hover:from-rose-600 hover:to-rose-500"
                      style={{ height: `${Math.max(expenseHeight, 4)}px`, minHeight: '4px' }}
                      title={`Chi: ${formatCurrency(item.expense)}`}
                    />
                  </div>
                </div>
                {/* Label */}
                <div className="w-full text-center">
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
                    <p className="text-emerald-600">{formatCurrency(item.income)}</p>
                    <p className="text-rose-600">{formatCurrency(item.expense)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

