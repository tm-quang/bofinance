import { useState, useEffect } from 'react'
import { FaBell, FaBellSlash, FaInfoCircle } from 'react-icons/fa'
import {
  requestNotificationPermission,
  hasNotificationPermission,
  sendReminderNotification,
} from '../../lib/notificationService'
import { useNotification } from '../../contexts/notificationContext.helpers'

type NotificationSettingsProps = {
  className?: string
}

export const NotificationSettings = ({ className = '' }: NotificationSettingsProps) => {
  const { success, error: showError } = useNotification()
  const [hasPermission, setHasPermission] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    const checkPermission = () => {
      setHasPermission(hasNotificationPermission())
    }
    
    checkPermission()
    // Check permission periodically in case user changes it in browser settings
    const interval = setInterval(checkPermission, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    try {
      const granted = await requestNotificationPermission()
      setHasPermission(granted)
      if (granted) {
        success('Đã bật thông báo thành công! Bạn sẽ nhận thông báo khi có nhắc nhở đến hạn.')
      } else {
        // Check if permission was denied
        if (Notification.permission === 'denied') {
          showError(
            'Quyền thông báo đã bị từ chối. Vui lòng bật lại trong cài đặt trình duyệt: Chrome/Edge: 🔒 > Cài đặt > Quyền > Thông báo'
          )
        } else {
          showError('Vui lòng cho phép thông báo để nhận nhắc nhở')
        }
      }
    } catch (error) {
      showError('Không thể yêu cầu quyền thông báo. Vui lòng kiểm tra cài đặt trình duyệt.')
    } finally {
      setIsRequesting(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      await sendReminderNotification('Thông báo test', 100000, 'Chi')
      success('Đã gửi thông báo test! Kiểm tra thông báo và âm thanh.')
    } catch (error) {
      showError('Không thể gửi thông báo test')
    }
  }

  if (hasPermission) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <FaBell className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Thông báo đã bật</span>
          </div>
          <button
            type="button"
            onClick={handleTestNotification}
            className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 active:scale-95"
          >
            Test
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={handleRequestPermission}
        disabled={isRequesting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
      >
        <FaBellSlash className="h-4 w-4" />
        <span>{isRequesting ? 'Đang yêu cầu...' : 'Bật thông báo để nhận nhắc nhở'}</span>
      </button>
      
      {Notification.permission === 'denied' && (
        <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
          <div className="flex items-start gap-2">
            <FaInfoCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Quyền thông báo đã bị từ chối</p>
              <p className="mt-1 text-rose-600">
                Vui lòng bật lại trong cài đặt trình duyệt:
              </p>
              <ul className="mt-1 ml-4 list-disc space-y-0.5 text-rose-600">
                <li>Chrome/Edge: Nhấp vào 🔒 {'>'} Cài đặt {'>'} Quyền {'>'} Thông báo</li>
                <li>Safari: Safari {'>'} Cài đặt {'>'} Trang web {'>'} Thông báo</li>
                <li>Firefox: 🔒 {'>'} Quyền {'>'} Thông báo</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

