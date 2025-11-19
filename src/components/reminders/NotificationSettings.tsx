import { useState, useEffect, useRef } from 'react'
import { FaBell, FaBellSlash, FaInfoCircle, FaMusic, FaUpload, FaTrash } from 'react-icons/fa'
import {
  requestNotificationPermission,
  hasNotificationPermission,
} from '../../lib/notificationService'
import {
  getSoundPreference,
  saveSoundPreference,
  getDefaultSounds,
  playNotificationSound,
  fileToDataUrl,
  validateAudioFile,
  type SoundPreference,
} from '../../lib/notificationSoundService'
import { useNotification } from '../../contexts/notificationContext.helpers'

type NotificationSettingsProps = {
  className?: string
}

export const NotificationSettings = ({ className = '' }: NotificationSettingsProps) => {
  const { success, error: showError } = useNotification()
  const [hasPermission, setHasPermission] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [soundPreference, setSoundPreference] = useState<SoundPreference>({ type: 'default' })
  const [showSoundSettings, setShowSoundSettings] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkPermission = () => {
      setHasPermission(hasNotificationPermission())
    }

    checkPermission()
    // Check permission periodically in case user changes it in browser settings
    const interval = setInterval(checkPermission, 2000)

    // Load sound preference
    setSoundPreference(getSoundPreference())

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
    } catch {
      showError('Không thể yêu cầu quyền thông báo. Vui lòng kiểm tra cài đặt trình duyệt.')
    } finally {
      setIsRequesting(false)
    }
  }

  const handleTestSound = () => {
    playNotificationSound()
  }

  const handleSelectSyntheticSound = (soundId: string) => {
    const newPreference: SoundPreference = {
      type: 'synthetic',
      soundId,
    }
    setSoundPreference(newPreference)
    saveSoundPreference(newPreference)
    playNotificationSound()
    success('Đã đổi âm thanh thành công!')
  }

  const handleUploadSound = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateAudioFile(file)
    if (!validation.valid) {
      showError(validation.error || 'File không hợp lệ')
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      const newPreference: SoundPreference = {
        type: 'custom',
        customSoundData: dataUrl,
      }
      setSoundPreference(newPreference)
      saveSoundPreference(newPreference)
      playNotificationSound()
      success('Đã tải lên và áp dụng âm thanh mới!')
    } catch {
      showError('Không thể tải lên file âm thanh')
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveCustomSound = () => {
    const newPreference: SoundPreference = { type: 'custom', customSoundUrl: '/ring.mp3' }
    setSoundPreference(newPreference)
    saveSoundPreference(newPreference)
    playNotificationSound()
    success('Đã xóa âm thanh tùy chỉnh, quay về mặc định')
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
            onClick={() => setShowSoundSettings(!showSoundSettings)}
            className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 active:scale-95"
            title="Cài đặt âm thanh"
          >
            <FaMusic className="h-3 w-3" />
          </button>
        </div>

        {/* Sound Settings */}
        {showSoundSettings && (
          <div className="rounded-xl border-2 border-emerald-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Cài đặt âm thanh</h3>
              <button
                type="button"
                onClick={handleTestSound}
                className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 active:scale-95"
              >
                Phát thử
              </button>
            </div>

            {/* Default Sounds */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600">
                Âm thanh có sẵn
              </label>
              <div className="grid grid-cols-2 gap-2">
                {getDefaultSounds().map((sound) => {
                  const isSelected =
                    soundPreference.type === 'synthetic' && soundPreference.soundId === sound.id
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => handleSelectSyntheticSound(sound.id)}
                      className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition ${isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                    >
                      {sound.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Sound Upload */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600">
                Tải lên âm thanh tùy chỉnh
              </label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadSound}
                  className="hidden"
                  id="sound-upload"
                />
                <label
                  htmlFor="sound-upload"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <FaUpload className="h-4 w-4" />
                  Chọn file âm thanh (MP3, WAV, OGG)
                </label>
                {soundPreference.type === 'custom' && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="text-xs font-medium text-emerald-700">
                      Đã tải lên âm thanh tùy chỉnh
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCustomSound}
                      className="rounded p-1 text-emerald-700 transition hover:bg-emerald-100"
                      title="Xóa âm thanh tùy chỉnh"
                    >
                      <FaTrash className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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

