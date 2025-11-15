import React, { useEffect, useState } from 'react'
import { FaSearch, FaArrowLeft } from 'react-icons/fa'
import { CATEGORY_ICON_GROUPS } from '../../constants/categoryIcons'
import { getCachedIconLibrary } from '../../utils/iconLoader'
import { fetchIcons } from '../../lib/iconService'

type IconPickerProps = {
    isOpen: boolean
    onClose: () => void
    onSelect: (iconId: string) => void
    selectedIconId?: string
    usedIconIds?: Set<string>
}

type IconItem = {
    id: string
    label: string
    groupId: string
    iconNode: React.ReactNode | null
    isUsed?: boolean
}

export const IconPicker: React.FC<IconPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedIconId,
    usedIconIds = new Set(),
}: IconPickerProps) => {
    const [activeIconGroup, setActiveIconGroup] = useState<string>('all')
    const [iconSearchTerm, setIconSearchTerm] = useState('')
    const [allIcons, setAllIcons] = useState<IconItem[]>([])
    const [isLoadingIcons, setIsLoadingIcons] = useState(false)

    // Load all icons when modal opens
    useEffect(() => {
        if (isOpen) {
            const loadAllIcons = async () => {
                setIsLoadingIcons(true)
                try {
                    // Preload all icon libraries
                    const libraries = ['fa', 'bs', 'lu', 'hi2', 'md']
                    await Promise.all(
                        libraries.map((lib) => getCachedIconLibrary(lib))
                    )

                    // Fetch all icons from database
                    const dbIconsData = await fetchIcons({ is_active: true })

                    // Combine hardcoded icons and database icons
                    const combinedIcons: IconItem[] = []

                    // Add hardcoded icons
                    CATEGORY_ICON_GROUPS.forEach((group) => {
                        group.icons.forEach((icon) => {
                            const IconComponent = icon.icon
                            combinedIcons.push({
                                id: icon.id,
                                label: icon.label,
                                groupId: group.id,
                                iconNode: React.createElement(IconComponent, {
                                    className: 'h-6 w-6',
                                }),
                                isUsed: usedIconIds.has(icon.id),
                            })
                        })
                    })

                    // Add database icons (avoid duplicates)
                    const hardcodedIds = new Set(combinedIcons.map((i) => i.id))
                    for (const dbIcon of dbIconsData) {
                        if (!hardcodedIds.has(dbIcon.name)) {
                            let iconNode: React.ReactNode = null
                            try {
                                if (
                                    dbIcon.icon_type === 'react-icon' &&
                                    dbIcon.react_icon_name &&
                                    dbIcon.react_icon_library
                                ) {
                                    const library = await getCachedIconLibrary(
                                        dbIcon.react_icon_library
                                    )
                                    if (
                                        library &&
                                        library[dbIcon.react_icon_name]
                                    ) {
                                        const IconComponent =
                                            library[dbIcon.react_icon_name]
                                        iconNode = React.createElement(
                                            IconComponent,
                                            { className: 'h-6 w-6' }
                                        )
                                    }
                                } else if (dbIcon.image_url) {
                                    iconNode = (
                                        <img
                                            src={dbIcon.image_url}
                                            alt={dbIcon.label}
                                            className="h-6 w-6 object-contain"
                                        />
                                    )
                                }
                            } catch (error) {
                                console.error(
                                    'Error loading icon:',
                                    dbIcon.name,
                                    error
                                )
                            }

                            combinedIcons.push({
                                id: dbIcon.name,
                                label: dbIcon.label,
                                groupId: dbIcon.group_id,
                                iconNode,
                                isUsed: usedIconIds.has(dbIcon.name),
                            })
                        }
                    }

                    // Sort: used icons first, then by group, then by label
                    combinedIcons.sort((a, b) => {
                        if (a.isUsed !== b.isUsed) {
                            return a.isUsed ? -1 : 1
                        }
                        if (a.groupId !== b.groupId) {
                            return a.groupId.localeCompare(b.groupId)
                        }
                        return a.label.localeCompare(b.label)
                    })

                    setAllIcons(combinedIcons)
                } catch (error) {
                    console.error('Error loading icons:', error)
                } finally {
                    setIsLoadingIcons(false)
                }
            }
            loadAllIcons()
        } else {
            // Reset when closing
            setIconSearchTerm('')
            setActiveIconGroup('all')
        }
    }, [isOpen, usedIconIds])

    const handleIconSelect = (iconId: string) => {
        onSelect(iconId)
        onClose()
        setIconSearchTerm('')
    }

    const filteredIcons = allIcons.filter((icon) => {
        // Filter by group
        if (activeIconGroup !== 'all' && icon.groupId !== activeIconGroup) {
            return false
        }
        // Filter by search term
        if (iconSearchTerm) {
            const searchLower = iconSearchTerm.toLowerCase()
            return (
                icon.label.toLowerCase().includes(searchLower) ||
                icon.id.toLowerCase().includes(searchLower)
            )
        }
        return true
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
            {/* Header - Giống HeaderBar */}
            <header className="pointer-events-none relative z-10 flex-shrink-0 bg-[#F7F9FC]">
                <div className="relative px-1 py-1">
                    <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100"
                            aria-label="Đóng"
                        >
                            <FaArrowLeft className="h-5 w-5" />
                        </button>
                        <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
                            Chọn biểu tượng
                        </p>
                        <div className="flex h-11 w-11 items-center justify-center text-slate-500">
                            {/* Empty space để cân bằng layout */}
                        </div>
                    </div>
                </div>
            </header>

            {/* Search Bar */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={iconSearchTerm}
                        onChange={(e) => setIconSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm biểu tượng..."
                        className="w-full rounded-lg border-2 border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Group Filter Tabs */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveIconGroup('all')}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            activeIconGroup === 'all'
                                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả
                    </button>
                    {CATEGORY_ICON_GROUPS.map((group) => {
                        const isActive = activeIconGroup === group.id
                        return (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => setActiveIconGroup(group.id)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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

            {/* Icons Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 min-h-0">
                {isLoadingIcons ? (
                    <div className="flex items-center justify-center py-12">
                        <span className="text-sm text-slate-500">
                            Đang tải biểu tượng...
                        </span>
                    </div>
                ) : filteredIcons.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <span className="text-sm text-slate-500">
                            Không tìm thấy biểu tượng
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-8 gap-2">
                        {filteredIcons.map((icon) => {
                            const isSelected = selectedIconId === icon.id
                            return (
                                <button
                                    key={icon.id}
                                    type="button"
                                    onClick={() => handleIconSelect(icon.id)}
                                    className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all active:scale-95 ${
                                        isSelected
                                            ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/20'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                    title={icon.label}
                                >
                                    {icon.iconNode || (
                                        <span className="text-lg text-slate-400">
                                            ?
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

