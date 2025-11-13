import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface SwipeBackOptions {
  enabled?: boolean
  threshold?: number
  edgeWidth?: number
}

export const useSwipeBack = (options: SwipeBackOptions = {}) => {
  const {
    enabled = true,
    threshold = 100,
    edgeWidth = 50
  } = options

  const navigate = useNavigate()
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const isSwiping = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
      
      // Only enable swipe if starting from left edge
      if (touch.clientX < edgeWidth) {
        isSwiping.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = Math.abs(touch.clientY - touchStartY.current)

      // Prevent vertical scroll if horizontal swipe is detected
      if (deltaX > 10 && deltaY < 30) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = Math.abs(touch.clientY - touchStartY.current)

      // Swipe right from left edge = go back
      if (deltaX > threshold && deltaY < 100) {
        navigate(-1)
      }

      isSwiping.current = false
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, threshold, edgeWidth, navigate])
}
