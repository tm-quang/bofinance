import { useEffect, useRef, useState } from 'react'
import { FaCamera, FaTimes, FaEnvelope, FaPhone, FaUser } from 'react-icons/fa'

import { deleteAvatar, getCurrentProfile, updateProfile, uploadAvatar, type ProfileRecord } from '../../lib/profileService'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { AccountInfoSkeleton } from '../skeletons'
import { compressImageForAvatar, isFileSizeAcceptable } from '../../utils/imageCompression'

type AccountInfoModalProps = {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export const AccountInfoModal = ({ isOpen, onClose, onUpdate }: AccountInfoModalProps) => {
  const { success, error: showError } = useNotification()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAvatarProcessing, setIsAvatarProcessing] = useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
  })

  // Load profile data
  useEffect(() => {
    if (!isOpen) return

    const loadProfile = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          setUserEmail(user.email || '')
        }

        const profileData = await getCurrentProfile()
        if (profileData) {
          setProfile(profileData)
          setAvatarPreview(null)
          setPendingAvatarFile(null)
          setFormData({
            full_name: profileData.full_name || '',
            phone: profileData.phone || '',
            date_of_birth: profileData.date_of_birth || '',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [isOpen])

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh')
      return
    }

    // Check initial file size (before compression)
    const maxInitialSize = 10 * 1024 * 1024 // 10MB max before compression
    if (file.size > maxInitialSize) {
      setError('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB')
      return
    }

    setIsAvatarProcessing(true)
    setError(null)
    try {
      // Compress image to avatar size (200x200, max 250KB)
      const compressedFile = await compressImageForAvatar(file, 200, 200, 250, 0.8)
      
      // Verify compressed size
      if (!isFileSizeAcceptable(compressedFile, 250)) {
        setError('Không thể nén ảnh xuống dưới 250KB. Vui lòng chọn ảnh khác')
        return
      }

      setPendingAvatarFile(compressedFile)
      const newPreviewUrl = URL.createObjectURL(compressedFile)
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
      setAvatarPreview(newPreviewUrl)
      success('Ảnh đã sẵn sàng, nhấn "Lưu thay đổi" để cập nhật.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể upload avatar'
      setError(message)
      showError(message)
    } finally {
      setIsAvatarProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    setPendingAvatarFile(null)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await deleteAvatar()
      const updatedProfile = await getCurrentProfile()
      if (updatedProfile) {
        setProfile(updatedProfile)
        success('Đã xóa ảnh đại diện thành công!')
        onUpdate()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa avatar'
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (pendingAvatarFile) {
        setIsAvatarUploading(true)
        await uploadAvatar(pendingAvatarFile)
        setPendingAvatarFile(null)
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview)
          setAvatarPreview(null)
        }
      }

      await updateProfile({
        full_name: formData.full_name || undefined,
        phone: formData.phone || undefined,
        date_of_birth: formData.date_of_birth || undefined,
      })
      const updatedProfile = await getCurrentProfile()
      if (updatedProfile) {
        setProfile(updatedProfile)
        success('Đã cập nhật thông tin thành công!')
        onUpdate()
      }
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật thông tin'
      setError(message)
      showError(message)
    } finally {
      setIsAvatarUploading(false)
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-md bg-slate-950/50">
      <div className="flex w-full max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Thông tin tài khoản</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Cập nhật thông tin cá nhân của bạn</p>
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

          {isLoading ? (
            <AccountInfoSkeleton />
          ) : (
            <form onSubmit={handleSubmit} id="account-form" className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {avatarPreview || profile?.avatar_url ? (
                    <img
                      src={avatarPreview || profile?.avatar_url || ''}
                      alt="Avatar"
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100 sm:h-28 sm:w-28"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white ring-4 ring-slate-100 sm:h-28 sm:w-28">
                      <FaUser className="h-12 w-12 sm:h-14 sm:w-14" />
                    </div>
                  )}
                  {(isAvatarProcessing || isAvatarUploading) && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 text-xs font-semibold text-slate-700">
                      {isAvatarProcessing ? 'Đang xử lý ảnh...' : 'Đang tải ảnh lên...'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isAvatarProcessing || isAvatarUploading}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg transition hover:bg-sky-600 disabled:opacity-50 sm:h-10 sm:w-10"
                  >
                    <FaCamera className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {pendingAvatarFile && !isAvatarProcessing && !isAvatarUploading && (
                  <p className="text-xs text-slate-500">
                    Ảnh sẽ được cập nhật sau khi bạn nhấn "Lưu thay đổi".
                  </p>
                )}
                {profile?.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isSubmitting || isAvatarProcessing || isAvatarUploading}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                  >
                    Xóa ảnh đại diện
                  </button>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  <FaUser className="mr-1.5 inline h-4 w-4" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Nhập họ và tên"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  <FaEnvelope className="mr-1.5 inline h-4 w-4" />
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={userEmail}
                  disabled
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-500 sm:p-4"
                />
                <p className="mt-1 text-xs text-slate-400">Email không thể thay đổi</p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  <FaPhone className="mr-1.5 inline h-4 w-4" />
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Nhập số điện thoại"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="date_of_birth" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  id="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                />
              </div>
            </form>
          )}
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
              form="account-form"
              className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 sm:py-3 sm:text-base"
              disabled={isSubmitting || isLoading || isAvatarProcessing}
            >
              {isSubmitting ? (isAvatarUploading ? 'Đang tải ảnh...' : 'Đang lưu...') : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

