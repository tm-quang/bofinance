import { useMemo, useState, useRef, useEffect } from 'react'
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
  const [selectedSegment, setSelectedSegment] = useState<DonutChartData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const tooltipDimensions = useRef({ width: 260, height: 156, margin: 12 })

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

  // Calculate angle for segment (middle angle)
  const calculateSegmentAngle = (data: DonutChartData[], index: number): number => {
    if (data.length === 0 || index >= data.length) return -90

    let startAngle = -90
    for (let i = 0; i < index; i++) {
      startAngle += (data[i].percentage / 100) * 360
    }
    
    const percentage = data[index].percentage
    const middleAngle = startAngle + (percentage / 100) * 180 // Middle of the segment
    
    return middleAngle
  }

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
    
    const percentage = data[index].percentage
    const endAngle = startAngle + (percentage / 100) * 360

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
    // For 100% (full circle), we need large arc flag = 1
    const angleDiff = percentage === 100 ? 360 : ((endAngle - startAngle + 360) % 360)
    const largeArcFlag = angleDiff > 180 ? 1 : 0

    // Special handling for 100% (full circle)
    if (percentage === 100) {
      // For full circle, draw two 180-degree arcs to complete the circle
      // Calculate midpoint (180 degrees from start)
      const midAngleRad = startAngleRad + Math.PI
      const xMid = centerX + radius * Math.cos(midAngleRad)
      const yMid = centerY + radius * Math.sin(midAngleRad)
      const xMidInner = centerX + innerRadius * Math.cos(midAngleRad)
      const yMidInner = centerY + innerRadius * Math.sin(midAngleRad)
      
      // Outer circle: two 180-degree arcs
      // Inner circle: two 180-degree arcs (reverse direction)
      const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 1 1 ${xMid.toFixed(2)} ${yMid.toFixed(2)} A ${radius} ${radius} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} A ${innerRadius} ${innerRadius} 0 1 0 ${xMidInner.toFixed(2)} ${yMidInner.toFixed(2)} A ${innerRadius} ${innerRadius} 0 1 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
      return path
    }

    // Build path: Move to start point on outer circle
    // Arc along outer circle to end point
    // Line to inner circle end point
    // Arc along inner circle back to start point
    // Close path
    const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
    
    return path
  }

  // Get transaction count for selected segment
  const selectedTransactionCount = selectedSegment
    ? transactions.filter((t) => t.category_id === selectedSegment.category_id).length
    : 0

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chartContainerRef.current) {
        const target = e.target as Node
        // Check if click is outside the chart container
        if (!chartContainerRef.current.contains(target)) {
          setSelectedSegment(null)
          setTooltipPosition(null)
        }
      }
    }

    if (selectedSegment) {
      // Use mousedown to catch clicks before they bubble
      document.addEventListener('mousedown', handleClickOutside)
      // Also listen for clicks on the document
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [selectedSegment])

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50">
        <img 
          src="/savings-74.png" 
          alt="Chưa có dữ liệu" 
          className="h-48 w-48 object-contain opacity-60"
        />
      </div>
    )
  }

  return (
    <div>
      {/* Chart */}
      <div 
        ref={chartContainerRef}
        className="relative flex items-center justify-center" 
        style={{ minHeight: '256px' }}
      >
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
            
            const handleClick = () => {
              const segmentAngle = calculateSegmentAngle(chartData, index)
              
              // Calculate position on the outer edge of the donut
              const centerX = 100
              const centerY = 100
              const radius = 80
              const angleRad = (segmentAngle * Math.PI) / 180
              
              // Position on outer circle (point where tooltip arrow should point)
              const pointX = centerX + radius * Math.cos(angleRad)
              const pointY = centerY + radius * Math.sin(angleRad)
              
              // Get container dimensions
              if (chartContainerRef.current) {
                const container = chartContainerRef.current
                const rect = container.getBoundingClientRect()
                const svgElement = container.querySelector('svg')
                if (svgElement) {
                  const svgRect = svgElement.getBoundingClientRect()
                  
                  const offsetX = (rect.width - svgRect.width) / 2
                  const offsetY = (rect.height - svgRect.height) / 2
                  const relativeX = offsetX + (pointX / 200) * svgRect.width
                  const relativeY = offsetY + (pointY / 200) * svgRect.height

                  const { width, height, margin } = tooltipDimensions.current
                  const desiredLeft = relativeX - width / 2
                  const desiredTop = relativeY - height - margin
                  const clampedLeft = Math.max(
                    margin,
                    Math.min(desiredLeft, rect.width - width - margin)
                  )
                  const clampedTop = Math.max(
                    margin,
                    Math.min(desiredTop, rect.height - height - margin)
                  )

                  setSelectedSegment(item)
                  setTooltipPosition({
                    left: clampedLeft,
                    top: clampedTop,
                  })
                }
              }
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
                  opacity: selectedSegment?.category_id === item.category_id ? 0.7 : 1,
                  pointerEvents: 'auto',
                  cursor: 'pointer'
                }}
                className="transition-all hover:opacity-90 cursor-pointer"
                onClick={handleClick}
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

        {/* Inline Tooltip */}
        {selectedSegment && tooltipPosition && (
          <div
            className="absolute z-50"
            style={{
              left: `${tooltipPosition.left}px`,
              top: `${tooltipPosition.top}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tooltip content */}
            <div
              className="rounded-xl shadow-2xl p-4 text-white min-w-[220px] relative"
              style={{
                background: selectedSegment.color,
              }}
            >
              <div className="font-bold text-base mb-3">{selectedSegment.category_name}</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span>Số tiền:</span>
                  <strong>{formatCurrency(selectedSegment.amount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tỷ lệ:</span>
                  <strong>{selectedSegment.percentage.toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Số giao dịch:</span>
                  <strong>{selectedTransactionCount}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

