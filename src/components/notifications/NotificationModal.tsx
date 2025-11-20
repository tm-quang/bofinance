import React, { useEffect, useState, useMemo } from 'react'
import {
  FaBell,
  FaExchangeAlt,
  FaCalendar,
  FaExclamationTriangle,
  FaGift,
  FaCog,
  FaBullhorn,
  FaTrash,
  FaCheck,
  FaCheckDouble,
  FaTimes,
} from 'react-icons/fa'

import { useNotification } from '../../contexts/notificationContext.helpers'
import { NotificationListSkeleton } from '../skeletons'
import {
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type NotificationRecord,
  type NotificationType,
} from '../../lib/notificationService'

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Reset time for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Hôm nay'
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Hôm qua'
  } else {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'transaction':
      return <FaExchangeAlt className="h-5 w-5" />
    case 'reminder':
      return <FaCalendar className="h-5 w-5" />
    case 'budget':
      return <FaExclamationTriangle className="h-5 w-5" />
    case 'system':
      return <FaCog className="h-5 w-5" />
    case 'admin':
      return <FaBullhorn className="h-5 w-5" />
    case 'promotion':
      return <FaGift className="h-5 w-5" />
    case 'event':
      return <FaCalendar className="h-5 w-5" />
    default:
      return <FaBell className="h-5 w-5" />
  }
}

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'transaction':
      return 'bg-blue-100 text-blue-600'
    case 'reminder':
      return 'bg-amber-100 text-amber-600'
    case 'budget':
      return 'bg-rose-100 text-rose-600'
    case 'system':
      return 'bg-slate-100 text-slate-600'
    case 'admin':
      return 'bg-purple-100 text-purple-600'
    case 'promotion':
      return 'bg-emerald-100 text-emerald-600'
    case 'event':
      return 'bg-indigo-100 text-indigo-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

const getNotificationTypeLabel = (type: NotificationType): string => {
  switch (type) {
    case 'transaction':
      return 'Giao dịch'
    case 'reminder':
      return 'Nhắc nhở'
    case 'budget':
      return 'Hạn mức'
    case 'system':
      return 'Hệ thống'
    case 'admin':
      return 'Quản trị'
    case 'promotion':
      return 'Khuyến mãi'
    case 'event':
      return 'Sự kiện'
    default:
      return 'Thông báo'
  }
}

type NotificationModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { success, error: showError } = useNotification()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all')
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const modalRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const data = await getAllNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
      showError('Không thể tải thông báo. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, status: 'read', read_at: new Date().toISOString() } : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
      showError('Không thể đánh dấu thông báo là đã đọc.')
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true)
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          status: 'read' as const,
          read_at: notif.read_at || new Date().toISOString(),
        }))
      )
      success('Đã đánh dấu tất cả thông báo là đã đọc')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      showError('Không thể đánh dấu tất cả thông báo là đã đọc.')
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((notif) => notif.id !== id))
      success('Đã xóa thông báo')
    } catch (error) {
      console.error('Error deleting notification:', error)
      showError('Không thể xóa thông báo.')
    }
  }

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const filtered = selectedType === 'all'
      ? notifications
      : notifications.filter((notif) => notif.type === selectedType)

    const groups: Record<string, NotificationRecord[]> = {}
    filtered.forEach((notif) => {
      const dateKey = formatDate(notif.created_at)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(notif)
    })
    return groups
  }, [notifications, selectedType])

  // Get notification types for filter
  const notificationTypes = useMemo(() => {
    const types = new Set<NotificationType>()
    notifications.forEach((notif) => types.add(notif.type))
    return Array.from(types)
  }, [notifications])

  const unreadCount = useMemo(() => {
    return notifications.filter((notif) => notif.status === 'unread').length
  }, [notifications])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-x-4 top-1/2 z-50 max-h-[85vh] -translate-y-1/2 rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-[#F7F9FC]">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">
              Thông báo
            </h3>
            {unreadCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-500 px-2 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
                aria-label="Đánh dấu tất cả đã đọc"
              >
                <FaCheckDouble className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                selectedType === 'all'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả {selectedType === 'all' && unreadCount > 0 && `(${unreadCount})`}
            </button>
            {notificationTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  selectedType === type
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {getNotificationTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {isLoading ? (
            <NotificationListSkeleton count={5} />
          ) : Object.keys(groupedNotifications).length === 0 ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-10 text-center mt-8">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <FaBell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700 sm:text-lg">
                Chưa có thông báo
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                Các thông báo mới sẽ hiển thị tại đây
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
                <div key={dateKey} className="space-y-3">
                  {/* Date Header */}
                  <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {dateKey}
                    </p>
                  </div>

                  {/* Notifications for this date */}
                  <div className="space-y-3">
                    {dateNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`group relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100/50 transition-all hover:shadow-md ${
                          notification.status === 'unread'
                            ? 'ring-2 ring-sky-200 bg-sky-50/30'
                            : ''
                        }`}
                      >
                        {/* Unread indicator */}
                        {notification.status === 'unread' && (
                          <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-sky-500" />
                        )}

                        <div className="flex gap-3">
                          {/* Icon */}
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getNotificationColor(
                              notification.type
                            )}`}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900">
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="mt-2 text-xs text-slate-400">
                                  {formatTime(notification.created_at)}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {notification.status === 'unread' && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="rounded-lg bg-sky-100 p-2 text-sky-600 transition hover:bg-sky-200"
                                    aria-label="Đánh dấu đã đọc"
                                  >
                                    <FaCheck className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDelete(notification.id)}
                                  className="rounded-lg bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200"
                                  aria-label="Xóa"
                                >
                                  <FaTrash className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

