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
    const [typeFilter, setTypeFilter] = useState<CategoryType | 'Tất cả'>('Tất cả')
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

    const [searchParams, setSearchParams] = useSearchParams()

    const filteredCategories = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        return categories.filter((category) => {
            const matchesType =
                typeFilter === 'Tất cả' ? true : category.type.toLowerCase() === typeFilter.toLowerCase()
            const matchesSearch =
                !normalizedSearch || category.name.toLowerCase().includes(normalizedSearch)
            return matchesType && matchesSearch
        })
    }, [categories, searchTerm, typeFilter])

    const expenseCategories = filteredCategories.filter((category) => category.type === 'Chi tiêu')
    const incomeCategories = filteredCategories.filter((category) => category.type === 'Thu nhập')

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
        <div className="min-h-screen bg-[#F7F9FC] text-slate-900">
            <HeaderBar variant="page" title="Danh mục" />
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-44 pt-28">
                <header className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Danh mục</p>
                            <h1 className="text-2xl font-semibold text-slate-900">Quản lý thu & chi</h1>
                        </div>
                        <button
                            type="button"
                            onClick={openCreateForm}
                            className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(56,189,248,0.35)] transition hover:bg-sky-600"
                        >
                            <RiAddLine />
                            Thêm danh mục
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 shadow-[0_18px_45px_rgba(15,40,80,0.08)] ring-1 ring-slate-100">
                        <div className="relative">
                            <RiSearchLine className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Tìm kiếm danh mục..."
                                className="h-11 w-full rounded-full bg-white pl-11 pr-4 text-sm text-slate-900 outline-none ring-2 ring-transparent transition focus:ring-sky-400"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['Tất cả', 'Chi tiêu', 'Thu nhập'] as const).map((type) => {
                                const isActive = typeFilter === type
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setTypeFilter(type)}
                                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${isActive
                                            ? 'bg-sky-500 text-white shadow-lg'
                                            : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </header>

                {loadError && (
                    <p className="rounded-3xl bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-[0_12px_30px_rgba(15,40,80,0.08)]">
                        {loadError}
                    </p>
                )}

                {isLoading ? (
                    <div className="rounded-3xl bg-white/10 p-6 text-center text-sm text-slate-200 shadow-xl backdrop-blur">
                        Đang tải danh mục...
                    </div>
                ) : (
                    <section className="space-y-5">
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
                    </section>
                )}
            </main>

            <FooterNav onAddClick={openCreateForm} />

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 pb-24 pt-12 sm:items-center">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Danh mục</p>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {editingId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                                onClick={closeForm}
                            >
                                <RiCloseLine className="h-5 w-5" />
                            </button>
                        </div>

                        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                            <label className="block space-y-2 text-sm font-medium text-slate-700">
                                Tên danh mục
                                <input
                                    autoFocus
                                    required
                                    value={formState.name}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                    placeholder="Ví dụ: Ăn sáng, Tiền điện..."
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-200"
                                />
                            </label>

                            <label className="block space-y-2 text-sm font-medium text-slate-700">
                                Loại danh mục
                                <select
                                    value={formState.type}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ ...prev, type: event.target.value as CategoryType }))
                                    }
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-200"
                                >
                                    <option value="Chi tiêu">Chi tiêu</option>
                                    <option value="Thu nhập">Thu nhập</option>
                                </select>
                            </label>

                            <div className="space-y-3 text-sm font-medium text-slate-700">
                                <span>Biểu tượng hiển thị</span>
                                <button
                                    type="button"
                                    onClick={() => setIsIconPickerOpen(true)}
                                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-400 hover:bg-sky-50"
                                >
                                    <span className="flex items-center gap-3 text-slate-900">
                                        <IconPreview iconId={formState.iconId} className="h-10 w-10" />
                                        <span>{CATEGORY_ICON_MAP[formState.iconId]?.label ?? 'Chưa chọn'}</span>
                                    </span>
                                    <span className="text-sm font-semibold text-sky-500">Thay đổi</span>
                                </button>
                            </div>

                            {formError && (
                                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{formError}</p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="rounded-full px-5 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
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
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 px-4 pb-10 pt-16 sm:items-center">
                    <div className="flex w-full max-w-2xl flex-col gap-4 rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Biểu tượng</p>
                                <h3 className="text-lg font-semibold text-slate-900">Chọn biểu tượng phù hợp</h3>
                                <p className="text-sm text-slate-500">
                                    Sắp xếp theo nhóm nội dung phổ biến để bạn chọn nhanh hơn.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsIconPickerOpen(false)}
                                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                            >
                                <RiCloseLine className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
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

                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                            {CATEGORY_ICON_GROUPS.find((group) => group.id === activeIconGroup)?.icons.map(
                                (icon) => {
                                    const IconComponent = icon.icon
                                    const isSelected = formState.iconId === icon.id
                                    return (
                                        <button
                                            key={icon.id}
                                            type="button"
                                            onClick={() => handleIconSelect(icon)}
                                            className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-xs font-medium transition ${isSelected
                                                ? 'border-sky-400 bg-sky-50 text-sky-600'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span
                                                className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${isSelected ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                                                    }`}
                                            >
                                                <IconComponent />
                                            </span>
                                            <span className="text-center leading-tight">{icon.label}</span>
                                        </button>
                                    )
                                }
                            )}
                        </div>
                    </div>
                </div>
            )}
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
            <section className="rounded-3xl bg-white/5 p-6 text-sm text-slate-300 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-1 text-slate-400">{description}</p>
                <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-slate-300">
                    Chưa có danh mục nào. Hãy tạo mới để dễ dàng theo dõi.
                </p>
            </section>
        )
    }

    return (
        <section className="rounded-3xl bg-white/10 p-6 shadow-xl backdrop-blur">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="text-sm text-slate-300">{description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
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

    return (
        <div className="flex flex-col gap-4 rounded-3xl bg-white/10 p-4 shadow-lg transition hover:bg-white/15">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg text-white">
                        {IconComponent ? <IconComponent /> : category.name[0]?.toUpperCase()}
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-white">{category.name}</p>
                        <p className="text-xs uppercase tracking-wider text-slate-300">{category.type}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="rounded-full bg-white/10 p-2 text-sm text-slate-200 transition hover:bg-white/20"
                        aria-label={`Chỉnh sửa ${category.name}`}
                    >
                        <RiEdit2Line className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-full bg-rose-500/10 p-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
                        aria-label={`Xoá ${category.name}`}
                    >
                        <RiDeleteBin6Line className="h-4 w-4" />
                    </button>
                </div>
            </div>
            {iconOption?.label && (
                <p className="rounded-2xl bg-white/10 px-3 py-2 text-xs text-slate-200">
                    Biểu tượng: {iconOption.label}
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


