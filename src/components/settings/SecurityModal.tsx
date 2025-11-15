import { useState, useEffect } from 'react'
import { FaTimes, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa'

import { changePassword } from '../../lib/profileService'
import { useNotification } from '../../contexts/notificationContext.helpers'

type SecurityModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const SecurityModal = ({ isOpen, onClose }: SecurityModalProps) => {
  const { success: showSuccess, error: showError } = useNotification()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      const message = 'Vui lòng điền đầy đủ thông tin'
      setError(message)
      showError(message)
      return
    }

    if (formData.newPassword.length < 6) {
      const message = 'Mật khẩu mới phải có ít nhất 6 ký tự'
      setError(message)
      showError(message)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      const message = 'Mật khẩu xác nhận không khớp'
      setError(message)
      showError(message)
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      const message = 'Mật khẩu mới phải khác mật khẩu hiện tại'
      setError(message)
      showError(message)
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword(formData.currentPassword, formData.newPassword)
      setSuccess(true)
      showSuccess('Đã đổi mật khẩu thành công!')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể đổi mật khẩu'
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Đổi mật khẩu</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Bảo mật tài khoản của bạn</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-600">
              Đổi mật khẩu thành công!
            </div>
          )}

          <form onSubmit={handleSubmit} id="security-form" className="space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                <FaLock className="mr-1.5 inline h-4 w-4" />
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  id="currentPassword"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.current ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  value={formData.newPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.new ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.confirm ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:py-3 sm:text-base"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="security-form"
              className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 sm:py-3 sm:text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

