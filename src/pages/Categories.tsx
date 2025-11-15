import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    FaPlus,
    FaTimes,
    FaTrash,
    FaEdit,
    FaSearch,
} from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { CategoryCardSkeleton } from '../components/skeletons'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import {
    CATEGORY_ICON_GROUPS,
    CATEGORY_ICON_MAP,
    type IconGroup,
    type IconOption,
} from '../constants/categoryIcons'
import { getIconNode, loadIconsGrouped, getCachedIconLibrary } from '../utils/iconLoader'
import { fetchIcons, type IconRecord } from '../lib/iconService'
import {
    createCategory,
    deleteCategory as deleteCategoryFromDb,
    fetchCategories,
    updateCategory,
    type CategoryRecord,
    type CategoryType,
} from '../lib/categoryService'

type Category = {
    id: string
    name: string
    type: CategoryType
    iconId: string
}

type CategoryFormState = {
    name: string
    type: CategoryType
    iconId: string
}

const mapRecordToCategory = (record: CategoryRecord): Category => ({
    id: record.id,
    name: record.name,
    type: record.type,
    iconId: record.icon_id,
})

const sortCategories = (items: Category[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }))

export const CategoriesPage = () => {
    const { success, error: showError } = useNotification()
    const { showDialog } = useDialog()
    const [categories, setCategories] = useState<Category[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
    const [formState, setFormState] = useState<CategoryFormState>({
        name: '',
        type: 'Chi tiêu',
        iconId: CATEGORY_ICON_GROUPS[0]?.icons[0]?.id ?? 'other',
    })
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
    const [activeIconGroup, setActiveIconGroup] = useState<IconGroup['id']>(
        CATEGORY_ICON_GROUPS[0]?.id ?? 'life'
    )
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [dbIcons, setDbIcons] = useState<IconRecord[]>([])
    const [availableIcons, setAvailableIcons] = useState<IconGroup[]>(CATEGORY_ICON_GROUPS)

    const [searchParams, setSearchParams] = useSearchParams()

    const filteredCategories = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        return categories.filter((category) => {
            if (!normalizedSearch) return true
            return category.name.toLowerCase().includes(normalizedSearch)
        })
    }, [categories, searchTerm])

    const expenseCategories = useMemo(
        () => filteredCategories.filter((category) => category.type === 'Chi tiêu'),
        [filteredCategories]
    )

    const incomeCategories = useMemo(
        () => filteredCategories.filter((category) => category.type === 'Thu nhập'),
        [filteredCategories]
    )

    const openCreateForm = useCallback(() => {
        setEditingId(null)
        // Tự động set type dựa trên tab hiện tại
        const categoryType: CategoryType = activeTab === 'expense' ? 'Chi tiêu' : 'Thu nhập'
        setFormState({
            name: '',
            type: categoryType,
            iconId: CATEGORY_ICON_GROUPS[0]?.icons[0]?.id ?? 'other',
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
                const data = await fetchCategories()
                setCategories(sortCategories(data.map(mapRecordToCategory)))
                setLoadError(null)
            } catch (error) {
                console.error('Không thể tải danh mục:', error)
                setLoadError(
                    error instanceof Error
                        ? `Không thể tải danh mục: ${error.message}`
                        : 'Không thể tải danh mục. Vui lòng thử lại sau.'
                )
            } finally {
                setIsLoading(false)
            }
        }

        const loadIcons = async () => {
            try {
                // Preload all icon libraries first
                const libraries = ['fa', 'bs', 'lu', 'hi2', 'md']
                await Promise.all(
                    libraries.map((lib) => getCachedIconLibrary(lib))
                )

                const icons = await fetchIcons({ is_active: true })
                setDbIcons(icons)
                
                // Load icons từ database và sắp xếp theo display_order
                const groupedIcons = await loadIconsGrouped()
                
                // Tạo map để track icons đã có trong database (để tránh duplicate)
                const dbIconIds = new Set<string>()
                icons.forEach(icon => dbIconIds.add(icon.name))
                
                // Tạo groups từ database, ưu tiên database icons
                const mergedGroups: IconGroup[] = []
                
                // Xử lý các groups từ database
                Object.keys(groupedIcons).forEach((groupId) => {
                    const dbGroupIcons = groupedIcons[groupId]
                    // Sắp xếp theo display_order
                    const sortedIcons = [...dbGroupIcons].sort((a, b) => 
                        (a.display_order || 0) - (b.display_order || 0)
                    )
                    
                    const dbIconOptions: IconOption[] = sortedIcons.map((icon) => ({
                        id: icon.name,
                        label: icon.label,
                        icon: null as any, // Will be loaded dynamically
                    }))
                    
                    // Tìm group label từ database hoặc hardcoded
                    const groupLabel = dbGroupIcons[0]?.group_label || 
                        CATEGORY_ICON_GROUPS.find(g => g.id === groupId)?.label || 
                        groupId
                    
                    mergedGroups.push({
                        id: groupId,
                        label: groupLabel,
                        icons: dbIconOptions,
                    })
                })
                
                // Thêm hardcoded icons như fallback cho các groups đã có trong database
                // nhưng chỉ thêm những icons chưa có trong database
                CATEGORY_ICON_GROUPS.forEach((hardcodedGroup) => {
                    const existingGroup = mergedGroups.find(g => g.id === hardcodedGroup.id)
                    if (existingGroup) {
                        // Thêm hardcoded icons chưa có trong database vào cuối
                        const missingIcons = hardcodedGroup.icons.filter(
                            icon => !dbIconIds.has(icon.id)
                        )
                        existingGroup.icons = [...existingGroup.icons, ...missingIcons]
                    } else {
                        // Nếu group chưa có trong database, thêm toàn bộ hardcoded icons
                        mergedGroups.push({
                            ...hardcodedGroup,
                            icons: [...hardcodedGroup.icons],
                        })
                    }
                })
                
                // Sắp xếp lại groups theo thứ tự: life, finance, lifestyle, others, và các groups mới
                const groupOrder = ['life', 'finance', 'lifestyle', 'others']
                mergedGroups.sort((a, b) => {
                    const aIndex = groupOrder.indexOf(a.id)
                    const bIndex = groupOrder.indexOf(b.id)
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                    if (aIndex !== -1) return -1
                    if (bIndex !== -1) return 1
                    return a.label.localeCompare(b.label, 'vi')
                })
                
                setAvailableIcons(mergedGroups)
            } catch (error) {
                console.error('Error loading icons:', error)
                // Fallback to hardcoded icons
                setAvailableIcons(CATEGORY_ICON_GROUPS)
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
        })
        setFormError(null)
        setIsFormOpen(true)
    }

    const closeForm = () => {
        setIsFormOpen(false)
        setFormError(null)
    }

    const handleIconSelect = (icon: IconOption) => {
        setFormState((prev) => ({ ...prev, iconId: icon.id }))
        setIsIconPickerOpen(false)
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const trimmedName = formState.name.trim()

        if (!trimmedName) {
            setFormError('Vui lòng nhập tên danh mục.')
            return
        }

        // Check if icon exists in hardcoded map or database
        const iconExists = !!CATEGORY_ICON_MAP[formState.iconId] || dbIcons.some(icon => icon.name === formState.iconId)
        if (!iconExists) {
            setFormError('Hãy chọn biểu tượng cho danh mục.')
            return
        }

        setFormError(null)
        setIsSubmitting(true)

        try {
            if (editingId) {
                const updated = await updateCategory(editingId, {
                    name: trimmedName,
                    type: formState.type,
                    icon_id: formState.iconId,
                })
                setCategories((prev) =>
                    sortCategories(
                        prev.map((category) =>
                            category.id === editingId ? mapRecordToCategory(updated) : category
                        )
                    )
                )
                success('Đã cập nhật danh mục thành công!')
            } else {
                const created = await createCategory({
                    name: trimmedName,
                    type: formState.type,
                    icon_id: formState.iconId,
                })
                setCategories((prev) => sortCategories([...prev, mapRecordToCategory(created)]))
                success('Đã tạo danh mục mới thành công!')
            }

            // Reload categories để cập nhật icon
            const reloaded = await fetchCategories()
            setCategories(sortCategories(reloaded.map(mapRecordToCategory)))
            closeForm()
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Đã xảy ra lỗi khi lưu danh mục. Vui lòng thử lại sau.'
            setFormError(message)
            showError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        const target = categories.find((category) => category.id === id)
        if (!target) return
        
        await showDialog({
            message: `Bạn có chắc muốn xoá danh mục "${target.name}"?`,
            type: 'warning',
            title: 'Xóa danh mục',
            confirmText: 'Xóa',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    await deleteCategoryFromDb(id)
                    setCategories((prev) => prev.filter((category) => category.id !== id))
                    success('Đã xóa danh mục thành công!')
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? `Không thể xoá danh mục: ${error.message}`
                            : 'Không thể xoá danh mục. Vui lòng thử lại sau.'
                    showError(message)
                }
            },
        })
    }

    const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
            <HeaderBar variant="page" title="Danh mục" />
            <main className="flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
                    {/* Summary Cards - Compact Design */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                        <div className="rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-100/50 sm:px-4 sm:py-3.5">
                            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500 sm:text-[10px]">
                                Tổng
                            </p>
                            <p className="mt-1.5 text-2xl font-bold text-slate-900 sm:text-3xl">{categories.length}</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 px-3 py-3 shadow-md shadow-rose-500/20 sm:px-4 sm:py-3.5">
                            <p className="text-[9px] font-medium uppercase tracking-wider text-rose-50 sm:text-[10px]">
                                Chi tiêu
                            </p>
                            <p className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">{expenseCategories.length}</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-3 shadow-md shadow-emerald-500/20 sm:px-4 sm:py-3.5">
                            <p className="text-[9px] font-medium uppercase tracking-wider text-emerald-50 sm:text-[10px]">
                                Thu nhập
                            </p>
                            <p className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">{incomeCategories.length}</p>
                        </div>
                    </div>

                    {/* Search and Create Button */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Tìm kiếm danh mục..."
                                className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 sm:h-11"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={openCreateForm}
                            className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/40 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-sky-500/50 active:scale-[0.98] sm:px-6 sm:py-2.5"
                        >
                            <FaPlus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                            <span>Tạo mới</span>
                        </button>
                    </div>

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
                            <div className="flex items-center justify-center gap-2">
                                <span>Chi tiêu</span>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                        activeTab === 'expense'
                                            ? 'bg-white/25 text-white backdrop-blur-sm'
                                            : 'bg-rose-100 text-rose-600'
                                    }`}
                                >
                                    {expenseCategories.length}
                                </span>
                            </div>
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
                            <div className="flex items-center justify-center gap-2">
                                <span>Thu nhập</span>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                        activeTab === 'income'
                                            ? 'bg-white/25 text-white backdrop-blur-sm'
                                            : 'bg-emerald-100 text-emerald-600'
                                    }`}
                                >
                                    {incomeCategories.length}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Category List */}
                    <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100/50 sm:rounded-3xl sm:p-4">
                        {loadError && (
                            <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
                                {loadError}
                            </div>
                        )}

                        {isLoading ? (
                            <CategoryCardSkeleton count={6} />
                        ) : currentCategories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                                <div className="mb-4 rounded-full bg-slate-100 p-4">
                                    <FaPlus className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-base font-semibold text-slate-700 sm:text-lg">
                                    Chưa có danh mục {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}
                                </p>
                                <p className="mt-1.5 text-sm text-slate-500">
                                    Hãy tạo danh mục mới để bắt đầu quản lý
                                </p>
                                <button
                                    type="button"
                                    onClick={openCreateForm}
                                    className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:scale-105 hover:shadow-lg"
                                >
                                    <FaPlus className="h-4 w-4" />
                                    Tạo danh mục đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                                {currentCategories.map((category) => (
                                    <CategoryCard
                                        key={category.id}
                                        category={category}
                                        onEdit={() => openEditForm(category)}
                                        onDelete={() => handleDelete(category.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <FooterNav onAddClick={() => setIsTransactionModalOpen(true)} />

            {/* Create/Edit Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
                    <div className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 sm:px-8">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Danh mục</p>
                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    {editingId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                                onClick={closeForm}
                            >
                                <FaTimes className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form Content */}
                        <form className="p-6 space-y-5 sm:p-8 sm:space-y-6" onSubmit={handleSubmit}>
                            {/* Category Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Tên danh mục <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    autoFocus
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
                                    Loại danh mục <span className="text-rose-500">*</span>
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

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-600 hover:to-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSubmitting
                                        ? 'Đang lưu...'
                                        : editingId
                                            ? 'Lưu thay đổi'
                                            : 'Thêm danh mục'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Icon Picker Modal */}
            {isIconPickerOpen && (
                <div className="fixed inset-0 z-[60] flex items-end backdrop-blur-sm bg-slate-950/60">
                    <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 sm:px-8">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Biểu tượng</p>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">Chọn biểu tượng</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Sắp xếp theo nhóm để bạn chọn nhanh hơn
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsIconPickerOpen(false)}
                                className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                            >
                                <FaTimes className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Group Tabs */}
                        <div className="sticky top-[73px] z-10 border-b border-slate-200 bg-white px-6 py-3 sm:px-8">
                            <div className="flex flex-wrap gap-2">
                                {availableIcons.map((group) => {
                                    const isActive = activeIconGroup === group.id
                                    return (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => setActiveIconGroup(group.id)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                                isActive
                                                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {group.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Icons Grid */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
                                {availableIcons.find((group) => group.id === activeIconGroup)?.icons.map(
                                    (icon) => {
                                        const isSelected = formState.iconId === icon.id
                                        const dbIcon = dbIcons.find(i => i.name === icon.id)
                                        const displayLabel = dbIcon?.label || icon.label
                                        
                                        return (
                                            <IconPickerItem
                                                key={icon.id}
                                                icon={icon}
                                                isSelected={isSelected}
                                                displayLabel={displayLabel}
                                                onSelect={() => handleIconSelect(icon)}
                                            />
                                        )
                                    }
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    // Có thể reload hoặc show notification
                }}
            />
        </div>
    )
}

type CategoryCardProps = {
    category: Category
    onEdit: () => void
    onDelete: () => void
}

const CategoryCard = ({ category, onEdit, onDelete }: CategoryCardProps) => {
    const [iconNode, setIconNode] = useState<React.ReactNode>(null)
    const [isLoadingIcon, setIsLoadingIcon] = useState(true)
    const isExpense = category.type === 'Chi tiêu'
    const accentBg = isExpense ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
    const accentPill = isExpense ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'

    useEffect(() => {
        const loadIcon = async () => {
            setIsLoadingIcon(true)
            try {
                // getIconNode đã xử lý hardcoded map trước, sau đó database
                const node = await getIconNode(category.iconId)
                if (node) {
                    setIconNode(node)
                } else {
                    // Fallback to first letter
                    setIconNode(category.name[0]?.toUpperCase() || '?')
                }
            } catch (error) {
                // Chỉ log error nghiêm trọng, không log lỗi "not found"
                if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
                    console.error('Error loading category icon:', category.iconId, category.name, error)
                }
                setIconNode(category.name[0]?.toUpperCase() || '?')
            } finally {
                setIsLoadingIcon(false)
            }
        }
        void loadIcon()
    }, [category.iconId, category.name])

    return (
        <div className="group relative flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200/50 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.98] sm:gap-3 sm:p-3.5">
            {/* Icon */}
            <div className="flex w-full items-center justify-center">
                <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg transition-transform group-hover:scale-110 sm:h-16 sm:w-16 sm:text-xl ${accentBg}`}
                >
                    {isLoadingIcon ? (
                        <span className="text-xs text-slate-400">...</span>
                    ) : iconNode ? (
                        iconNode
                    ) : (
                        category.name[0]?.toUpperCase() || '?'
                    )}
                </span>
            </div>
            
            {/* Name */}
            <div className="w-full text-center">
                <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">{category.name}</p>
                <span
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium sm:text-[10px] ${accentPill}`}
                >
                    <span
                        className={`h-1 w-1 rounded-full ${isExpense ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    />
                    {category.type}
                </span>
            </div>

            {/* Action Buttons - Hidden by default, shown on hover */}
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                    }}
                    className="rounded-lg bg-white/90 p-1.5 text-sky-500 shadow-md backdrop-blur-sm transition hover:bg-sky-50 hover:text-sky-600"
                    aria-label={`Chỉnh sửa ${category.name}`}
                >
                    <FaEdit className="h-3 w-3" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                    className="rounded-lg bg-white/90 p-1.5 text-rose-500 shadow-md backdrop-blur-sm transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Xoá ${category.name}`}
                >
                    <FaTrash className="h-3 w-3" />
                </button>
            </div>
        </div>
    )
}

type IconPickerItemProps = {
    icon: IconOption
    isSelected: boolean
    displayLabel: string
    onSelect: () => void
}

const IconPickerItem = ({ icon, isSelected, displayLabel, onSelect }: IconPickerItemProps) => {
    const [iconNode, setIconNode] = useState<React.ReactNode>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadIcon = async () => {
            setIsLoading(true)
            try {
                // Nếu icon có sẵn trong hardcoded map (từ IconOption)
                if (icon.icon) {
                    const IconComponent = icon.icon
                    setIconNode(React.createElement(IconComponent, { className: 'h-6 w-6 sm:h-8 sm:w-8' }))
                } else {
                    // getIconNode đã xử lý hardcoded map trước, sau đó database
                    const node = await getIconNode(icon.id)
                    if (node) {
                        setIconNode(node)
                    } else {
                        setIconNode(
                            <span className="text-lg sm:text-xl text-slate-400">?</span>
                        )
                    }
                }
            } catch (error) {
                // Chỉ log error nghiêm trọng, không log lỗi "not found"
                if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
                    console.error('Error loading icon:', icon.id, icon.label, error)
                }
                setIconNode(
                    <span className="text-lg sm:text-xl text-slate-400">?</span>
                )
            } finally {
                setIsLoading(false)
            }
        }
        void loadIcon()
    }, [icon.id, icon.icon])

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-medium transition-all active:scale-95 ${
                isSelected
                    ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-md shadow-sky-500/20'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-base transition-transform group-hover:scale-110 ${
                    isSelected ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                }`}
            >
                {isLoading ? (
                    <span className="text-xs text-slate-400">...</span>
                ) : iconNode ? (
                    iconNode
                ) : (
                    <span className="text-lg">?</span>
                )}
            </span>
            <span className="text-center text-[10px] leading-tight">
                {displayLabel}
            </span>
        </button>
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
                    setIconNode(null)
                }
            } catch (error) {
                // Chỉ log error nghiêm trọng, không log lỗi "not found"
                if (error instanceof Error && !error.message.includes('not found')) {
                    console.error('Error loading icon preview:', iconId, error)
                }
                setIconNode(null)
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
