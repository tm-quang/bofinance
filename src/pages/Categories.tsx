import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    FaPlus,
    FaSearch,
    FaArrowLeft,
    FaFolder,
} from 'react-icons/fa'

import HeaderBar from '../components/layout/HeaderBar'
import { CategoryCardSkeleton } from '../components/skeletons'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import {
    CATEGORY_ICON_GROUPS,
    CATEGORY_ICON_MAP,
} from '../constants/categoryIcons'
import { getIconNode } from '../utils/iconLoader'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { fetchIcons, type IconRecord } from '../lib/iconService'
import { IconPicker } from '../components/categories/IconPicker'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import {
    createCategory,
    deleteCategory as deleteCategoryFromDb,
    fetchCategories,
    fetchCategoriesHierarchical,
    updateCategory,
    initializeDefaultCategories,
    type CategoryRecord,
    type CategoryType,
    type CategoryWithChildren,
} from '../lib/categoryService'

type Category = {
    id: string
    name: string
    type: CategoryType
    iconId: string
    parentId?: string | null
    isDefault?: boolean
    children?: Category[]
}

type CategoryFormState = {
    name: string
    type: CategoryType
    iconId: string
    parentId?: string | null
}

const mapRecordToCategory = (record: CategoryRecord, children?: CategoryRecord[]): Category => ({
    id: record.id,
    name: record.name,
    type: record.type,
    iconId: record.icon_id,
    parentId: record.parent_id,
    isDefault: record.is_default,
    children: Array.isArray(children) ? children.map(c => mapRecordToCategory(c)) : undefined,
})

const sortCategories = (items: Category[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }))

export const CategoriesPage = () => {
    // const navigate = useNavigate()
    const { success, error: showError } = useNotification()
    const { showDialog } = useDialog()
    const [categories, setCategories] = useState<Category[]>([])
    const [hierarchicalCategories, setHierarchicalCategories] = useState<CategoryWithChildren[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
    const [formState, setFormState] = useState<CategoryFormState>({
        name: '',
        type: 'Chi tiêu',
        iconId: CATEGORY_ICON_GROUPS[0]?.icons[0]?.id ?? 'other',
        parentId: null,
    })
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [dbIcons, setDbIcons] = useState<IconRecord[]>([])

    const [searchParams, setSearchParams] = useSearchParams()

    // Lấy hạng mục phân cấp theo tab hiện tại
    const currentHierarchicalCategories = useMemo(() => {
        return hierarchicalCategories.filter(cat => 
            cat.type === (activeTab === 'expense' ? 'Chi tiêu' : 'Thu nhập')
        )
    }, [hierarchicalCategories, activeTab])

    // Filter categories by search term
    const filteredHierarchicalCategories = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        if (!normalizedSearch) {
            return currentHierarchicalCategories
        }
        
        return currentHierarchicalCategories
            .map(parent => {
                // Check if parent matches
                const parentMatches = parent.name.toLowerCase().includes(normalizedSearch)
                
                // Filter children
                const childrenArray = Array.isArray(parent.children) ? parent.children : []
                const filteredChildren = childrenArray.filter(child => 
                    child.name.toLowerCase().includes(normalizedSearch)
                )
                
                // If parent matches or has matching children, include it
                if (parentMatches || filteredChildren.length > 0) {
                    const result: CategoryWithChildren = {
                        ...parent,
                        children: parentMatches ? childrenArray : filteredChildren
                    }
                    return result
                }
                return null
            })
            .filter((cat): cat is CategoryWithChildren => cat !== null && cat !== undefined)
    }, [currentHierarchicalCategories, searchTerm])


    // Lấy tất cả hạng mục cha để chọn làm parent
    const parentCategoriesForForm = useMemo(() => {
        const allParents = categories.filter(cat => !cat.parentId && cat.type === formState.type)
        return allParents.filter(cat => !editingId || cat.id !== editingId) // Loại bỏ chính nó khi edit
    }, [categories, formState.type, editingId])

    const openCreateForm = useCallback((parentId?: string | null) => {
        setEditingId(null)
        // Tự động set type dựa trên tab hiện tại
        const categoryType: CategoryType = activeTab === 'expense' ? 'Chi tiêu' : 'Thu nhập'
        setFormState({
            name: '',
            type: categoryType,
            iconId: CATEGORY_ICON_GROUPS[0]?.icons[0]?.id ?? 'other',
            parentId: parentId ?? null,
        })
        setFormError(null)
        setIsFormOpen(true)
    }, [activeTab])

    // Lock body scroll when form modal is open
    useEffect(() => {
        if (isFormOpen || isIconPickerOpen) {
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = ''
            }
        }
    }, [isFormOpen, isIconPickerOpen])

    useEffect(() => {
        if (searchParams.get('mode') === 'create') {
            startTransition(() => {
                openCreateForm()
                const next = new URLSearchParams(searchParams)
                next.delete('mode')
                setSearchParams(next, { replace: true })
            })
        }
    }, [openCreateForm, searchParams, setSearchParams])

    useEffect(() => {
        const loadCategories = async () => {
            setIsLoading(true)
            try {
                // Load categories từ cache/database (cache sẽ được dùng tự động)
                // cacheFirstWithRefresh sẽ trả về cache ngay nếu có, fetch trong background nếu stale
                const [flatData, hierarchicalData] = await Promise.all([
                    fetchCategories(),
                    fetchCategoriesHierarchical(),
                ])
                
                // Chỉ sync default categories nếu user CHƯA CÓ categories nào cả (lần đầu tiên)
                // Không sync lại nếu user đã có categories (kể cả khi xóa một số)
                if (flatData.length === 0) {
                    // User chưa có categories nào, sync từ default
                initializeDefaultCategories().catch((initError) => {
                    // Không báo lỗi nếu đã có hạng mục mặc định
                    console.log('Default categories check:', initError)
                })

                    // Reload lại sau khi sync
                    const [reloadedFlat, reloadedHierarchical] = await Promise.all([
                    fetchCategories(),
                    fetchCategoriesHierarchical(),
                ])
                
                    setCategories(sortCategories(reloadedFlat.map(record => mapRecordToCategory(record))))
                    setHierarchicalCategories(reloadedHierarchical.map(cat => ({
                        ...cat,
                        children: Array.isArray(cat.children) ? cat.children : [],
                    })))
                } else {
                    // User đã có categories, không sync lại
                setCategories(sortCategories(flatData.map(record => mapRecordToCategory(record))))
                setHierarchicalCategories(hierarchicalData.map(cat => ({
                    ...cat,
                    children: Array.isArray(cat.children) ? cat.children : [],
                })))
                }
                
                // Mặc định tất cả categories đều thu gọn
                setExpandedParents(new Set())
                
                setLoadError(null)
            } catch (error) {
                console.error('Không thể tải hạng mục:', error)
                setLoadError(
                    error instanceof Error
                        ? `Không thể tải hạng mục: ${error.message}`
                        : 'Không thể tải hạng mục. Vui lòng thử lại sau.'
                )
            } finally {
                setIsLoading(false)
            }
        }

        const loadIcons = async () => {
            try {
                // Chỉ load icons từ database để check icon exists trong form validation
                // Nếu fail, sẽ fallback về hardcoded icons (không ảnh hưởng đến app)
                const icons = await fetchIcons({ is_active: true })
                setDbIcons(icons)
            } catch (error) {
                // Silently fail - app sẽ dùng hardcoded icons từ CATEGORY_ICON_MAP
                // Không cần log vì fetchIcons đã handle error và return empty array
                setDbIcons([])
            }
        }

        void loadCategories()
        void loadIcons()
    }, [])

    const openEditForm = (category: Category) => {
        setEditingId(category.id)
        setFormState({
            name: category.name,
            type: category.type,
            iconId: category.iconId,
            parentId: category.parentId ?? null,
        })
        setFormError(null)
        setIsFormOpen(true)
    }

    const toggleParentExpanded = (parentId: string) => {
        setExpandedParents(prev => {
            const next = new Set(prev)
            if (next.has(parentId)) {
                // Đóng category hiện tại
                next.delete(parentId)
            } else {
                // Mở category mới, tự động đóng category khác (chỉ mở 1 category tại một thời điểm)
                next.clear()
                next.add(parentId)
            }
            return next
        })
    }

    // Đóng tất cả categories khi click ra ngoài
    const handleClickOutside = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        // Nếu click vào category item hoặc button, không đóng
        if (target.closest('[data-category-item]') || target.closest('button')) {
            return
        }
        setExpandedParents(new Set())
    }

    const closeForm = () => {
        setIsFormOpen(false)
        setFormError(null)
    }

    const handleIconSelect = (iconId: string) => {
        setFormState((prev) => ({ ...prev, iconId }))
    }

    // Get icons used in current category type for prioritization
    const usedIconIds = useMemo(() => {
        return new Set(
            categories
                .filter(cat => cat.type === formState.type)
                .map(cat => cat.iconId)
        )
    }, [categories, formState.type])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const trimmedName = formState.name.trim()

        if (!trimmedName) {
            setFormError('Vui lòng nhập tên hạng mục.')
            return
        }

        // Check if icon exists in hardcoded map or database
        // Nếu không có trong cả hai, vẫn cho phép submit (sẽ fallback về chữ cái đầu khi hiển thị)
        // Nhưng cảnh báo user nếu icon không hợp lệ
        const iconExists = !!CATEGORY_ICON_MAP[formState.iconId] || dbIcons.some(icon => icon.name === formState.iconId)
        if (!iconExists) {
            // Cảnh báo nhưng không block - icon sẽ fallback về chữ cái đầu khi hiển thị
            console.warn(`Icon "${formState.iconId}" not found in hardcoded map or database. Will use fallback display.`)
            // Vẫn cho phép submit - app sẽ tự động fallback
        }

        setFormError(null)
        setIsSubmitting(true)

        try {
            if (editingId) {
                const updated = await updateCategory(editingId, {
                    name: trimmedName,
                    type: formState.type,
                    icon_id: formState.iconId,
                    parent_id: formState.parentId,
                })
                setCategories((prev) =>
                    sortCategories(
                        prev.map((category) =>
                            category.id === editingId ? mapRecordToCategory(updated) : category
                        )
                    )
                )
                success('Đã cập nhật hạng mục thành công!')
            } else {
                const created = await createCategory({
                    name: trimmedName,
                    type: formState.type,
                    icon_id: formState.iconId,
                    parent_id: formState.parentId,
                })
                setCategories((prev) => sortCategories([...prev, mapRecordToCategory(created)]))
                success('Đã tạo hạng mục mới thành công!')
            }

            // Reload categories để cập nhật
            const [reloaded, reloadedHierarchical] = await Promise.all([
                fetchCategories(),
                fetchCategoriesHierarchical(),
            ])
            setCategories(sortCategories(reloaded.map(record => mapRecordToCategory(record))))
            setHierarchicalCategories(reloadedHierarchical.map(cat => ({
                ...cat,
                children: Array.isArray(cat.children) ? cat.children : [],
            })))
            closeForm()
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Đã xảy ra lỗi khi lưu hạng mục. Vui lòng thử lại sau.'
            setFormError(message)
            showError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
            <HeaderBar variant="page" title="Hạng mục - Thu - Chi" />
            <main className="flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
                    {/* Tab Navigation */}
                    <div className="flex gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100/50 sm:gap-2.5 sm:p-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('expense')}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:px-5 sm:py-3 ${
                                activeTab === 'expense'
                                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/30'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Khoản chi
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('income')}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:px-5 sm:py-3 ${
                                activeTab === 'income'
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Khoản thu
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm theo tên hạng mục"
                            className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 sm:h-11"
                        />
                    </div>

                    {/* Category List */}
                    <section 
                        className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100/50 overflow-hidden"
                        onClick={handleClickOutside}
                    >
                        {loadError && (
                            <div className="m-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
                                {loadError}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="p-3">
                            <CategoryCardSkeleton count={6} />
                            </div>
                        ) : filteredHierarchicalCategories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                                <div className="mb-4 rounded-full bg-slate-100 p-4">
                                    <FaFolder className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-base font-semibold text-slate-700 sm:text-lg">
                                    Chưa có hạng mục {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}
                                </p>
                                <p className="mt-1.5 text-sm text-slate-500">
                                    Hãy tạo hạng mục mới để bắt đầu quản lý
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredHierarchicalCategories.map((parentCategory) => {
                                    const isExpanded = expandedParents.has(parentCategory.id)
                                    const childrenArray = Array.isArray(parentCategory.children) ? parentCategory.children : []
                                    const hasChildren = childrenArray.length > 0
                                    
                                    return (
                                        <div key={parentCategory.id}>
                                            {/* Parent Category - List Item */}
                                            <CategoryListItem
                                                category={{
                                                    id: parentCategory.id,
                                                    name: parentCategory.name,
                                                    type: parentCategory.type,
                                                    iconId: parentCategory.icon_id,
                                                    parentId: parentCategory.parent_id,
                                                    isDefault: parentCategory.is_default,
                                                }}
                                                hasChildren={hasChildren}
                                                isExpanded={isExpanded}
                                                onToggleExpand={() => toggleParentExpanded(parentCategory.id)}
                                                onEdit={() => openEditForm({
                                                    id: parentCategory.id,
                                                    name: parentCategory.name,
                                                    type: parentCategory.type,
                                                    iconId: parentCategory.icon_id,
                                                    parentId: parentCategory.parent_id,
                                                    isDefault: parentCategory.is_default,
                                                })}
                                            />
                                            
                                            {/* Children Categories */}
                                            {hasChildren && isExpanded && (
                                                <div className="bg-slate-50/50">
                                                    {childrenArray.map((child) => (
                                                        <CategoryListItem
                                                            key={child.id}
                                                            category={{
                                                                id: child.id,
                                                                name: child.name,
                                                                type: child.type,
                                                                iconId: child.icon_id,
                                                                parentId: child.parent_id,
                                                                isDefault: child.is_default,
                                                            }}
                                                            hasChildren={false}
                                                            isExpanded={false}
                                                            isChild={true}
                                                            onEdit={() => openEditForm({
                                                                id: child.id,
                                                                name: child.name,
                                                                type: child.type,
                                                                iconId: child.icon_id,
                                                                parentId: child.parent_id,
                                                                isDefault: child.is_default,
                                                            })}
                                    />
                                ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Floating Action Button for Add Category */}
            <button
                type="button"
                onClick={() => openCreateForm()}
                className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/40 transition-all hover:scale-110 hover:shadow-xl hover:shadow-sky-500/50 active:scale-95 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
                aria-label="Thêm hạng mục mới"
            >
                <FaPlus className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>

            {/* Create/Edit Form Modal - Full Screen */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 bg-[#F7F9FC]">
                    {/* Header - Giống HeaderBar */}
                    <header className="pointer-events-none relative z-10 flex-shrink-0 bg-[#F7F9FC]">
                        <div className="relative px-1 py-1">
                            <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100"
                                    aria-label="Đóng"
                                >
                                    <FaArrowLeft className="h-5 w-5" />
                                </button>
                                <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
                                    {editingId ? 'Cập nhật hạng mục' : 'Thêm hạng mục mới'}
                                </p>
                                <div className="flex h-11 w-11 items-center justify-center text-slate-500">
                                    {/* Empty space để cân bằng layout */}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Form Content */}
                    <form id="category-form" className="flex h-full flex-col" onSubmit={handleSubmit}>
                        <div className={`flex-1 overflow-y-auto overscroll-contain bg-[#F7F9FC] p-4 space-y-5 ${editingId ? 'pb-24' : ''}`}>
                            {/* Category Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Tên hạng mục <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    value={formState.name}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                    placeholder="Ví dụ: Ăn sáng, Tiền điện..."
                                    className="h-12 w-full rounded-xl border-0 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                                />
                            </div>

                            {/* Category Type */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Loại hạng mục <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormState((prev) => ({ ...prev, type: 'Chi tiêu' }))}
                                        className={`h-12 rounded-xl border-2 px-4 text-sm font-semibold transition-all ${
                                            formState.type === 'Chi tiêu'
                                                ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Chi tiêu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormState((prev) => ({ ...prev, type: 'Thu nhập' }))}
                                        className={`h-12 rounded-xl border-2 px-4 text-sm font-semibold transition-all ${
                                            formState.type === 'Thu nhập'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Thu nhập
                                    </button>
                                </div>
                            </div>

                            {/* Parent Category Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Hạng mục cha (tùy chọn)
                                </label>
                                <select
                                    value={formState.parentId || ''}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ 
                                            ...prev, 
                                            parentId: event.target.value || null 
                                        }))
                                    }
                                    className="h-12 w-full rounded-xl border-0 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                                >
                                    <option value="">Không có (Hạng mục cha)</option>
                                    {parentCategoriesForForm.map((parent) => (
                                        <option key={parent.id} value={parent.id}>
                                            {parent.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500">
                                    {formState.parentId 
                                        ? 'Hạng mục này sẽ là mục con của hạng mục cha đã chọn'
                                        : 'Để trống để tạo hạng mục cha (có thể thêm mục con sau)'}
                                </p>
                            </div>

                            {/* Icon Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Biểu tượng hiển thị <span className="text-rose-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsIconPickerOpen(true)}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 transition-all hover:border-sky-400 hover:bg-sky-50"
                                >
                                    <span className="flex items-center gap-3">
                                        <IconPreview iconId={formState.iconId} className="h-12 w-12" />
                                        <span className="text-sm font-medium text-slate-900">
                                            {CATEGORY_ICON_MAP[formState.iconId]?.label ?? dbIcons.find(i => i.name === formState.iconId)?.label ?? 'Chưa chọn'}
                                        </span>
                                    </span>
                                    <span className="text-xs font-semibold text-sky-500">Thay đổi</span>
                                </button>
                            </div>

                            {/* Error Message */}
                            {formError && (
                                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-200">
                                    {formError}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons - Fixed at bottom */}
                        {editingId && (
                            <div className="fixed bottom-20 left-0 right-0 z-40 bg-[#F7F9FC] px-4 pb-2">
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        
                                        const editingCategory = categories.find(c => c.id === editingId)
                                        if (!editingCategory) return

                                        await showDialog({
                                            message: `Bạn có chắc muốn xóa hạng mục "${editingCategory.name}"? Tất cả giao dịch liên quan sẽ không còn hạng mục.`,
                                            type: 'warning',
                                            title: 'Xóa hạng mục',
                                            confirmText: 'Xóa',
                                            cancelText: 'Hủy',
                                            onConfirm: async () => {
                                                try {
                                                    setIsDeleting(true)
                                                    await deleteCategoryFromDb(editingId)
                                                    
                                                    // Force reload categories từ database (bỏ qua cache)
                                                    setIsLoading(true)
                                                    const [reloaded, reloadedHierarchical] = await Promise.all([
                                                        fetchCategories(),
                                                        fetchCategoriesHierarchical(),
                                                    ])
                                                    setCategories(sortCategories(reloaded.map(record => mapRecordToCategory(record))))
                                                    setHierarchicalCategories(reloadedHierarchical.map(cat => ({
                                                        ...cat,
                                                        children: Array.isArray(cat.children) ? cat.children : [],
                                                    })))
                                                    setIsLoading(false)
                                                    
                                                    success('Đã xóa hạng mục thành công!')
                                                    closeForm()
                                                } catch (error) {
                                                    setIsLoading(false)
                                                    const message =
                                                        error instanceof Error
                                                            ? `Không thể xóa hạng mục: ${error.message}`
                                                            : 'Không thể xóa hạng mục. Vui lòng thử lại sau.'
                                                    setFormError(message)
                                                    showError(message)
                                                } finally {
                                                    setIsDeleting(false)
                                                }
                                            },
                                        })
                                    }}
                                    disabled={isSubmitting || isDeleting}
                                    className="w-full max-w-md mx-auto rounded-xl border-2 border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg"
                                >
                                    {isDeleting ? 'Đang xóa...' : 'Xóa hạng mục'}
                                </button>
                            </div>
                        )}
                        <ModalFooterButtons
                            onCancel={closeForm}
                            onConfirm={() => {
                                // Chỉ trigger form submit, không làm gì khác
                                // Form submit sẽ gọi handleSubmit để lưu
                                const form = document.getElementById('category-form') as HTMLFormElement
                                if (form) {
                                    form.requestSubmit()
                                }
                            }}
                            confirmText={isSubmitting
                                        ? 'Đang lưu...'
                                        : editingId
                                            ? 'Lưu thay đổi'
                                            : 'Thêm hạng mục'}
                            isSubmitting={isSubmitting}
                            disabled={isSubmitting || isDeleting}
                            confirmButtonType="button"
                            fixed={true}
                        />
                    </form>
                </div>
            )}

            {/* Icon Picker Component */}
            <IconPicker
                isOpen={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelect={handleIconSelect}
                selectedIconId={formState.iconId}
                usedIconIds={usedIconIds}
            />

        </div>
    )
}

type CategoryListItemProps = {
    category: Category
    hasChildren: boolean
    isExpanded: boolean
    isChild?: boolean
    onToggleExpand?: () => void
    onEdit: () => void
}

const CategoryListItem = ({ 
    category, 
    hasChildren, 
    isExpanded, 
    isChild = false,
    onToggleExpand,
    onEdit, 
}: CategoryListItemProps) => {
    const handleItemClick = (e: React.MouseEvent) => {
        // Nếu click vào chevron, chỉ toggle expand
        if ((e.target as HTMLElement).closest('button[data-chevron]')) {
            return
        }
        // Click vào icon hoặc tên sẽ mở modal Edit
        onEdit()
    }

    return (
        <div 
            data-category-item
            className={`group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer ${isChild ? 'pl-12' : ''}`}
            onClick={handleItemClick}
        >
            {/* Chevron for expand/collapse */}
            {hasChildren && onToggleExpand ? (
                <button
                    data-chevron
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpand()
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
                >
                    <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                    </span>
                </button>
            ) : (
                <div className="w-6" />
            )}

            {/* Icon - Clickable */}
            <div 
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700"
                onClick={handleItemClick}
            >
                <CategoryIcon 
                    iconId={category.iconId} 
                    className="h-6 w-6"
                    fallback={<span className="text-lg font-semibold text-slate-600">{category.name[0]?.toUpperCase() || '?'}</span>}
                />
            </div>

            {/* Name - Clickable */}
            <div className="flex-1 min-w-0" onClick={handleItemClick}>
                <p className="truncate text-sm font-medium text-slate-900">{category.name}</p>
            </div>
        </div>
    )
}

type IconPreviewProps = {
    iconId: string
    className?: string
}

const IconPreview = ({ iconId, className }: IconPreviewProps) => {
    const [iconNode, setIconNode] = useState<React.ReactNode>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadIcon = async () => {
            setIsLoading(true)
            try {
                // getIconNode đã xử lý hardcoded map trước, sau đó database
                const node = await getIconNode(iconId)
                if (node) {
                    setIconNode(node)
                } else {
                    // Fallback về hardcoded icon nếu có
                    const hardcodedIcon = CATEGORY_ICON_MAP[iconId]
                    if (hardcodedIcon?.icon) {
                        const IconComponent = hardcodedIcon.icon
                        setIconNode(<IconComponent className="h-6 w-6" />)
                    } else {
                        // Fallback cuối cùng: chữ cái đầu
                        setIconNode(iconId?.[0]?.toUpperCase() || '?')
                    }
                }
            } catch (error) {
                // Chỉ log error nghiêm trọng, không log lỗi "not found"
                if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
                    console.error('Error loading icon preview:', iconId, error)
                }
                // Fallback về hardcoded icon hoặc chữ cái đầu
                const hardcodedIcon = CATEGORY_ICON_MAP[iconId]
                if (hardcodedIcon?.icon) {
                    const IconComponent = hardcodedIcon.icon
                    setIconNode(<IconComponent className="h-6 w-6" />)
                } else {
                    setIconNode(iconId?.[0]?.toUpperCase() || '?')
                }
            } finally {
                setIsLoading(false)
            }
        }
        void loadIcon()
    }, [iconId])

    if (isLoading) {
        return (
            <span className={`flex items-center justify-center rounded-full bg-slate-200 text-slate-500 ${className}`}>
                <span className="text-xs">...</span>
            </span>
        )
    }

    if (!iconNode) {
        return (
            <span className={`flex items-center justify-center rounded-full bg-slate-200 text-slate-500 ${className}`}>
                <span className="text-sm">?</span>
            </span>
        )
    }

    return (
        <span className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-sky-600 shadow-sm ${className}`}>
            {iconNode}
        </span>
    )
}

export default CategoriesPage
