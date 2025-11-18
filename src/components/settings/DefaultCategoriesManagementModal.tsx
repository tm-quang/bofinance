import React, { useEffect, useState } from 'react'
import { FaTimes, FaPlus, FaEdit, FaTrash, FaSearch, FaFolder } from 'react-icons/fa'
import {
  fetchDefaultCategoriesHierarchical,
  createDefaultCategory,
  updateDefaultCategory,
  deleteDefaultCategory,
  type DefaultCategoryWithChildren,
  type DefaultCategoryType,
} from '../../lib/defaultCategoryService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { useDialog } from '../../contexts/dialogContext.helpers'
import { IconPicker } from '../categories/IconPicker'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { CategoryIcon } from '../ui/CategoryIcon'
import { seedDefaultCategoriesToDatabase, hasDefaultCategories } from '../../lib/defaultCategoriesSeeder'
import { ModalFooterButtons } from '../ui/ModalFooterButtons'
import { LoadingRing } from '../ui/LoadingRing'

type DefaultCategoriesManagementModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const DefaultCategoriesManagementModal = ({ isOpen, onClose }: DefaultCategoriesManagementModalProps) => {
  const { success, error: showError } = useNotification()
  const { showConfirm } = useDialog()
  const [categories, setCategories] = useState<DefaultCategoryWithChildren[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DefaultCategoryWithChildren | null>(null)
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Chi tiêu' as DefaultCategoryType,
    icon_id: 'other',
    parent_id: null as string | null,
    display_order: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      // Kiểm tra xem database đã có data chưa
      const hasData = await hasDefaultCategories()
      
      // Nếu chưa có data, tự động seed từ hardcode
      if (!hasData) {
        try {
          await seedDefaultCategoriesToDatabase(false)
          success('Đã tự động tạo danh sách hạng mục mặc định từ template!')
        } catch (seedError) {
          // Nếu seed lỗi (có thể do đã có data), tiếp tục load
          console.warn('Seed default categories:', seedError)
        }
      }

      const data = await fetchDefaultCategoriesHierarchical()
      setCategories(data)
      // Mở rộng tất cả parent categories mặc định
      const defaultParents = data.filter(cat => !cat.parent_id)
      setExpandedParents(new Set(defaultParents.map(cat => cat.id)))
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Không thể tải hạng mục mặc định')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateForm = (parentId?: string | null) => {
    setEditingCategory(null)
    setFormData({
      name: '',
      type: activeTab === 'expense' ? 'Chi tiêu' : 'Thu nhập',
      icon_id: 'other',
      parent_id: parentId ?? null,
      display_order: 0,
    })
    setIsFormOpen(true)
  }

  const openEditForm = (category: DefaultCategoryWithChildren) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      type: category.type,
      icon_id: category.icon_id,
      parent_id: category.parent_id ?? null,
      display_order: category.display_order,
    })
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingCategory) {
        await updateDefaultCategory(editingCategory.id, formData)
        success('Đã cập nhật hạng mục mặc định thành công!')
      } else {
        await createDefaultCategory(formData)
        success('Đã tạo hạng mục mặc định mới thành công!')
      }
      await loadCategories()
      closeForm()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Đã xảy ra lỗi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const target = categories.find(cat => cat.id === id) || 
                   categories.flatMap(cat => cat.children || []).find(cat => cat.id === id)
    
    if (!target) return

    await showConfirm(
      `Bạn có chắc muốn xoá hạng mục mặc định "${target.name}"?`,
      async () => {
        try {
          await deleteDefaultCategory(id)
          success('Đã xóa hạng mục mặc định thành công!')
          await loadCategories()
        } catch (error) {
          showError(error instanceof Error ? error.message : 'Không thể xóa hạng mục mặc định')
        }
      }
    )
  }

  const toggleParentExpanded = (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) {
        next.delete(parentId)
      } else {
        next.add(parentId)
      }
      return next
    })
  }

  // Filter categories
  const currentCategories = categories.filter(cat => 
    cat.type === (activeTab === 'expense' ? 'Chi tiêu' : 'Thu nhập')
  )

  const filteredCategories = currentCategories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.children || []).some(child => child.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  // Get parent categories for form
  const parentCategoriesForForm = currentCategories.filter(cat => !cat.parent_id)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Quản lý Hạng mục Mặc định</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 px-6 py-3">
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'expense'
                  ? 'bg-rose-100 text-rose-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Chi tiêu
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'income'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Thu nhập
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-slate-200">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm hạng mục..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-center py-12 flex items-center justify-center">
                <LoadingRing size="md" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <div className="mb-3 rounded-full bg-slate-100 p-3">
                  <FaFolder className="h-6 w-6 text-slate-400" />
                </div>
                <span className="text-sm">Chưa có hạng mục {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCategories.map((parent) => {
                  const isExpanded = expandedParents.has(parent.id)
                  const hasChildren = (parent.children || []).length > 0
                  
                  return (
                    <div key={parent.id} className="border border-slate-200 rounded-lg">
                      {/* Parent Category */}
                      <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                        {hasChildren && (
                          <button
                            onClick={() => toggleParentExpanded(parent.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              ▶
                            </span>
                          </button>
                        )}
                        {!hasChildren && <div className="w-4" />}
                        
                        <CategoryIcon iconId={parent.icon_id} className="h-8 w-8" />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{parent.name}</div>
                          <div className="text-xs text-slate-500">Thứ tự: {parent.display_order}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditForm(parent)}
                            className="rounded-lg p-2 text-sky-500 hover:bg-sky-50"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(parent.id)}
                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                          >
                            <FaTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      {hasChildren && isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-200">
                          {parent.children?.map((child) => (
                            <div key={child.id} className="flex items-center gap-3 p-3 pl-12 hover:bg-slate-100">
                              <CategoryIcon iconId={child.icon_id} className="h-6 w-6" />
                              <div className="flex-1">
                                <div className="font-medium text-slate-900">{child.name}</div>
                                <div className="text-xs text-slate-500">Thứ tự: {child.display_order}</div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditForm(child)}
                                  className="rounded-lg p-2 text-sky-500 hover:bg-sky-50"
                                >
                                  <FaEdit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(child.id)}
                                  className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                                >
                                  <FaTrash className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await showConfirm(
                  'Bạn có chắc muốn khởi tạo lại danh sách hạng mục mặc định từ template? Điều này sẽ xóa tất cả các thay đổi hiện tại.',
                  async () => {
                    try {
                      setIsLoading(true)
                      await seedDefaultCategoriesToDatabase(true) // force = true để ghi đè
                      success('Đã khởi tạo lại danh sách hạng mục mặc định!')
                      await loadCategories()
                    } catch (error) {
                      showError(error instanceof Error ? error.message : 'Không thể khởi tạo lại')
                    } finally {
                      setIsLoading(false)
                    }
                  }
                )
              }}
              className="px-4 py-2 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 text-sm"
            >
              Khởi tạo lại từ template
            </button>
            <button
              onClick={() => openCreateForm()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700"
            >
              <FaPlus className="inline mr-2" />
              Thêm hạng mục
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCategory ? 'Cập nhật' : 'Thêm'} hạng mục mặc định
              </h3>
              <button
                onClick={closeForm}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <form id="default-category-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tên hạng mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Loại <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Chi tiêu' })}
                    className={`px-4 py-2 rounded-lg border-2 font-semibold transition ${
                      formData.type === 'Chi tiêu'
                        ? 'border-rose-500 bg-rose-50 text-rose-600'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Thu nhập' })}
                    className={`px-4 py-2 rounded-lg border-2 font-semibold transition ${
                      formData.type === 'Thu nhập'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Thu nhập
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Hạng mục cha (tùy chọn)
                </label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-sky-500 focus:outline-none"
                >
                  <option value="">Không có (Hạng mục cha)</option>
                  {parentCategoriesForForm
                    .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                    .map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Biểu tượng <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsIconPickerOpen(true)}
                  className="w-full flex items-center gap-3 rounded-lg border-2 border-slate-200 px-4 py-3 hover:border-sky-400"
                >
                  <CategoryIcon iconId={formData.icon_id} className="h-8 w-8" />
                  <span className="flex-1 text-left text-sm">
                    {CATEGORY_ICON_MAP[formData.icon_id]?.label || 'Chọn biểu tượng'}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Thứ tự hiển thị
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-4">
                <ModalFooterButtons
                  onCancel={closeForm}
                  onConfirm={() => {}}
                  confirmText={isSubmitting ? 'Đang lưu...' : editingCategory ? 'Cập nhật' : 'Tạo mới'}
                  isSubmitting={isSubmitting}
                  disabled={isSubmitting}
                  confirmButtonType="submit"
                  formId="default-category-form"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Icon Picker */}
      <IconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(iconId) => {
          setFormData({ ...formData, icon_id: iconId })
          setIsIconPickerOpen(false)
        }}
        selectedIconId={formData.icon_id}
      />
    </div>
  )
}

