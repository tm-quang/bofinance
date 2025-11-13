/**
 * Native App Behavior
 * Make PWA behave exactly like a native Android app
 */

/**
 * Prevent zoom on double tap and pinch
 */
export const preventZoom = () => {
  // Prevent pinch zoom
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault()
  })

  document.addEventListener('gesturechange', (e) => {
    e.preventDefault()
  })

  document.addEventListener('gestureend', (e) => {
    e.preventDefault()
  })

  // Prevent double-tap zoom
  let lastTouchEnd = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }, { passive: false })

  // Prevent zoom via keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === '+' || e.key === '-' || e.key === '=')
    ) {
      e.preventDefault()
    }
  })

  // Prevent zoom via mouse wheel
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
    }
  }, { passive: false })
}

/**
 * Prevent pull-to-refresh (Chrome mobile)
 */
export const preventPullToRefresh = () => {
  let startY = 0
  let startX = 0
  let isScrolling = false
  let hasMoved = false

  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].pageY
    startX = e.touches[0].pageX
    isScrolling = window.scrollY > 0 || document.documentElement.scrollTop > 0
    hasMoved = false
  }, { passive: true })

  document.addEventListener('touchmove', (e) => {
    if (!hasMoved) {
      const currentY = e.touches[0].pageY
      const currentX = e.touches[0].pageX
      const deltaY = currentY - startY
      const deltaX = Math.abs(currentX - startX)
      
      // Only prevent if it's clearly a vertical pull down (not horizontal swipe)
      // And only if we're at the very top of the page
      const isAtTop = window.scrollY === 0 && document.documentElement.scrollTop === 0
      const isVerticalPull = deltaY > 0 && deltaY > deltaX * 2
      
      if (!isScrolling && isAtTop && isVerticalPull && deltaY > 10) {
        e.preventDefault()
        hasMoved = true
      } else {
        hasMoved = true
      }
    }
  }, { passive: false })
}

/**
 * Prevent context menu (long press)
 */
export const preventContextMenu = () => {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
}

/**
 * Prevent text selection on long press (except inputs)
 */
export const preventTextSelection = () => {
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable

    if (!isInput) {
      e.preventDefault()
    }
  })
}

/**
 * Handle back button (Android)
 */
export const handleBackButton = (callback: () => void) => {
  window.addEventListener('popstate', () => {
    callback()
  })
}

/**
 * Prevent overscroll (rubber band effect)
 */
export const preventOverscroll = () => {
  document.body.style.overscrollBehavior = 'none'
  document.documentElement.style.overscrollBehavior = 'none'
}

/**
 * Lock orientation to portrait (if supported)
 */
export const lockOrientation = async (orientation: 'portrait' | 'landscape' = 'portrait') => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orientationLock = (screen.orientation as any)?.lock
    if (screen.orientation && orientationLock) {
      await orientationLock(orientation)
    }
  } catch {
    console.log('Orientation lock not supported')
  }
}

/**
 * Hide splash screen after app loads
 */
export const hideSplashScreen = () => {
  const splash = document.getElementById('splash-screen')
  if (splash) {
    splash.style.opacity = '0'
    setTimeout(() => {
      splash.remove()
    }, 300)
  }
}

/**
 * Initialize all native app behaviors
 */
export const initNativeAppBehavior = () => {
  preventZoom()
  preventPullToRefresh()
  preventContextMenu()
  preventOverscroll()
  
  // Optional: Uncomment if needed
  // preventTextSelection()
  // lockOrientation('portrait')

  console.log('✅ Native app behavior initialized')
}

/**
 * Check if running as installed PWA
 */
export const isInstalledPWA = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = window.navigator as any
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    document.referrer.includes('android-app://')
  )
}

/**
 * Show install prompt for PWA
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let deferredPrompt: any = null

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    console.log('PWA install prompt ready')
  })
}

export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    return false
  }

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  
  return outcome === 'accepted'
}

/**
 * Add haptic feedback to buttons
 */
export const addHapticFeedback = () => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.classList.contains('clickable')
    ) {
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }
  })
}

/**
 * Optimize for performance
 */
export const optimizePerformance = () => {
  // Enable hardware acceleration
  document.body.style.transform = 'translateZ(0)'
  document.body.style.backfaceVisibility = 'hidden'
  
  // Reduce motion if user prefers
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.scrollBehavior = 'auto'
  }
}
