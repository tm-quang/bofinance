import { useEffect, useState, useRef } from 'react'
import type { NotificationRecord } from '../../lib/notificationService'

// CSS animation for tooltip - mở ra từ icon và thu về icon
if (typeof document !== 'undefined') {
  const styleId = 'notification-tooltip-styles'
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style')
    styleSheet.id = styleId
    styleSheet.textContent = `
      @keyframes slideInFromIcon {
        from {
          opacity: 0;
          transform: scale(0.8) translateX(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateX(0);
        }
      }
      
      @keyframes slideOutToIcon {
        from {
          opacity: 1;
          transform: scale(1) translateX(0);
        }
        to {
          opacity: 0;
          transform: scale(0.8) translateX(20px);
        }
      }
    `
    document.head.appendChild(styleSheet)
  }
}

type NotificationTooltipProps = {
  isVisible: boolean
  notification: NotificationRecord | null
  targetElement: HTMLElement | null
  onClose: () => void
}

export const NotificationTooltip = ({
  isVisible,
  notification,
  targetElement,
  onClose,
}: NotificationTooltipProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0, arrowTop: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible || !targetElement || !notification) {
      return
    }

    const updatePosition = () => {
      try {
        // Kiểm tra targetElement vẫn còn tồn tại
        if (!targetElement || !document.body.contains(targetElement)) {
          return
        }

        const rect = targetElement.getBoundingClientRect()
        const tooltipWidth = 220 // Fixed width (compact)
        const tooltipHeight = tooltipRef.current?.offsetHeight || 55
        
        // Position tooltip to the left of the icon, vertically centered
        const top = rect.top + rect.height / 2 - tooltipHeight / 2
        const left = rect.left - tooltipWidth - 4 // 4px gap from icon (sát nhất có thể)
        
        // Ensure tooltip doesn't go off screen
        const padding = 16
        let adjustedTop = top
        if (adjustedTop < padding) {
          adjustedTop = padding
        } else if (adjustedTop + tooltipHeight > window.innerHeight - padding) {
          adjustedTop = window.innerHeight - tooltipHeight - padding
        }
        
        // Arrow position (right side of tooltip, vertically centered)
        const iconCenterY = rect.top + rect.height / 2
        const arrowTop = iconCenterY - adjustedTop

        setPosition({ top: adjustedTop, left, arrowTop })
      } catch (error) {
        // Nếu có lỗi, đóng tooltip
        console.error('Error updating tooltip position:', error)
        onClose()
      }
    }

    // Small delay to ensure tooltip is rendered
    const timeoutId = setTimeout(updatePosition, 10)
    updatePosition()
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, targetElement, notification, onClose])

  // Đóng tooltip khi scroll
  useEffect(() => {
    if (!isVisible) return

    const handleScroll = () => {
      try {
        onClose()
      } catch (error) {
        console.error('Error closing tooltip on scroll:', error)
      }
    }

    // Listen to scroll on window and main elements
    window.addEventListener('scroll', handleScroll, { passive: true })
    const mainElements = document.querySelectorAll('main')
    const mainElementArray = Array.from(mainElements)
    mainElementArray.forEach((main) => {
      main.addEventListener('scroll', handleScroll, { passive: true })
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      mainElementArray.forEach((main) => {
        main.removeEventListener('scroll', handleScroll)
      })
    }
  }, [isVisible, onClose])

  // Không render nếu không có notification hoặc targetElement
  if (!notification || !targetElement || !isVisible) {
    return null
  }

  return (
    <>
      {/* Tooltip */}
      {isVisible && notification && (
        <div
          ref={tooltipRef}
          className="fixed z-50 rounded-xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500 shadow-2xl shadow-blue-500/30 ring-1 ring-blue-400/30"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: '220px',
            transformOrigin: 'right center',
            animation: 'slideInFromIcon 0.3s ease-out forwards',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Arrow pointing to icon (right side) - cùng màu gradient với nội dung, sát icon nhất */}
        <div
          className="absolute h-3 w-3 rotate-45 bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500"
          style={{ 
            top: `${position.arrowTop - 6}px`,
            right: '-6px', // Mũi tên sát icon nhất
          }}
        />

        {/* Content - Compact layout */}
        <div className="relative rounded-xl p-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white line-clamp-1 drop-shadow-sm">
                {notification.title}
              </p>
              <p className="mt-0.5 text-[10px] text-white/90 line-clamp-1 drop-shadow-sm">
                {notification.message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-0.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              aria-label="Đóng"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        </div>
      )}
    </>
  )
}

