import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaEdit, FaTrash, FaImage, FaSearch, FaTimes, FaEye } from 'react-icons/fa'
import {
  fetchIcons,
  createIcon,
  updateIcon,
  deleteIcon,
  type IconRecord,
  type IconInsert,
} from '../lib/iconService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import { getCachedAdminStatus } from '../lib/adminService'
import HeaderBar from '../components/layout/HeaderBar'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import { LoadingRing } from '../components/ui/LoadingRing'

const ICON_GROUPS = [
  { id: 'life', label: 'Sinh hoạt' },
  { id: 'finance', label: 'Tài chính' },
  { id: 'lifestyle', label: 'Giải trí' },
  { id: 'others', label: 'Khác' },
]

export default function AdminIconImages() {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const { showConfirm } = useDialog()
  
  const [icons, setIcons] = useState<IconRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingIcon, setEditingIcon] = useState<IconRecord | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Admin check
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    icon_type: 'image' as 'image' | 'svg',
    group_id: 'life',
    group_label: 'Sinh hoạt',
    display_order: 0,
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingIcon, setViewingIcon] = useState<IconRecord | null>(null)
  
  // Bulk upload state
  const [isBulkUploadMode, setIsBulkUploadMode] = useState(false)
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([])
  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [bulkUploadProgress, setBulkUploadProgress] = useState<{
    current: number
    total: number
    fileName: string
  } | null>(null)
  const bulkFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAdminStatus()
    loadIcons()
  }, [])

  const checkAdminStatus = async () => {
    setIsCheckingAdmin(true)
    try {
      const adminStatus = await getCachedAdminStatus()
      setIsUserAdmin(adminStatus)
      if (!adminStatus) {
        showError('Bạn không có quyền truy cập trang này. Chỉ admin mới có thể quản lý icon images.')
        setTimeout(() => {
          navigate('/settings')
        }, 2000)
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
      setIsUserAdmin(false)
    } finally {
      setIsCheckingAdmin(false)
    }
  }

  const loadIcons = async () => {
    setIsLoading(true)
    try {
      // Invalidate cache first to ensure fresh data
      const { invalidateIconCache } = await import('../lib/iconService')
      await invalidateIconCache()
      
      // Chỉ lấy icons có type là 'image' hoặc 'svg'
      const allIcons = await fetchIcons({ is_active: true })
      const imageIcons = allIcons.filter(icon => 
        icon.icon_type === 'image' || icon.icon_type === 'svg'
      )
      setIcons(imageIcons)
    } catch (error) {
      console.error('Error loading icons:', error)
      showError('Không thể tải danh sách icons.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingIcon(null)
    setFormData({
      name: '',
      label: '',
      icon_type: 'image',
      group_id: 'life',
      group_label: 'Sinh hoạt',
      display_order: 0,
    })
    setSelectedImage(null)
    setImagePreview(null)
    setIsFormOpen(true)
  }

  const handleEdit = (icon: IconRecord) => {
    setEditingIcon(icon)
    setFormData({
      name: icon.name,
      label: icon.label,
      icon_type: icon.icon_type as 'image' | 'svg',
      group_id: icon.group_id,
      group_label: icon.group_label,
      display_order: icon.display_order,
    })
    setSelectedImage(null)
    setImagePreview(icon.image_url || null)
    setIsFormOpen(true)
  }

  const handleDelete = async (icon: IconRecord) => {
    const confirmed = await showConfirm(
      `Bạn có chắc muốn xóa icon "${icon.label}"?`
    )

    if (!confirmed) return

    try {
      await deleteIcon(icon.id)
      success('Đã xóa icon thành công!')
      loadIcons()
    } catch (error) {
      showError('Không thể xóa icon.')
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (formData.icon_type === 'svg' && !file.name.toLowerCase().endsWith('.svg')) {
        showError('Vui lòng chọn file SVG.')
        return
      }
      if (formData.icon_type === 'image' && !file.type.startsWith('image/')) {
        showError('Vui lòng chọn file hình ảnh (PNG, JPG, etc.).')
        return
      }

      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Tự động lấy tên file (không có extension) và điền vào trường "Tên icon (ID)" nếu đang trống
      if (!formData.name.trim()) {
        // Lấy tên file, loại bỏ extension
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        // Normalize: lowercase, thay khoảng trắng và ký tự đặc biệt bằng dấu gạch dưới
        const normalizedName = fileNameWithoutExt
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') // Loại bỏ dấu gạch dưới ở đầu và cuối
        
        // Tự động điền tên hiển thị từ tên file (giữ nguyên format gốc, chỉ loại bỏ extension)
        const displayName = fileNameWithoutExt
          .replace(/[-_]/g, ' ') // Thay dấu gạch bằng khoảng trắng
          .replace(/\b\w/g, (char) => char.toUpperCase()) // Viết hoa chữ cái đầu mỗi từ
        
        setFormData((prev) => ({
          ...prev,
          name: normalizedName || 'icon',
          label: displayName || normalizedName || 'Icon',
        }))
      }
    }
  }

  // Xử lý chọn nhiều file để upload hàng loạt
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file types
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    files.forEach((file) => {
      const isSvg = file.name.toLowerCase().endsWith('.svg')
      const isImage = file.type.startsWith('image/')
      
      if (isSvg || isImage) {
        validFiles.push(file)
      } else {
        invalidFiles.push(file.name)
      }
    })

    if (invalidFiles.length > 0) {
      showError(`Có ${invalidFiles.length} file không hợp lệ: ${invalidFiles.slice(0, 3).join(', ')}${invalidFiles.length > 3 ? '...' : ''}`)
    }

    if (validFiles.length > 0) {
      setBulkUploadFiles(validFiles)
      setIsBulkUploadMode(true)
    }
  }

  // Upload nhiều file
  const handleBulkUpload = async () => {
    if (bulkUploadFiles.length === 0) return

    setIsBulkUploading(true)
    setBulkUploadProgress({ current: 0, total: bulkUploadFiles.length, fileName: '' })

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    try {
      for (let i = 0; i < bulkUploadFiles.length; i++) {
        const file = bulkUploadFiles[i]
        setBulkUploadProgress({
          current: i + 1,
          total: bulkUploadFiles.length,
          fileName: file.name,
        })

        try {
          // Xác định icon_type dựa trên file extension
          const isSvg = file.name.toLowerCase().endsWith('.svg')
          const iconType: 'image' | 'svg' = isSvg ? 'svg' : 'image'

          // Lấy tên file, loại bỏ extension
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
          // Normalize: lowercase, thay khoảng trắng và ký tự đặc biệt bằng dấu gạch dưới
          const normalizedName = fileNameWithoutExt
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'icon'

          // Tự động điền tên hiển thị từ tên file
          const displayName = fileNameWithoutExt
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()) || normalizedName

          // Tạo icon data
          const iconData: IconInsert = {
            name: normalizedName,
            label: displayName,
            icon_type: iconType,
            group_id: formData.group_id,
            group_label: formData.group_label,
            display_order: formData.display_order + i, // Tăng display_order cho mỗi file
          }

          // Upload và tạo icon
          await createIcon(iconData, file)
          successCount++
        } catch (error) {
          errorCount++
          const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định'
          errors.push(`${file.name}: ${errorMessage}`)
          console.error(`Error uploading ${file.name}:`, error)
        }
      }

      // Hiển thị kết quả
      if (successCount > 0) {
        success(`Đã tải thành công ${successCount}/${bulkUploadFiles.length} icon!`)
      }
      if (errorCount > 0) {
        showError(`Có ${errorCount} icon không thể tải. ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`)
      }

      // Reload danh sách
      await loadIcons()

      // Reset
      setBulkUploadFiles([])
      setIsBulkUploadMode(false)
      setBulkUploadProgress(null)
      if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = ''
      }
    } catch (error) {
      showError('Có lỗi xảy ra khi upload nhiều file.')
    } finally {
      setIsBulkUploading(false)
      setBulkUploadProgress(null)
    }
  }

  const handleGroupChange = (groupId: string) => {
    const group = ICON_GROUPS.find((g) => g.id === groupId)
    setFormData((prev) => ({
      ...prev,
      group_id: groupId,
      group_label: group?.label || '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate
      if (!formData.name.trim()) {
        showError('Vui lòng nhập tên icon.')
        setIsSubmitting(false)
        return
      }
      if (!formData.label.trim()) {
        showError('Vui lòng nhập tên hiển thị.')
        setIsSubmitting(false)
        return
      }
      if (formData.icon_type === 'image' && !selectedImage && !imagePreview && !editingIcon) {
        showError('Vui lòng chọn ảnh.')
        setIsSubmitting(false)
        return
      }
      if (formData.icon_type === 'svg' && !selectedImage && !imagePreview && !editingIcon) {
        showError('Vui lòng chọn file SVG.')
        setIsSubmitting(false)
        return
      }

      const iconData: IconInsert = {
        name: formData.name.trim(),
        label: formData.label.trim(),
        icon_type: formData.icon_type,
        group_id: formData.group_id,
        group_label: formData.group_label,
        display_order: formData.display_order,
      }

      if (editingIcon) {
        await updateIcon(editingIcon.id, iconData, selectedImage || undefined)
        success('Đã cập nhật icon thành công!')
      } else {
        await createIcon(iconData, selectedImage || undefined)
        success('Đã tạo icon thành công!')
      }

      setIsFormOpen(false)
      setEditingIcon(null)
      setSelectedImage(null)
      setImagePreview(null)
      
      // Reload icons after a short delay to ensure cache is cleared
      setTimeout(() => {
        loadIcons()
      }, 100)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Không thể lưu icon.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getIconPreview = (icon: IconRecord): React.ReactNode => {
    if (icon.image_url) {
      if (icon.icon_type === 'svg') {
        return (
          <div className="h-12 w-12 flex items-center justify-center">
            <img 
              src={icon.image_url} 
              alt={icon.label} 
              className="h-full w-full object-contain" 
            />
          </div>
        )
      }
      return (
        <img 
          src={icon.image_url} 
          alt={icon.label} 
          className="h-12 w-12 object-contain rounded-lg" 
        />
      )
    }
    return <span className="text-2xl">🖼️</span>
  }

  const filteredIcons = icons.filter((icon) => {
    if (selectedGroup !== 'all' && icon.group_id !== selectedGroup) return false
    if (searchTerm && !icon.label.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !icon.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  if (isCheckingAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F9FC]">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-600 border-r-transparent"></div>
          <p className="text-slate-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    )
  }

  if (!isUserAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F9FC]">
        <div className="text-center px-4">
          <p className="text-lg font-semibold text-slate-900 mb-2">Không có quyền truy cập</p>
          <p className="text-slate-600 mb-4">Chỉ admin mới có thể truy cập trang này.</p>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-xl bg-sky-600 px-6 py-3 text-white font-semibold hover:bg-sky-700 transition-colors"
          >
            Quay lại Cài đặt
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar 
        variant="page" 
        title="Quản lý Icon Images" 
        onBack={() => navigate('/settings')}
      />
      
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pt-2 pb-4 sm:pt-2 sm:pb-4">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Icon Images</h1>
              <p className="text-sm text-slate-500 mt-1">Quản lý thư viện icon PNG/SVG</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkFileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-white text-sm font-semibold shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                <FaImage className="h-4 w-4" />
                <span className="hidden sm:inline">Tải nhiều file</span>
                <span className="sm:hidden">Nhiều</span>
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-white text-sm font-semibold shadow-lg hover:from-sky-600 hover:to-blue-700 transition-all"
              >
                <FaPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Thêm icon</span>
                <span className="sm:hidden">Thêm</span>
              </button>
            </div>
          </div>

          {isFormOpen ? (
            /* Form */
            <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingIcon ? 'Sửa icon' : 'Thêm icon mới'}
                </h2>
                <button
                  onClick={() => {
                    setIsFormOpen(false)
                    setEditingIcon(null)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>

              <form id="icon-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Tên icon (ID) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="food, transport, etc."
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm focus:border-sky-500 focus:outline-none"
                      required
                      disabled={!!editingIcon}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Tên hiển thị <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="Ăn uống, Đi lại, etc."
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm focus:border-sky-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Loại icon <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icon_type: 'image' }))}
                      className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                        formData.icon_type === 'image'
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      PNG/JPG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icon_type: 'svg' }))}
                      className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                        formData.icon_type === 'svg'
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      SVG
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {formData.icon_type === 'svg' ? 'Upload file SVG' : 'Upload ảnh'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={formData.icon_type === 'svg' ? '.svg' : 'image/png,image/jpeg,image/jpg,image/webp'}
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 transition-all"
                    >
                      <FaImage className="h-5 w-5" />
                      Chọn file
                    </button>
                    {imagePreview && (
                      <div className="flex items-center gap-3">
                        {formData.icon_type === 'svg' ? (
                          <div className="h-16 w-16 rounded-lg border-2 border-slate-200 flex items-center justify-center bg-slate-50">
                            <img src={imagePreview} alt="Preview" className="h-12 w-12 object-contain" />
                          </div>
                        ) : (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-16 w-16 rounded-lg object-cover border-2 border-slate-200"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null)
                            setImagePreview(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                  {!imagePreview && editingIcon && (
                    <p className="mt-2 text-xs text-slate-500">
                      Đang sử dụng ảnh hiện tại. Chọn file mới để thay thế.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Nhóm <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.group_id}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm focus:border-sky-500 focus:outline-none"
                      required
                    >
                      {ICON_GROUPS.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))
                      }
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <ModalFooterButtons
                  onCancel={() => {
                    setIsFormOpen(false)
                    setEditingIcon(null)
                  }}
                  onConfirm={() => {}}
                  confirmText={isSubmitting ? 'Đang lưu...' : editingIcon ? 'Cập nhật' : 'Tạo icon'}
                  isSubmitting={isSubmitting}
                  disabled={isSubmitting}
                  confirmButtonType="submit"
                  formId="icon-form"
                />
              </form>
            </div>
          ) : (
            /* Icons List */
            <>
              {/* Filters */}
              <div className="space-y-3 sm:flex sm:items-center sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm icon..."
                      className="w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full sm:w-auto rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                >
                  <option value="all">Tất cả nhóm</option>
                  {ICON_GROUPS.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Icons List */}
              {isLoading ? (
                <div className="text-center py-12 flex items-center justify-center">
                  <LoadingRing size="md" />
                </div>
              ) : filteredIcons.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  {searchTerm || selectedGroup !== 'all' 
                    ? 'Không tìm thấy icon nào' 
                    : 'Chưa có icon nào. Hãy thêm icon mới!'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIcons.map((icon) => (
                    <div
                      key={icon.id}
                      className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                          {getIconPreview(icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">{icon.label}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{icon.name}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                  {icon.icon_type === 'image' ? 'PNG/JPG' : 'SVG'}
                                </span>
                                <span className="text-xs text-slate-500">•</span>
                                <span className="text-xs text-slate-600">{icon.group_label}</span>
                                <span className="text-xs text-slate-500">•</span>
                                <span className="text-xs text-slate-600">Thứ tự: {icon.display_order}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => setViewingIcon(icon)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                aria-label="Xem"
                                title="Xem icon"
                              >
                                <FaEye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(icon)}
                                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                aria-label="Sửa"
                                title="Sửa icon"
                              >
                                <FaEdit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(icon)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Xóa"
                                title="Xóa icon"
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
              )}
            </>
          )}
        </div>
      </main>

      {/* Bulk Upload Input */}
      <input
        ref={bulkFileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp,.svg"
        onChange={handleBulkFileSelect}
        className="hidden"
      />

      {/* Bulk Upload Modal */}
      {isBulkUploadMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 sm:px-6 py-4 sm:py-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Tải nhiều icon</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  {bulkUploadFiles.length} file đã chọn
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBulkUploadMode(false)
                  setBulkUploadFiles([])
                  if (bulkFileInputRef.current) bulkFileInputRef.current.value = ''
                }}
                disabled={isBulkUploading}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 shrink-0 disabled:opacity-50"
              >
                <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Progress */}
              {isBulkUploading && bulkUploadProgress && (
                <div className="mb-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Đang tải {bulkUploadProgress.current}/{bulkUploadProgress.total}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {Math.round((bulkUploadProgress.current / bulkUploadProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {bulkUploadProgress.fileName}
                  </p>
                </div>
              )}

              {/* File List */}
              {!isBulkUploading && (
                <>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Nhóm <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.group_id}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm focus:border-sky-500 focus:outline-none"
                    >
                      {ICON_GROUPS.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {bulkUploadFiles.map((file, index) => {
                      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
                      const normalizedName = fileNameWithoutExt
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .replace(/^_+|_+$/g, '') || 'icon'
                      const displayName = fileNameWithoutExt
                        .replace(/[-_]/g, ' ')
                        .replace(/\b\w/g, (char) => char.toUpperCase()) || normalizedName
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-white border-2 border-slate-200 flex items-center justify-center">
                            {file.name.toLowerCase().endsWith('.svg') ? (
                              <span className="text-xs text-slate-400">SVG</span>
                            ) : (
                              <span className="text-xs text-slate-400">IMG</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{file.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">ID: {normalizedName}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!isBulkUploading && (
              <div className="flex gap-2 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4">
                <button
                  onClick={() => {
                    setIsBulkUploadMode(false)
                    setBulkUploadFiles([])
                    if (bulkFileInputRef.current) bulkFileInputRef.current.value = ''
                  }}
                  className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={bulkUploadFiles.length === 0}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tải lên ({bulkUploadFiles.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Icon Modal */}
      {viewingIcon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 sm:px-6 py-4 sm:py-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{viewingIcon.label}</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 truncate">{viewingIcon.name}</p>
              </div>
              <button
                onClick={() => setViewingIcon(null)}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 shrink-0"
              >
                <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex flex-col items-center gap-4">
                {/* Icon Preview */}
                <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-slate-50 border-2 border-slate-200">
                  {viewingIcon.image_url ? (
                    viewingIcon.icon_type === 'svg' ? (
                      <img 
                        src={viewingIcon.image_url} 
                        alt={viewingIcon.label} 
                        className="h-full w-full object-contain p-4" 
                      />
                    ) : (
                      <img 
                        src={viewingIcon.image_url} 
                        alt={viewingIcon.label} 
                        className="h-full w-full object-contain rounded-xl" 
                      />
                    )
                  ) : (
                    <span className="text-6xl">🖼️</span>
                  )}
                </div>

                {/* Icon Info */}
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Loại:</span>
                    <span className="text-sm text-slate-900">
                      {viewingIcon.icon_type === 'image' ? 'PNG/JPG' : 'SVG'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Nhóm:</span>
                    <span className="text-sm text-slate-900">{viewingIcon.group_label}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Thứ tự:</span>
                    <span className="text-sm text-slate-900">{viewingIcon.display_order}</span>
                  </div>
                  {viewingIcon.image_url && (
                    <div className="pt-2">
                      <span className="text-sm font-medium text-slate-600 block mb-2">URL:</span>
                      <a
                        href={viewingIcon.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-600 hover:text-sky-700 break-all underline"
                      >
                        {viewingIcon.image_url}
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full pt-4">
                  <button
                    onClick={() => {
                      setViewingIcon(null)
                      handleEdit(viewingIcon)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
                  >
                    <FaEdit className="h-4 w-4" />
                    Sửa icon
                  </button>
                  <button
                    onClick={() => {
                      setViewingIcon(null)
                      handleDelete(viewingIcon)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    <FaTrash className="h-4 w-4" />
                    Xóa icon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

