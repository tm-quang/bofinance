/**
 * Service Worker for PWA
 * Handles background notifications and offline support
 */

const CACHE_NAME = 'bofin-v1'
const NOTIFICATION_TAG = 'bofin-reminder'

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  self.skipWaiting() // Activate immediately
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  return self.clients.claim() // Take control of all pages immediately
})

// Background sync for checking reminders
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-reminders') {
    console.log('[Service Worker] Background sync: Checking reminders')
    event.waitUntil(checkAndNotifyReminders())
  }
})

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicSync', (event) => {
    if (event.tag === 'check-reminders-periodic') {
      console.log('[Service Worker] Periodic sync: Checking reminders')
      event.waitUntil(checkAndNotifyReminders())
    }
  })
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag)
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag)
})

// Message handler from main thread
self.addEventListener('message', async (event) => {
  console.log('[Service Worker] Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CHECK_REMINDERS') {
    // Reminders sent from main thread
    const reminders = event.data.reminders || []
    if (reminders.length > 0) {
      // Store reminders for background checking
      await storeReminders(reminders)
      // Check immediately
      checkAndNotifyRemindersWithData(reminders)
    } else {
      // Use stored reminders
      checkAndNotifyReminders()
    }
  }
  
  if (event.data && event.data.type === 'STORE_REMINDERS') {
    // Store reminders for background checking
    const reminders = event.data.reminders || []
    await storeReminders(reminders)
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    showNotification(title, options)
  }
})

/**
 * Check reminders and send notifications (from stored data)
 */
async function checkAndNotifyReminders() {
  try {
    // Get stored reminders from IndexedDB or fetch from API
    const reminders = await getStoredReminders()
    if (!reminders || reminders.length === 0) {
      return
    }
    checkAndNotifyRemindersWithData(reminders)
  } catch (error) {
    console.error('[Service Worker] Error checking reminders:', error)
  }
}

/**
 * Check reminders with provided data and send notifications
 */
async function checkAndNotifyRemindersWithData(reminders) {
  if (!reminders || reminders.length === 0) {
    return
  }

  try {
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const dueReminders = reminders.filter((reminder) => {
      if (reminder.status !== 'pending') return false
      if (reminder.reminder_date !== currentDate) return false
      if (reminder.enable_notification === false) return false

      // If no time specified, notify at start of day (00:00)
      if (!reminder.reminder_time) {
        return currentTime === '00:00'
      }

      // Check if time matches (within 1 minute tolerance)
      const [reminderHour, reminderMinute] = reminder.reminder_time.split(':').map(Number)
      const timeDiff = Math.abs(
        now.getHours() * 60 + now.getMinutes() - (reminderHour * 60 + reminderMinute)
      )

      return timeDiff <= 1 // Within 1 minute
    })

    // Send notifications for due reminders
    for (const reminder of dueReminders) {
      await sendReminderNotification(reminder)
      // Small delay between notifications
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  } catch (error) {
    console.error('[Service Worker] Error processing reminders:', error)
  }
}

/**
 * Get stored reminders from cache
 */
async function getStoredReminders() {
  try {
    // Get reminders from cache (stored by main thread)
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match('/reminders-data')
    if (response) {
      const data = await response.json()
      return data.reminders || []
    }
  } catch (error) {
    console.warn('[Service Worker] Could not get reminders from cache:', error)
  }
  return []
}

/**
 * Store reminders in cache (called from main thread)
 */
async function storeReminders(reminders) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = new Response(JSON.stringify({ reminders }), {
      headers: { 'Content-Type': 'application/json' },
    })
    await cache.put('/reminders-data', response)
  } catch (error) {
    console.warn('[Service Worker] Could not store reminders:', error)
  }
}

/**
 * Send reminder notification
 */
async function sendReminderNotification(reminder) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value)
  }

  let title = '📝 Ghi chú'
  let body = reminder.title

  if (reminder.amount) {
    const emoji = reminder.type === 'Thu' ? '💰' : '💸'
    title = `${emoji} Nhắc nhở`
    body = `${reminder.title}\n${formatCurrency(reminder.amount)}`
  }

  const options = {
    body,
    icon: '/bogin-logo.png',
    badge: '/bogin-logo.png',
    tag: `${NOTIFICATION_TAG}-${reminder.id}`,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200], // Vibration pattern
    data: {
      reminderId: reminder.id,
      url: '/reminders',
    },
  }

  await showNotification(title, options)
}

/**
 * Show notification
 */
async function showNotification(title, options = {}) {
  const defaultOptions = {
    icon: '/bogin-logo.png',
    badge: '/bogin-logo.png',
    tag: NOTIFICATION_TAG,
    requireInteraction: false,
    silent: false,
    ...options,
  }

  return self.registration.showNotification(title, defaultOptions)
}

/**
 * Play notification sound (using Web Audio API)
 */
function playNotificationSound() {
  try {
    const audioContext = new (self.AudioContext || self.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.warn('[Service Worker] Could not play notification sound:', error)
  }
}

