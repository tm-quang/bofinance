import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    RiAddLine,
    RiCloseLine,
    RiDeleteBin6Line,
    RiEdit2Line,
    RiSearchLine,
} from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { CategoryCardSkeleton } from '../components/skeletons'
import { useNotification } from '../contexts/NotificationContext'
import {
    CATEGORY_ICON_GROUPS,
    CATEGORY_ICON_MAP,
    type IconGroup,
    type IconOption,
} from '../constants/categoryIcons'
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

        void loadCategories()
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

        const iconExists = !!CATEGORY_ICON_MAP[formState.iconId]
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
        const confirmed = window.confirm(`Bạn có chắc muốn xoá danh mục "${target.name}"?`)
        if (!confirmed) return

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
    }

    const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
            <HeaderBar variant="page" title="Danh mục" />
            <main className="flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4 sm:max-w-3xl sm:gap-5 sm:px-6 sm:py-5 md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
                    {/* Summary Cards - Horizontal Layout */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100 sm:rounded-2xl sm:px-4 sm:py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                                Tổng
                            </p>
                            <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{categories.length}</p>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-rose-50 to-white px-3 py-2.5 shadow-sm ring-1 ring-rose-100 sm:rounded-2xl sm:px-4 sm:py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 sm:text-xs">
                                Chi tiêu
                            </p>
                            <p className="mt-1 text-xl font-bold text-rose-600 sm:text-2xl">{expenseCategories.length}</p>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white px-3 py-2.5 shadow-sm ring-1 ring-emerald-100 sm:rounded-2xl sm:px-4 sm:py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 sm:text-xs">
                                Thu nhập
                            </p>
                            <p className="mt-1 text-xl font-bold text-emerald-600 sm:text-2xl">{incomeCategories.length}</p>
                        </div>
                    </div>

                    {/* Search and Create Button */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1">
                            <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Tìm kiếm danh mục..."
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-100 sm:rounded-2xl"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={openCreateForm}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] hover:shadow-xl hover:from-sky-600 hover:to-blue-700 sm:rounded-2xl sm:px-5"
                        >
                            <RiAddLine className="h-5 w-5" />
                            <span>Tạo mới</span>
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100 sm:gap-3 sm:p-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('expense')}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:px-5 sm:py-3 ${
                                activeTab === 'expense'
                                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/30'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Chi tiêu</span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                        activeTab === 'expense'
                                            ? 'bg-white/20 text-white'
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
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:px-5 sm:py-3 ${
                                activeTab === 'income'
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Thu nhập</span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                        activeTab === 'income'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-emerald-100 text-emerald-600'
                                    }`}
                                >
                                    {incomeCategories.length}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Category List */}
                    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-5">
                        {loadError && (
                            <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
                                {loadError}
                            </div>
                        )}

                        {isLoading ? (
                            <CategoryCardSkeleton count={6} />
                        ) : currentCategories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                                <p className="text-sm font-semibold text-slate-700 sm:text-base">
                                    Chưa có danh mục {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}
                                </p>
                                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                                    Hãy tạo danh mục mới để bắt đầu quản lý
                                </p>
                                <button
                                    type="button"
                                    onClick={openCreateForm}
                                    className="mt-4 flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                                >
                                    <RiAddLine className="h-4 w-4" />
                                    Tạo danh mục đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                <div className="fixed inset-0 z-50 flex items-end backdrop-blur-md bg-slate-950/50">
                    <div className="w-full h-[85%] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:p-8">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Danh mục</p>
                                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                                    {editingId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                                onClick={closeForm}
                            >
                                <RiCloseLine className="h-5 w-5" />
                            </button>
                        </div>

                        <form className="mt-4 space-y-3 sm:mt-6 sm:space-y-4" onSubmit={handleSubmit}>
                            <label className="block space-y-1.5 text-sm font-medium text-slate-700 sm:space-y-2">
                                Tên danh mục
                                <input
                                    autoFocus
                                    required
                                    value={formState.name}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                    placeholder="Ví dụ: Ăn sáng, Tiền điện..."
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-200 sm:h-11 sm:rounded-2xl sm:px-4"
                                />
                            </label>

                            <label className="block space-y-1.5 text-sm font-medium text-slate-700 sm:space-y-2">
                                Loại danh mục
                                <select
                                    value={formState.type}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ ...prev, type: event.target.value as CategoryType }))
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-200 sm:h-11 sm:rounded-2xl sm:px-4"
                                >
                                    <option value="Chi tiêu">Chi tiêu</option>
                                    <option value="Thu nhập">Thu nhập</option>
                                </select>
                            </label>

                            <div className="space-y-2 text-sm font-medium text-slate-700 sm:space-y-3">
                                <span>Biểu tượng hiển thị</span>
                                <button
                                    type="button"
                                    onClick={() => setIsIconPickerOpen(true)}
                                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-sky-400 hover:bg-sky-50 sm:rounded-2xl sm:px-4 sm:py-3"
                                >
                                    <span className="flex items-center gap-2 text-slate-900 sm:gap-3">
                                        <IconPreview iconId={formState.iconId} className="h-8 w-8 sm:h-10 sm:w-10" />
                                        <span className="text-sm sm:text-base">
                                            {CATEGORY_ICON_MAP[formState.iconId]?.label ?? 'Chưa chọn'}
                                        </span>
                                    </span>
                                    <span className="text-xs font-semibold text-sky-500 sm:text-sm">Thay đổi</span>
                                </button>
                            </div>

                            {formError && (
                                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                                    {formError}
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex-1 rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 sm:px-5"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5"
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
                <div className="fixed inset-0 z-[60] flex items-end backdrop-blur-md bg-slate-950/50">
                    <div className="flex w-full h-[90%] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:gap-5 sm:p-8">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Biểu tượng</p>
                                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Chọn biểu tượng phù hợp</h3>
                                <p className="text-xs text-slate-500 sm:text-sm">
                                    Sắp xếp theo nhóm nội dung phổ biến để bạn chọn nhanh hơn.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsIconPickerOpen(false)}
                                className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                            >
                                <RiCloseLine className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {CATEGORY_ICON_GROUPS.map((group) => {
                                const isActive = activeIconGroup === group.id
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => setActiveIconGroup(group.id)}
                                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                            isActive
                                                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {group.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
                            {CATEGORY_ICON_GROUPS.find((group) => group.id === activeIconGroup)?.icons.map(
                                (icon) => {
                                    const IconComponent = icon.icon
                                    const isSelected = formState.iconId === icon.id
                                    return (
                                        <button
                                            key={icon.id}
                                            type="button"
                                            onClick={() => handleIconSelect(icon)}
                                            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-4 ${
                                                isSelected
                                                    ? 'border-sky-400 bg-sky-50 text-sky-600 shadow-md'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span
                                                className={`flex h-10 w-10 items-center justify-center rounded-full text-base sm:h-12 sm:w-12 sm:text-lg ${
                                                    isSelected ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                <IconComponent />
                                            </span>
                                            <span className="text-center text-[10px] leading-tight sm:text-xs">
                                                {icon.label}
                                            </span>
                                        </button>
                                    )
                                }
                            )}
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
    const iconOption = CATEGORY_ICON_MAP[category.iconId]
    const IconComponent = iconOption?.icon
    const isExpense = category.type === 'Chi tiêu'
    const accentBg = isExpense ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
    const accentPill = isExpense ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'

    return (
        <div className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl sm:gap-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base sm:h-12 sm:w-12 sm:rounded-2xl sm:text-lg ${accentBg}`}
                    >
                        {IconComponent ? <IconComponent /> : category.name[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{category.name}</p>
                        <span
                            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${accentPill}`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${isExpense ? 'bg-rose-400' : 'bg-emerald-400'}`}
                            />
                            {category.type}
                        </span>
                    </div>
                </div>
                <div className="flex shrink-0 gap-1 sm:gap-1.5">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 sm:p-2"
                        aria-label={`Chỉnh sửa ${category.name}`}
                    >
                        <RiEdit2Line className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-lg border border-rose-200/60 p-1.5 text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 sm:p-2"
                        aria-label={`Xoá ${category.name}`}
                    >
                        <RiDeleteBin6Line className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

type IconPreviewProps = {
    iconId: string
    className?: string
}

const IconPreview = ({ iconId, className }: IconPreviewProps) => {
    const IconComp = CATEGORY_ICON_MAP[iconId]?.icon
    if (!IconComp) {
        return (
            <span className={`flex items-center justify-center rounded-full bg-slate-200 text-slate-500 ${className}`}>
                ?
            </span>
        )
    }

    return (
        <span className={`flex items-center justify-center rounded-full bg-sky-100 text-sky-600 ${className}`}>
            <IconComp />
        </span>
    )
}

export default CategoriesPage
