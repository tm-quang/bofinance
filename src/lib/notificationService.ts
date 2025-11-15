/**
 * Browser Notification Service
 * Handles browser notifications with sound for reminders
 */

import { playNotificationSound as playCustomNotificationSound } from './notificationSoundService'
import { sendNotificationViaSW, getServiceWorkerRegistration } from './serviceWorkerManager'

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Check if notification permission is granted
export const hasNotificationPermission = (): boolean => {
  if (!('Notification' in window)) {
    return false
  }
  return Notification.permission === 'granted'
}

// Send browser notification (works even when browser is closed via Service Worker)
export const sendNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<Notification | null> => {
  if (!hasNotificationPermission()) {
    const granted = await requestNotificationPermission()
    if (!granted) {
      console.warn('Notification permission denied')
      return null
    }
  }

  try {
    // Play sound (uses custom sound preference if set)
    playCustomNotificationSound()

    // Try to use Service Worker for background notifications
    const swRegistration = getServiceWorkerRegistration()
    if (swRegistration && swRegistration.active) {
      // Use Service Worker notification (works even when browser is closed)
      await sendNotificationViaSW(title, {
        icon: '/bogin-logo.png',
        badge: '/bogin-logo.png',
        tag: 'reminder',
        requireInteraction: false,
        silent: false,
        ...options,
        // @ts-ignore - vibrate is supported in Service Worker notifications
        vibrate: [200, 100, 200],
      })
      return null // Service Worker handles the notification
    }

    // Fallback to regular notification (only works when browser is open)
    const notification = new Notification(title, {
      icon: '/bogin-logo.png', // App icon
      badge: '/bogin-logo.png',
      tag: 'reminder', // Replace previous notifications with same tag
      requireInteraction: false,
      silent: false, // Enable sound
      ...options,
    })

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    // Handle click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  } catch (error) {
    console.error('Error sending notification:', error)
    return null
  }
}

// Send reminder notification
export const sendReminderNotification = async (
  reminderTitle: string,
  amount?: number | null,
  type?: 'Thu' | 'Chi'
): Promise<Notification | null> => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value)

  let body = reminderTitle
  if (amount) {
    body = `${reminderTitle}\n${formatCurrency(amount)}`
  }

  const emoji = type === 'Thu' ? '💰' : '💸'

  return sendNotification(`${emoji} Nhắc nhở`, {
    body,
    icon: '/bogin-logo.png',
    badge: '/bogin-logo.png',
  })
}

// Send note notification
export const sendNoteNotification = async (noteTitle: string): Promise<Notification | null> => {
  return sendNotification('📝 Ghi chú', {
    body: noteTitle,
    icon: '/bogin-logo.png',
    badge: '/bogin-logo.png',
  })
}

// Check and send notifications for reminders due now
export const checkAndSendReminderNotifications = async (
  reminders: Array<{
    reminder_date: string
    reminder_time: string | null
    title: string
    amount: number | null
    type: 'Thu' | 'Chi'
    status: string
    enable_notification?: boolean
  }>
): Promise<void> => {
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0]
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const dueReminders = reminders.filter((reminder) => {
    if (reminder.status !== 'pending') return false
    if (reminder.reminder_date !== currentDate) return false
    // Check if notification is enabled (default to true if not set)
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
    // Check if it's a note (no amount) or reminder
    if (reminder.amount) {
      await sendReminderNotification(reminder.title, reminder.amount, reminder.type)
    } else {
      await sendNoteNotification(reminder.title)
    }
    // Small delay between notifications
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

