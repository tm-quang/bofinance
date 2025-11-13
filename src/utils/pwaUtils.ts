// PWA Utility functions

/**
 * Check if app is running as PWA (installed)
 */
export const isPWA = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = window.navigator as any
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    document.referrer.includes('android-app://')
  )
}

/**
 * Check if running on mobile device
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Get safe area insets for notch devices
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement)
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0')
  }
}

/**
 * Update theme color dynamically
 */
export const updateThemeColor = (color: string) => {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', color)
  }
}

/**
 * Prevent pull-to-refresh on mobile
 */
export const preventPullToRefresh = () => {
  let lastTouchY = 0
  let preventPullToRefresh = false

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return
    lastTouchY = e.touches[0].clientY
    preventPullToRefresh = window.pageYOffset === 0
  }, { passive: false })

  document.addEventListener('touchmove', (e) => {
    const touchY = e.touches[0].clientY
    const touchYDelta = touchY - lastTouchY
    lastTouchY = touchY

    if (preventPullToRefresh && touchYDelta > 0) {
      e.preventDefault()
    }
  }, { passive: false })
}

/**
 * Enable haptic feedback (if supported)
 */
export const hapticFeedback = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30
    navigator.vibrate(duration)
  }
}

/**
 * Request persistent storage
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist()
    return isPersisted
  }
  return false
}

/**
 * Check storage quota
 */
export const checkStorageQuota = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0
    }
  }
  return null
}
