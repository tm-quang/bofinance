import { useMemo, useState } from 'react'
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

// Format value in thousands (nghìn) - làm tròn không có số thập phân
const formatInThousands = (value: number): string => {
  const inThousands = Math.round(value / 1000)
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(inThousands)
}

export const CashFlowBarChartMUI = ({ data, height = 300 }: CashFlowBarChartProps) => {
  const [selectedBar, setSelectedBar] = useState<{
    index: number
    type: 'income' | 'expense'
    x: number
    y: number
    tooltipX: number
    tooltipY: number
    position: 'top' | 'bottom' | 'left' | 'right'
  } | null>(null)

  const chartConfig = useMemo(() => {
    if (data.length === 0) {
      return {
        labels: [],
        incomeData: [],
        expenseData: [],
        balanceData: [],
        maxBarValue: 1,
        minBalance: 0,
        maxBalance: 0,
        yAxisLabels: [] as number[],
        balanceYAxisLabels: [] as number[],
      }
    }

    const labels = data.map((item) => item.label)
    const incomeData = data.map((item) => item.income)
    const expenseData = data.map((item) => item.expense)
    const balanceData = data.map((item) => item.balance)

    // Find max value for bar scaling (income and expense)
    const maxBarValue = Math.max(...incomeData, ...expenseData)
    // Làm tròn đến hàng trăm nghìn (100k, 200k, 300k...)
    const roundedMaxBar = Math.ceil(maxBarValue / 100000) * 100000 || 100000
    
    // Generate Y-axis labels for bars (5 labels từ 0 đến max, làm tròn đến 100k)
    const barYAxisLabels: number[] = []
    // Tính số bước 100k cần thiết
    const numHundredThousands = Math.ceil(roundedMaxBar / 100000)
    // Tính bước nhảy để có khoảng 5 labels (chia thành 4 khoảng)
    const stepInHundreds = Math.max(1, Math.ceil(numHundredThousands / 4))
    for (let i = 0; i <= 4; i++) {
      const value = i * stepInHundreds * 100000
      barYAxisLabels.push(value)
    }
    // Đảm bảo giá trị cuối cùng >= roundedMaxBar và là bội số của 100k
    const lastValue = barYAxisLabels[barYAxisLabels.length - 1]
    if (lastValue < roundedMaxBar) {
      barYAxisLabels[barYAxisLabels.length - 1] = Math.ceil(roundedMaxBar / 100000) * 100000
    }
    
    // Find min/max for balance line scaling
    const minBalance = Math.min(...balanceData)
    const maxBalance = Math.max(...balanceData)
    const balanceRange = Math.max(Math.abs(minBalance), Math.abs(maxBalance))
    const balancePadding = Math.max(balanceRange * 0.1, 10000) // At least 10k padding
    let roundedMinBalance = Math.floor((minBalance - balancePadding) / 10000) * 10000
    let roundedMaxBalance = Math.ceil((maxBalance + balancePadding) / 10000) * 10000
    
    // Ensure we have a valid range
    if (roundedMaxBalance === roundedMinBalance) {
      roundedMaxBalance = roundedMinBalance + 20000
      roundedMinBalance = roundedMinBalance - 20000
    }
    
    // Generate Y-axis labels for balance line (làm tròn đến 100k)
    const balanceYAxisLabels: number[] = []
    const balanceRangeTotal = roundedMaxBalance - roundedMinBalance
    const balanceStep = balanceRangeTotal / 4
    for (let i = 0; i <= 4; i++) {
      const value = roundedMinBalance + balanceStep * i
      // Làm tròn đến hàng trăm nghìn
      balanceYAxisLabels.push(Math.round(value / 100000) * 100000)
    }

    return {
      labels,
      incomeData,
      expenseData,
      balanceData,
      maxBarValue: roundedMaxBar,
      minBalance: roundedMinBalance,
      maxBalance: roundedMaxBalance,
      yAxisLabels: barYAxisLabels,
      balanceYAxisLabels,
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

  const chartWidth = 700
  const chartHeight = height
  const margin = { top: 20, right: 80, bottom: 60, left: 80 }
  const plotWidth = chartWidth - margin.left - margin.right
  const plotHeight = chartHeight - margin.top - margin.bottom

  // Calculate positions for bars and line
  const numGroups = chartConfig.labels.length || 1
  const barWidth = Math.min(plotWidth / (numGroups * 3), 40) // Max 40px per bar
  const barSpacing = barWidth * 0.5
  const groupWidth = barWidth * 2 + barSpacing
  const groupSpacing = numGroups > 1 
    ? (plotWidth - groupWidth * numGroups) / (numGroups - 1)
    : 0

  // Helper functions to convert values to coordinates
  const getBarY = (value: number) => {
    const ratio = value / chartConfig.maxBarValue
    return margin.top + plotHeight - ratio * plotHeight
  }

  const getBalanceY = (value: number) => {
    const range = chartConfig.maxBalance - chartConfig.minBalance
    if (range === 0) {
      return margin.top + plotHeight / 2 // Center if no range
    }
    const ratio = (value - chartConfig.minBalance) / range
    return margin.top + plotHeight - ratio * plotHeight
  }

  const getBarX = (index: number, barIndex: number) => {
    const groupX = margin.left + index * (groupWidth + groupSpacing)
    return groupX + barIndex * (barWidth + barSpacing)
  }

  const getLineX = (index: number) => {
    const groupX = margin.left + index * (groupWidth + groupSpacing)
    return groupX + groupWidth / 2
  }

  // Generate line path
  const linePath = chartConfig.balanceData
    .map((value, index) => {
      const x = getLineX(index)
      const y = getBalanceY(value)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

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
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${chartWidth}px` }}>
            <svg width={chartWidth} height={chartHeight} className="overflow-visible">
              {/* Grid lines for bars */}
              {chartConfig.yAxisLabels.map((value, index) => {
                const y = getBarY(value)
                return (
                  <line
                    key={`grid-${index}`}
                    x1={margin.left}
                    y1={y}
                    x2={margin.left + plotWidth}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )
              })}

              {/* Zero line for balance */}
              <line
                x1={margin.left}
                y1={getBalanceY(0)}
                x2={margin.left + plotWidth}
                y2={getBalanceY(0)}
                stroke="#cbd5e1"
                strokeWidth={1.5}
              />

              {/* Bars for income and expense */}
              {chartConfig.labels.map((_label, index) => {
                const incomeX = getBarX(index, 0)
                const expenseX = getBarX(index, 1)
                const incomeHeight = plotHeight - (getBarY(chartConfig.incomeData[index]) - margin.top)
                const expenseHeight = plotHeight - (getBarY(chartConfig.expenseData[index]) - margin.top)
                const incomeY = getBarY(chartConfig.incomeData[index])
                const expenseY = getBarY(chartConfig.expenseData[index])

                return (
                  <g key={`bars-${index}`}>
                    {/* Income bar */}
                    {chartConfig.incomeData[index] > 0 && (
                      <rect
                        x={incomeX}
                        y={incomeY}
                        width={barWidth}
                        height={incomeHeight}
                        fill="#10b981"
                        rx={4}
                        className="transition-opacity hover:opacity-80 cursor-pointer"
                        onClick={() => {
                          const barCenterX = incomeX + barWidth / 2
                          const barTopY = incomeY
                          const barBottomY = incomeY + incomeHeight
                          
                          // Tính toán vị trí tooltip thông minh
                          const tooltipWidth = 140
                          const tooltipHeight = 55
                          const padding = 10
                          
                          // Kiểm tra không gian ở các phía
                          const spaceTop = barTopY - margin.top
                          const spaceBottom = margin.top + plotHeight - barBottomY
                          const spaceLeft = barCenterX - margin.left
                          const spaceRight = margin.left + plotWidth - barCenterX
                          
                          let tooltipX = barCenterX
                          let tooltipY = barTopY
                          let position: 'top' | 'bottom' | 'left' | 'right' = 'top'
                          
                          // Ưu tiên: dưới > trên > trái > phải
                          if (spaceBottom >= tooltipHeight + padding) {
                            // Hiển thị ở dưới
                            tooltipY = barBottomY + padding
                            tooltipX = barCenterX
                            position = 'bottom'
                          } else if (spaceTop >= tooltipHeight + padding) {
                            // Hiển thị ở trên
                            tooltipY = barTopY - tooltipHeight - padding
                            tooltipX = barCenterX
                            position = 'top'
                          } else if (spaceLeft >= tooltipWidth + padding) {
                            // Hiển thị bên trái
                            tooltipX = barCenterX - tooltipWidth - padding
                            tooltipY = barTopY + incomeHeight / 2 - tooltipHeight / 2
                            position = 'left'
                          } else if (spaceRight >= tooltipWidth + padding) {
                            // Hiển thị bên phải
                            tooltipX = barCenterX + padding
                            tooltipY = barTopY + incomeHeight / 2 - tooltipHeight / 2
                            position = 'right'
                          } else {
                            // Mặc định: hiển thị ở dưới, điều chỉnh nếu cần
                            tooltipY = Math.min(barBottomY + padding, margin.top + plotHeight - tooltipHeight - padding)
                            tooltipX = Math.max(tooltipWidth / 2 + padding, Math.min(barCenterX, margin.left + plotWidth - tooltipWidth / 2 - padding))
                            position = 'bottom'
                          }
                          
                          // Đảm bảo tooltip không vượt ra ngoài biên
                          tooltipX = Math.max(margin.left + padding, Math.min(tooltipX, margin.left + plotWidth - tooltipWidth - padding))
                          tooltipY = Math.max(margin.top + padding, Math.min(tooltipY, margin.top + plotHeight - tooltipHeight - padding))
                          
                          setSelectedBar({
                            index,
                            type: 'income',
                            x: barCenterX,
                            y: barTopY + incomeHeight / 2,
                            tooltipX,
                            tooltipY,
                            position,
                          })
                        }}
                      />
                    )}
                    {/* Expense bar */}
                    {chartConfig.expenseData[index] > 0 && (
                      <rect
                        x={expenseX}
                        y={expenseY}
                        width={barWidth}
                        height={expenseHeight}
                        fill="#f43f5e"
                        rx={4}
                        className="transition-opacity hover:opacity-80 cursor-pointer"
                        onClick={() => {
                          const barCenterX = expenseX + barWidth / 2
                          const barTopY = expenseY
                          const barBottomY = expenseY + expenseHeight
                          
                          // Tính toán vị trí tooltip thông minh
                          const tooltipWidth = 140
                          const tooltipHeight = 55
                          const padding = 10
                          
                          // Kiểm tra không gian ở các phía
                          const spaceTop = barTopY - margin.top
                          const spaceBottom = margin.top + plotHeight - barBottomY
                          const spaceLeft = barCenterX - margin.left
                          const spaceRight = margin.left + plotWidth - barCenterX
                          
                          let tooltipX = barCenterX
                          let tooltipY = barTopY
                          let position: 'top' | 'bottom' | 'left' | 'right' = 'top'
                          
                          // Ưu tiên: dưới > trên > trái > phải
                          if (spaceBottom >= tooltipHeight + padding) {
                            // Hiển thị ở dưới
                            tooltipY = barBottomY + padding
                            tooltipX = barCenterX
                            position = 'bottom'
                          } else if (spaceTop >= tooltipHeight + padding) {
                            // Hiển thị ở trên
                            tooltipY = barTopY - tooltipHeight - padding
                            tooltipX = barCenterX
                            position = 'top'
                          } else if (spaceLeft >= tooltipWidth + padding) {
                            // Hiển thị bên trái
                            tooltipX = barCenterX - tooltipWidth - padding
                            tooltipY = barTopY + expenseHeight / 2 - tooltipHeight / 2
                            position = 'left'
                          } else if (spaceRight >= tooltipWidth + padding) {
                            // Hiển thị bên phải
                            tooltipX = barCenterX + padding
                            tooltipY = barTopY + expenseHeight / 2 - tooltipHeight / 2
                            position = 'right'
                          } else {
                            // Mặc định: hiển thị ở dưới, điều chỉnh nếu cần
                            tooltipY = Math.min(barBottomY + padding, margin.top + plotHeight - tooltipHeight - padding)
                            tooltipX = Math.max(tooltipWidth / 2 + padding, Math.min(barCenterX, margin.left + plotWidth - tooltipWidth / 2 - padding))
                            position = 'bottom'
                          }
                          
                          // Đảm bảo tooltip không vượt ra ngoài biên
                          tooltipX = Math.max(margin.left + padding, Math.min(tooltipX, margin.left + plotWidth - tooltipWidth - padding))
                          tooltipY = Math.max(margin.top + padding, Math.min(tooltipY, margin.top + plotHeight - tooltipHeight - padding))
                          
                          setSelectedBar({
                            index,
                            type: 'expense',
                            x: barCenterX,
                            y: barTopY + expenseHeight / 2,
                            tooltipX,
                            tooltipY,
                            position,
                          })
                        }}
                      />
                    )}
                  </g>
                )
              })}

              {/* Balance line */}
              <path
                d={linePath}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Balance line markers */}
              {chartConfig.balanceData.map((value, index) => {
                const x = getLineX(index)
                const y = getBalanceY(value)
                return (
                  <circle
                    key={`marker-${index}`}
                    cx={x}
                    cy={y}
                    r={5}
                    fill="#0ea5e9"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )
              })}

              {/* Y-axis labels for bars (left) */}
              {chartConfig.yAxisLabels.map((value, index) => {
                const y = getBarY(value)
                return (
                  <text
                    key={`y-label-${index}`}
                    x={margin.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {formatInThousands(value)}
                  </text>
                )
              })}

              {/* Y-axis labels for balance (right) */}
              {chartConfig.balanceYAxisLabels.map((value, index) => {
                const y = getBalanceY(value)
                return (
                  <text
                    key={`balance-y-label-${index}`}
                    x={chartWidth - margin.right + 10}
                    y={y + 4}
                    textAnchor="start"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {formatInThousands(value)}
                  </text>
                )
              })}

              {/* X-axis labels */}
              {chartConfig.labels.map((label, index) => {
                const x = getLineX(index)
                return (
                  <text
                    key={`x-label-${index}`}
                    x={x}
                    y={chartHeight - margin.bottom + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#1e293b"
                    fontWeight={600}
                  >
                    {label}
                  </text>
                )
              })}

              {/* Axis labels */}
              <text
                x={margin.left - 50}
                y={chartHeight / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
                transform={`rotate(-90, ${margin.left - 50}, ${chartHeight / 2})`}
              >
                Số tiền (nghìn ₫)
              </text>
              <text
                x={chartWidth / 2}
                y={chartHeight - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
              >
                Kỳ
              </text>

              {/* Tooltip khi click vào cột */}
              {selectedBar && (() => {
                const tooltipWidth = 140
                const tooltipHeight = 55
                const tooltipCenterX = selectedBar.tooltipX + tooltipWidth / 2
                const tooltipCenterY = selectedBar.tooltipY + tooltipHeight / 2
                
                // Tính toán điểm kết nối từ cột đến tooltip
                // Điểm bắt đầu: giữa cột (theo chiều ngang và dọc)
                const lineStartX = selectedBar.x
                const lineStartY = selectedBar.y
                
                // Điểm kết thúc: điểm gần nhất trên tooltip
                let lineEndX = tooltipCenterX
                let lineEndY = tooltipCenterY
                
                if (selectedBar.position === 'top') {
                  // Tooltip ở trên, kết nối từ đáy tooltip
                  lineEndY = selectedBar.tooltipY + tooltipHeight
                } else if (selectedBar.position === 'bottom') {
                  // Tooltip ở dưới, kết nối từ đỉnh tooltip
                  lineEndY = selectedBar.tooltipY
                } else if (selectedBar.position === 'left') {
                  // Tooltip bên trái, kết nối từ cạnh phải tooltip
                  lineEndX = selectedBar.tooltipX + tooltipWidth
                  lineEndY = tooltipCenterY
                } else if (selectedBar.position === 'right') {
                  // Tooltip bên phải, kết nối từ cạnh trái tooltip
                  lineEndX = selectedBar.tooltipX
                  lineEndY = tooltipCenterY
                }
                
                return (
                  <g>
                    {/* Đường line từ cột đến tooltip */}
                    <line
                      x1={lineStartX}
                      y1={lineStartY}
                      x2={lineEndX}
                      y2={lineEndY}
                      stroke="rgba(15, 23, 42, 0.95)"
                      strokeWidth={2}
                    />
                    {/* Background cho tooltip */}
                    <rect
                      x={selectedBar.tooltipX}
                      y={selectedBar.tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      fill="rgba(15, 23, 42, 0.95)"
                      rx={8}
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth={1}
                    />
                    {/* Text trong tooltip */}
                    <text
                      x={tooltipCenterX}
                      y={selectedBar.tooltipY + 20}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#ffffff"
                      fontWeight={600}
                    >
                      {selectedBar.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                    </text>
                    <text
                      x={tooltipCenterX}
                      y={selectedBar.tooltipY + 40}
                      textAnchor="middle"
                      fontSize="13"
                      fill="#ffffff"
                      fontWeight={700}
                    >
                      {formatCurrency(
                        selectedBar.type === 'income'
                          ? chartConfig.incomeData[selectedBar.index]
                          : chartConfig.expenseData[selectedBar.index]
                      )}
                    </text>
                  </g>
                )
              })()}
            </svg>
          </div>
        </div>

        {/* Click outside để đóng tooltip */}
        {selectedBar && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setSelectedBar(null)}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          />
        )}

        {/* Balance display for each period */}
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="text-slate-600">{item.label}</span>
              <span
                className={`font-semibold ${
                  item.balance >= 0 ? 'text-sky-600' : 'text-rose-600'
                }`}
              >
                Cân đối: {formatCurrency(item.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

