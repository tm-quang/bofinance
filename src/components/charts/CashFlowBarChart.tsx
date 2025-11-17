import { useMemo } from 'react'
import { FaChartBar } from 'react-icons/fa'

type CashFlowBarChartData = {
  label: string
  income: number
  expense: number
  balance: number
}

type CashFlowBarChartProps = {
  data: CashFlowBarChartData[]
  height?: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

// Format value in thousands (nghìn)
// Example: 3.336.000 → 3.336 (chia cho 1000)
const formatInThousands = (value: number): string => {
  const inThousands = value / 1000
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(inThousands)
}

export const CashFlowBarChart = ({ data, height = 190 }: CashFlowBarChartProps) => {
  const { maxValue, yAxisLabels } = useMemo(() => {
    if (data.length === 0) {
      return {
        maxValue: 1,
        yAxisLabels: [],
      }
    }

    // Find max value for scaling (considering both income and expense)
    const maxBarValue = Math.max(...data.flatMap((item) => [item.income, item.expense, Math.abs(item.balance)]))
    
    // Generate Y-axis labels (5 labels from 0 to max)
    // Round up to nearest reasonable value for cleaner display
    const roundedMax = Math.ceil(maxBarValue / 10000) * 10000 || 10000
    const labels: number[] = []
    const step = roundedMax / 4
    for (let i = 0; i <= 4; i++) {
      labels.push(step * i)
    }

    return {
      maxValue: roundedMax,
      yAxisLabels: labels,
    }
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
    <div className="space-y-3">
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
        <span className="flex items-center gap-2 text-sky-600">
          <span className="h-2 w-8 rounded-full bg-sky-500" />
          Cân đối
        </span>
      </div>

      {/* Chart Container */}
      <div className="relative rounded-2xl bg-slate-50 p-4 sm:p-6">
        {/* Chart area - horizontal bars */}
        <div className="relative" style={{ minHeight: `${height}px` }}>
          {/* Y-axis labels - left side (period labels) */}
          <div className="absolute left-0 top-0 bottom-12 flex flex-col justify-between text-[10px] text-slate-500 sm:text-xs pr-2 w-16 sm:w-20">
            {data.map((item, index) => (
              <span key={index} className="text-right font-semibold text-slate-700">
                {item.label}
              </span>
            ))}
          </div>

          {/* Chart bars area */}
          <div className="ml-16 sm:ml-20 mr-8">
            <div className="space-y-3">
              {data.map((item, dataIndex) => {
                const incomeWidth = maxValue > 0 ? (item.income / maxValue) * 100 : 0
                const expenseWidth = maxValue > 0 ? (item.expense / maxValue) * 100 : 0

                return (
                  <div key={dataIndex} className="relative h-8">
                    {/* Grid lines - vertical lines */}
                    {yAxisLabels.map((_value, index) => {
                      const xPosition = (index / 4) * 100
                      return (
                        <div
                          key={index}
                          className="absolute top-0 bottom-0 border-l border-slate-200"
                          style={{ left: `${xPosition}%` }}
                        />
                      )
                    })}

                    {/* Horizontal bars container */}
                    <div className="relative h-full flex items-center gap-2">
                      {/* Income Bar (Green) - horizontal */}
                      {item.income > 0 && (
                        <div
                          className="h-6 rounded-r-lg bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all hover:from-emerald-600 hover:to-emerald-500 shadow-sm flex items-center justify-end pr-2"
                          style={{ 
                            width: `${Math.max(incomeWidth, 1)}%`,
                            minWidth: '20px'
                          }}
                          title={`Thu: ${formatCurrency(item.income)}`}
                        >
                          <span className="text-[9px] font-semibold text-white drop-shadow-sm">
                            {formatInThousands(item.income)}
                          </span>
                        </div>
                      )}

                      {/* Expense Bar (Red) - horizontal */}
                      {item.expense > 0 && (
                        <div
                          className="h-6 rounded-r-lg bg-gradient-to-r from-rose-500 to-rose-400 transition-all hover:from-rose-600 hover:to-rose-500 shadow-sm flex items-center justify-end pr-2"
                          style={{ 
                            width: `${Math.max(expenseWidth, 1)}%`,
                            minWidth: '20px'
                          }}
                          title={`Chi: ${formatCurrency(item.expense)}`}
                        >
                          <span className="text-[9px] font-semibold text-white drop-shadow-sm">
                            {formatInThousands(item.expense)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* X-axis labels - bottom (value labels) */}
          <div className="absolute bottom-0 left-16 sm:left-20 right-8 flex justify-between text-[10px] text-slate-500 sm:text-xs">
            {yAxisLabels.map((value, index) => (
              <span key={index} className="text-center">
                {formatInThousands(value)}
              </span>
            ))}
          </div>
        </div>

        {/* Balance display for each period */}
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="text-slate-600">{item.label}</span>
              <span className={`font-semibold ${
                item.balance >= 0 ? 'text-sky-600' : 'text-rose-600'
              }`}>
                Cân đối: {formatCurrency(item.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
