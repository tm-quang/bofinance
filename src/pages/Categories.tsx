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

const createId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const createInitialFormState = (): CategoryFormState => ({
    name: '',
    type: 'Chi tiêu',
    iconId: CATEGORY_ICON_GROUPS[0]?.icons[0]?.id ?? 'other',
})

const mapRecordToCategory = (record: CategoryRecord): Category => ({
    id: record.id,
    name: record.name,
    type: record.type,
    iconId: record.icon_id,
})

const sortCategories = (items: Category[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }))

const DEFAULT_CATEGORIES: Category[] = [
    { id: createId(), name: 'Ăn uống', type: 'Chi tiêu', iconId: 'food' },
    { id: createId(), name: 'Đi lại', type: 'Chi tiêu', iconId: 'transport' },
    { id: createId(), name: 'Hóa đơn', type: 'Chi tiêu', iconId: 'service' },
    { id: createId(), name: 'Lương cố định', type: 'Thu nhập', iconId: 'salary' },
    { id: createId(), name: 'Đầu tư chứng khoán', type: 'Thu nhập', iconId: 'investment' },
    { id: createId(), name: 'Quà tặng', type: 'Thu nhập', iconId: 'gift' },
]

export const CategoriesPage = () => {
    const [categories, setCategories] = useState<Category[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all')
    const [formState, setFormState] = useState<CategoryFormState>(createInitialFormState())
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
    const [isRemoteEnabled, setIsRemoteEnabled] = useState(true)
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

    const tabSummaries = useMemo(
        () => ({
            all: {
                label: 'Tất cả',
                badge: filteredCategories.length,
                helper: 'Toàn bộ danh mục của bạn',
            },
            expense: {
                label: 'Chi tiêu',
                badge: expenseCategories.length,
                helper: 'Kiểm soát các khoản chi hàng ngày',
            },
            income: {
                label: 'Thu nhập',
                badge: incomeCategories.length,
                helper: 'Những nguồn thu ổn định & thêm',
            },
        }) as const,
        [expenseCategories.length, filteredCategories.length, incomeCategories.length]
    )

    const totalCategories = categories.length
    const tabOrder: Array<typeof activeTab> = ['all', 'expense', 'income']

    const renderCategorySections = () => {
        switch (activeTab) {
            case 'expense':
                return (
                    <div className="space-y-4 sm:space-y-5">
                        <CategorySection
                            title="Chi tiêu"
                            description="Những khoản chi hàng ngày, hoá đơn, sinh hoạt."
                            categories={expenseCategories}
                            onEdit={openEditForm}
                            onDelete={handleDelete}
                        />
                    </div>
                )
            case 'income':
                return (
                    <div className="space-y-4 sm:space-y-5">
                        <CategorySection
                            title="Thu nhập"
                            description="Các nguồn thu cố định hoặc thu nhập thêm."
                            categories={incomeCategories}
                            onEdit={openEditForm}
                            onDelete={handleDelete}
                        />
                    </div>
                )
            default:
                return (
                    <div className="space-y-4 sm:space-y-5">
                        <CategorySection
                            title="Chi tiêu"
                            description="Những khoản chi hàng ngày, hoá đơn, sinh hoạt."
                            categories={expenseCategories}
                            onEdit={openEditForm}
                            onDelete={handleDelete}
                        />

                        <CategorySection
                            title="Thu nhập"
                            description="Các nguồn thu cố định hoặc thu nhập thêm."
                            categories={incomeCategories}
                            onEdit={openEditForm}
                            onDelete={handleDelete}
                        />
                    </div>
                )
        }
    }

    const openCreateForm = useCallback(() => {
        setEditingId(null)
        setFormState(createInitialFormState())
        setFormError(null)
        setIsFormOpen(true)
    }, [])

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
                setIsRemoteEnabled(true)
            } catch (error) {
                console.error('Không thể tải danh mục từ Supabase:', error)
                setCategories(sortCategories([...DEFAULT_CATEGORIES]))
                setLoadError(
                    error instanceof Error
                        ? `Không thể kết nối Supabase: ${error.message}. Đang dùng dữ liệu tạm thời.`
                        : 'Không thể kết nối Supabase. Đang dùng dữ liệu tạm thời.'
                )
                setIsRemoteEnabled(false)
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
            if (isRemoteEnabled) {
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
                } else {
                    const created = await createCategory({
                        name: trimmedName,
                        type: formState.type,
                        icon_id: formState.iconId,
                    })
                    setCategories((prev) => sortCategories([...prev, mapRecordToCategory(created)]))
                }
            } else {
                if (editingId) {
                    setCategories((prev) =>
                        sortCategories(
                            prev.map((category) =>
                                category.id === editingId
                                    ? { ...category, name: trimmedName, type: formState.type, iconId: formState.iconId }
                                    : category
                            )
                        )
                    )
                } else {
                    setCategories((prev) =>
                        sortCategories([
                            ...prev,
                            { id: createId(), name: trimmedName, type: formState.type, iconId: formState.iconId },
                        ])
                    )
                }
            }

            closeForm()
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : 'Đã xảy ra lỗi khi lưu danh mục. Vui lòng thử lại sau.'
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        const target = categories.find((category) => category.id === id)
        if (!target) return
        const confirmed = window.confirm(`Bạn có chắc muốn xoá danh mục "${target.name}"?`)
        if (!confirmed) return

        if (isRemoteEnabled) {
            try {
                await deleteCategoryFromDb(id)
                setCategories((prev) => prev.filter((category) => category.id !== id))
            } catch (error) {
                window.alert(
                    error instanceof Error
                        ? `Không thể xoá danh mục: ${error.message}`
                        : 'Không thể xoá danh mục. Vui lòng thử lại sau.'
                )
            }
        } else {
            setCategories((prev) => prev.filter((category) => category.id !== id))
        }
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
            <HeaderBar variant="page" title="Danh mục" />
            <main className="flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 sm:gap-8 sm:py-8 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
                    <header className="space-y-5">
                        <div className="rounded-[28px] bg-gradient-to-br from-sky-500 via-sky-400 to-blue-500 p-6 text-white shadow-[0_30px_80px_rgba(56,189,248,0.35)] sm:p-8">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-3 sm:space-y-4">
                                    <p className="text-xs uppercase tracking-[0.4em] text-white/80">Danh mục</p>
                                    <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">Quản lý thu & chi</h1>
                                    <p className="max-w-lg text-sm text-white/85 sm:text-base">
                                        Sắp xếp nguồn tiền của bạn theo nhóm trực quan, dễ dàng tìm và chỉnh sửa bất cứ lúc nào.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:items-end">
                                    <button
                                        type="button"
                                        onClick={openCreateForm}
                                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,40,80,0.25)] backdrop-blur transition hover:bg-white/25 sm:px-5 sm:py-2.5"
                                    >
                                        <RiAddLine className="h-4 w-4" />
                                        <span>Thêm danh mục</span>
                                    </button>
                                    <span
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                            isRemoteEnabled
                                                ? 'bg-white/15 text-white'
                                                : 'bg-white/10 text-amber-100'
                                        }`}
                                    >
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                isRemoteEnabled ? 'bg-emerald-300' : 'bg-amber-300'
                                            }`}
                                        />
                                        {isRemoteEnabled ? 'Đồng bộ Supabase' : 'Chế độ offline tạm thời'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,40,80,0.08)] ring-1 ring-white/60">
                                <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Tổng</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{totalCategories}</p>
                                <p className="mt-1 text-xs text-slate-500">Danh mục đang quản lý</p>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-rose-50 via-white to-white px-4 py-3 shadow-[0_18px_45px_rgba(244,114,182,0.18)] ring-1 ring-rose-100">
                                <p className="text-[10px] uppercase tracking-[0.4em] text-rose-400">Chi tiêu</p>
                                <p className="mt-2 text-2xl font-semibold text-rose-500 sm:text-3xl">{expenseCategories.length}</p>
                                <p className="mt-1 text-xs text-rose-400/80">Nhóm chi phí được phân loại</p>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-white px-4 py-3 shadow-[0_18px_45px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100">
                                <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-500">Thu nhập</p>
                                <p className="mt-2 text-2xl font-semibold text-emerald-600 sm:text-3xl">{incomeCategories.length}</p>
                                <p className="mt-1 text-xs text-emerald-500/80">Nguồn thu được ghi nhận</p>
                            </div>
                        </div>
                    </header>

                    <section className="rounded-3xl bg-white/90 p-4 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 backdrop-blur sm:p-6">
                        <div className="space-y-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative w-full sm:max-w-sm">
                                    <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4" />
                                    <input
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Tìm kiếm danh mục theo tên..."
                                        className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-100 sm:h-11 sm:pl-12"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={openCreateForm}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:bg-sky-600 sm:hidden"
                                >
                                    <RiAddLine className="h-4 w-4" />
                                    Tạo mới
                                </button>
                            </div>

                            <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {tabOrder.map((tab) => {
                                    const summary = tabSummaries[tab]
                                    const isActive = activeTab === tab
                                    return (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveTab(tab)}
                                            className={`group rounded-2xl border px-4 py-3 text-left transition sm:px-5 ${
                                                isActive
                                                    ? 'border-transparent bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-[0_18px_45px_rgba(56,189,248,0.25)]'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-semibold sm:text-base">{summary.label}</span>
                                                <span
                                                    className={`inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full border px-3 text-xs font-semibold ${
                                                        isActive
                                                            ? 'border-white/40 bg-white/20 text-white'
                                                            : 'border-sky-100 bg-sky-50 text-sky-600'
                                                    }`}
                                                >
                                                    {summary.badge}
                                                </span>
                                            </div>
                                            <p
                                                className={`mt-2 text-xs leading-snug ${
                                                    isActive
                                                        ? 'text-white/80'
                                                        : 'text-slate-400 transition group-hover:text-slate-500'
                                                }`}
                                            >
                                                {summary.helper}
                                            </p>
                                        </button>
                                    )
                                })}
                            </nav>

                            {loadError && (
                                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-[0_12px_30px_rgba(15,40,80,0.08)]">
                                    {loadError}
                                </p>
                            )}

                            {isLoading ? (
                                <CategoryCardSkeleton count={8} />
                            ) : (
                                renderCategorySections()
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <FooterNav onAddClick={() => setIsTransactionModalOpen(true)} />

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
                                        <span className="text-sm sm:text-base">{CATEGORY_ICON_MAP[formState.iconId]?.label ?? 'Chưa chọn'}</span>
                                    </span>
                                    <span className="text-xs font-semibold text-sky-500 sm:text-sm">Thay đổi</span>
                                </button>
                            </div>

                            {formError && (
                                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">{formError}</p>
                            )}

                            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 sm:px-5"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5"
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
                                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${isActive
                                            ? 'bg-sky-500 text-white shadow-lg'
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
                                            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-4 ${isSelected
                                                ? 'border-sky-400 bg-sky-50 text-sky-600'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span
                                                className={`flex h-10 w-10 items-center justify-center rounded-full text-base sm:h-12 sm:w-12 sm:text-lg ${isSelected ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                                                    }`}
                                            >
                                                <IconComponent />
                                            </span>
                                            <span className="text-center text-[10px] leading-tight sm:text-xs">{icon.label}</span>
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

type CategorySectionProps = {
    title: string
    description: string
    categories: Category[]
    onEdit: (category: Category) => void
    onDelete: (id: string) => void
}

const CategorySection = ({
    title,
    description,
    categories,
    onEdit,
    onDelete,
}: CategorySectionProps) => {
    if (!categories.length) {
        return (
            <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 sm:p-6">
                <h2 className="text-base font-semibold text-slate-700 sm:text-lg">{title}</h2>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">{description}</p>
                <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500">
                    Chưa có danh mục nào. Hãy tạo mới để dễ dàng theo dõi.
                </p>
            </section>
        )
    }

    return (
        <section className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_18px_45px_rgba(15,40,80,0.05)] sm:p-6">
            <div className="mb-3 sm:mb-4">
                <h2 className="text-base font-semibold text-slate-800 sm:text-lg">{title}</h2>
                <p className="text-xs text-slate-500 sm:text-sm">{description}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {categories.map((category) => (
                    <CategoryCard
                        key={category.id}
                        category={category}
                        onEdit={() => onEdit(category)}
                        onDelete={() => onDelete(category.id)}
                    />
                ))}
            </div>
        </section>
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
        <div className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:rounded-3xl sm:gap-4 sm:p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base sm:h-12 sm:w-12 sm:rounded-2xl sm:text-lg ${accentBg}`}
                    >
                        {IconComponent ? <IconComponent /> : category.name[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{category.name}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold sm:text-xs ${accentPill}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isExpense ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                            {category.type}
                        </span>
                    </div>
                </div>
                <div className="flex shrink-0 gap-1.5 sm:gap-2">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="rounded-full border border-slate-200 p-1.5 text-slate-400 transition hover:border-sky-200 hover:text-sky-500 sm:p-2"
                        aria-label={`Chỉnh sửa ${category.name}`}
                    >
                        <RiEdit2Line className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-full border border-rose-200/60 p-1.5 text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 sm:p-2"
                        aria-label={`Xoá ${category.name}`}
                    >
                        <RiDeleteBin6Line className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                </div>
            </div>
            {iconOption?.label && (
                <p className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 sm:rounded-2xl sm:px-3 sm:py-2">
                    <span className="hidden sm:inline">Biểu tượng: </span>
                    {iconOption.label}
                </p>
            )}
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
            <span
                className={`flex items-center justify-center rounded-full bg-slate-200 text-slate-500 ${className}`}
            >
                ?
            </span>
        )
    }

    return (
        <span
            className={`flex items-center justify-center rounded-full bg-sky-100 text-sky-600 ${className}`}
        >
            <IconComp />
        </span>
    )
}

export default CategoriesPage


