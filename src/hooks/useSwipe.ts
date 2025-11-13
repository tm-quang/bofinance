import { useRef, useState } from 'react'

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

export const useSwipe = ({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeOptions = {}) => {
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const [isDragging, setIsDragging] = useState(false)
  const [translateX, setTranslateX] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)

    // Only allow horizontal swipe
    if (Math.abs(deltaX) > deltaY) {
      setTranslateX(deltaX)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    if (Math.abs(translateX) > threshold) {
      if (translateX > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (translateX < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }

    setTranslateX(0)
    setIsDragging(false)
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    translateX,
    isDragging,
  }
}

