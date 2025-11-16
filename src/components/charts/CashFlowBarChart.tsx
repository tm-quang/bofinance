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

// Format value in hundreds of thousands (trăm ngàn)
// Example: 3.336.000 → 3.336 (chia cho 1000)
const formatInHundredsOfThousands = (value: number): string => {
  const inThousands = value / 1000
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
    const maxBarValue = Math.max(...data.flatMap((item) => [item.income, item.expense]))
    
    // Generate Y-axis labels (5 labels from 0 to max, in hundreds of thousands)
    // Round up to nearest thousand for cleaner display
    const roundedMax = Math.ceil(maxBarValue / 1000) * 1000
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
        {/* Y-axis labels - left side, from bottom (0) to top (max) */}
        <div className="absolute left-0 top-4 bottom-16 flex flex-col justify-between text-[10px] text-slate-500 sm:text-xs pr-2">
          {yAxisLabels.slice().reverse().map((value, index) => (
            <span key={index} className="text-right">
              {formatInHundredsOfThousands(value)}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="ml-12 sm:ml-16">
          <div className="relative" style={{ height: `${height}px` }}>
            {/* Grid lines - horizontal lines */}
            {yAxisLabels.map((_value, index) => {
              // Reverse: 0% at top (max value), 100% at bottom (0)
              const yPosition = 100 - (index / 4) * 100
              return (
                <div
                  key={index}
                  className="absolute left-0 right-0 border-t border-slate-200"
                  style={{ top: `${yPosition}%` }}
                />
              )
            })}

            {/* Vertical bars - side by side */}
            <div className="absolute inset-0 flex items-end justify-center gap-3 sm:gap-4">
              {data.map((item, dataIndex) => {
                const incomeHeight = maxValue > 0 ? (item.income / maxValue) * 100 : 0
                const expenseHeight = maxValue > 0 ? (item.expense / maxValue) * 100 : 0

                return (
                  <div key={dataIndex} className="flex flex-col items-center gap-2 flex-1 max-w-[100px]">
                    {/* Bars container - vertical bars side by side */}
                    <div className="relative flex w-full items-end justify-center gap-1.5 sm:gap-2" style={{ height: '100%' }}>
                      {/* Income Bar (Green) - vertical */}
                      <div className="flex-1 flex flex-col justify-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:from-emerald-600 hover:to-emerald-500 shadow-sm"
                          style={{ 
                            height: `${Math.max(incomeHeight, 2)}%`, 
                            minHeight: '4px' 
                          }}
                          title={`Thu: ${formatCurrency(item.income)}`}
                        />
                      </div>
                      
                      {/* Expense Bar (Red) - vertical */}
                      <div className="flex-1 flex flex-col justify-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-rose-500 to-rose-400 transition-all hover:from-rose-600 hover:to-rose-500 shadow-sm"
                          style={{ 
                            height: `${Math.max(expenseHeight, 2)}%`, 
                            minHeight: '4px' 
                          }}
                          title={`Chi: ${formatCurrency(item.expense)}`}
                        />
                      </div>
                    </div>

                    {/* Label and Balance */}
                    <div className="w-full text-center mt-2">
                      <p className="text-xs font-semibold text-slate-700 mb-1">{item.label}</p>
                      <div className="border-t border-slate-200 pt-1">
                        <p className={`text-[10px] font-medium sm:text-xs ${
                          item.balance >= 0 ? 'text-sky-600' : 'text-rose-600'
                        }`}>
                          Cân đối: {formatCurrency(item.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
