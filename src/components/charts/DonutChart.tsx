import { useMemo } from 'react'
import type React from 'react'
import type { TransactionRecord } from '../../lib/transactionService'
import type { CategoryRecord } from '../../lib/categoryService'

type DonutChartData = {
  category_id: string
  category_name: string
  amount: number
  percentage: number
  color: string
}

type DonutChartProps = {
  transactions: TransactionRecord[]
  categories: CategoryRecord[]
  type: 'Thu' | 'Chi'
  totalAmount: number
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const DonutChart = ({ transactions, categories, type, totalAmount }: DonutChartProps) => {
  const chartData = useMemo(() => {
    // Ensure we have both transactions and categories before processing
    if (transactions.length === 0 || totalAmount === 0 || categories.length === 0) {
      return []
    }

    // Group transactions by category
    const categoryMap = new Map<string, number>()
    transactions.forEach((transaction) => {
      const current = categoryMap.get(transaction.category_id) || 0
      categoryMap.set(transaction.category_id, current + transaction.amount)
    })

    // Create chart data with colors assigned immediately
    const entries = Array.from(categoryMap.entries())
    const data: DonutChartData[] = entries
      .map(([category_id, amount]) => {
        const category = categories.find((cat) => cat.id === category_id)
        return {
          category_id,
          category_name: category?.name || 'Không xác định',
          amount,
          percentage: (amount / totalAmount) * 100,
          color: '', // Will be assigned after sort
        }
      })
      .sort((a, b) => b.amount - a.amount)
      .map((item, index) => ({
        ...item,
        color: COLORS[index % COLORS.length], // Assign color after sort
      }))

    // Debug log
    console.log('DonutChart chartData:', data.map(d => ({ name: d.category_name, color: d.color, percentage: d.percentage })))

    return data
  }, [transactions, categories, totalAmount])

  // Calculate SVG path for donut chart
  const calculatePath = (data: DonutChartData[], index: number) => {
    if (data.length === 0 || index >= data.length) return ''

    const centerX = 100
    const centerY = 100
    const radius = 80
    const innerRadius = 50

    // Calculate cumulative angles
    let startAngle = -90 // Start from top
    for (let i = 0; i < index; i++) {
      startAngle += (data[i].percentage / 100) * 360
    }
    
    const endAngle = startAngle + (data[index].percentage / 100) * 360

    // Convert to radians
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    // Calculate points on outer circle
    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)

    // Calculate points on inner circle
    const x3 = centerX + innerRadius * Math.cos(endAngleRad)
    const y3 = centerY + innerRadius * Math.sin(endAngleRad)
    const x4 = centerX + innerRadius * Math.cos(startAngleRad)
    const y4 = centerY + innerRadius * Math.sin(startAngleRad)

    // Determine if we need large arc (for outer circle)
    const angleDiff = ((endAngle - startAngle + 360) % 360)
    const largeArcFlag = angleDiff > 180 ? 1 : 0

    // Build path: Move to start point on outer circle
    // Arc along outer circle to end point
    // Line to inner circle end point
    // Arc along inner circle back to start point
    // Close path
    const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
    
    return path
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        Chưa có dữ liệu {type === 'Thu' ? 'Thu nhập' : 'Chi tiêu'} hôm nay
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="relative flex items-center justify-center" style={{ minHeight: '256px' }}>
        <svg 
          viewBox="0 0 200 200" 
          width="200"
          height="200"
          className="h-64 w-64 sm:h-80 sm:w-80"
          style={{ display: 'block', position: 'relative', zIndex: 1 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle - full donut outline */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            opacity="0.3"
          />
          <circle
            cx="100"
            cy="100"
            r="50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            opacity="0.3"
          />
          
          {chartData.map((item, index) => {
            const color = item.color || COLORS[index % COLORS.length]
            const pathData = calculatePath(chartData, index)
            
            if (!pathData || !color) {
              console.warn(`Missing path or color for index ${index}:`, { pathData, color, item })
              return null
            }
            
            // Debug: Log full path for first segment
            if (index === 0) {
              console.log(`Path ${index} full data:`, {
                color,
                pathData,
                percentage: item.percentage,
                startAngle: -90,
                endAngle: -90 + (item.percentage / 100) * 360
              })
            }
            
            return (
              <path
                key={`path-${item.category_id}-${index}`}
                d={pathData}
                fill={color}
                stroke="white"
                strokeWidth="2"
                style={{ 
                  fill: color,
                  stroke: 'white',
                  strokeWidth: '2',
                  opacity: 1,
                  pointerEvents: 'auto'
                }}
                className="transition-opacity hover:opacity-80"
              />
            )
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">{type === 'Thu' ? 'THU NHẬP' : 'CHI TIÊU'}</p>
          <p className="text-lg font-bold text-slate-900 sm:text-xl">{formatCurrency(totalAmount)}</p>
          {chartData.length > 0 && (
            <p className="text-xs text-slate-400 sm:text-sm">
              {chartData[0].percentage.toFixed(0)}% {chartData[0].category_name}
            </p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {chartData.map((item, index) => {
          const color = item.color || COLORS[index % COLORS.length]
          return (
            <div key={`${item.category_id}-legend`} className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 sm:p-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div
                  className="h-3 w-3 rounded-full sm:h-4 sm:w-4"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-slate-700 sm:text-sm">{item.category_name}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900 sm:text-sm">{formatCurrency(item.amount)}</p>
                <p className="text-[10px] text-slate-500 sm:text-xs">{item.percentage.toFixed(1)}%</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

