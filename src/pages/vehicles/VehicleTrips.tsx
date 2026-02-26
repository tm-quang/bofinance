import { useState, useEffect, useMemo } from 'react'
import {
    Route, Plus, MapPin, Calendar, Trash2, Edit, Car, Bike,
    ChevronDown, Clock, Navigation, TrendingUp, BarChart3,
    Zap, Fuel, X, ArrowRight, CheckCircle, Filter,
    ChevronLeft, ChevronRight, Gauge, FileText, Tag, Save,
    Timer, PlayCircle, Flag, CheckCircle2
} from 'lucide-react'
import { createTrip, updateTrip, deleteTrip, type VehicleRecord, type TripRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleTrips, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SimpleLocationInput, type SimpleLocationData } from '../../components/vehicles/SimpleLocationInput'
import { TripGPSDisplay, getTripCleanNotes } from '../../components/vehicles/TripGPSDisplay'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'

// ─── Trip Type Config ─────────────────────────────────────────────────────────
const TRIP_TYPES = {
    work: { label: 'Đi làm', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    business: { label: 'Công tác', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    service: { label: 'Dịch vụ', color: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
    leisure: { label: 'Đi chơi', color: 'green', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    hometown: { label: 'Về quê', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    other: { label: 'Khác', color: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
} as const

type TripTypeKey = keyof typeof TRIP_TYPES

// ─── Trip Status Metadata (stored in notes field) ────────────────────────────
// Format: [TRIPMETA:key=value,key2=value2]
const META_RE = /^\[TRIPMETA:([^\]]+)\]\n?/

function parseMeta(notes?: string): Record<string, string> {
    if (!notes) return {}
    const m = notes.match(META_RE)
    if (!m) return {}
    return Object.fromEntries(m[1].split(',').map(e => {
        const i = e.indexOf('=')
        return [e.slice(0, i), e.slice(i + 1)]
    }))
}

function buildMeta(meta: Record<string, string>): string {
    return `[TRIPMETA:${Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(',')}]`
}

function stripMeta(notes?: string): string {
    return (notes ?? '').replace(META_RE, '').trim()
}

function isInProgress(trip: TripRecord): boolean {
    return parseMeta(trip.notes).status === 'in_progress'
}

function getTripDuration(trip: TripRecord): { startedAt: Date | null; completedAt: Date | null; mins: number | null } {
    const m = parseMeta(trip.notes)
    const startedAt = m.started_at ? new Date(m.started_at) : null
    const completedAt = m.completed_at ? new Date(m.completed_at) : null
    const mins = startedAt && completedAt
        ? Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)
        : null
    return { startedAt, completedAt, mins }
}

function fmtDur(mins: number): string {
    if (mins < 60) return `${mins} phút`
    const h = Math.floor(mins / 60), m = mins % 60
    return m > 0 ? `${h}g ${m}ph` : `${h} giờ`
}

function fmtTime(d: Date): string {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// ─── Vehicle Type Icon ────────────────────────────────────────────────────────
function VehicleIcon({ fuelType, className }: { fuelType?: string; className?: string }) {
    if (fuelType === 'electric') return <Zap className={className} />
    return <Fuel className={className} />
}

function VehicleBodyIcon({ vehicleType, className }: { vehicleType?: string; className?: string }) {
    if (vehicleType === 'motorcycle') return <Bike className={className} />
    return <Car className={className} />
}

// ─── Vehicle Selector Card ────────────────────────────────────────────────────
function VehicleSelector({
    vehicles,
    selectedId,
    onSelect,
}: {
    vehicles: VehicleRecord[]
    selectedId: string
    onSelect: (id: string) => void
}) {
    const [open, setOpen] = useState(false)
    const selected = vehicles.find(v => v.id === selectedId)

    if (vehicles.length === 0) return null

    // Safe helpers with fallback for undefined vehicle
    const getElectric = (v?: VehicleRecord) => v?.fuel_type === 'electric'
    const getMoto = (v?: VehicleRecord) => v?.vehicle_type === 'motorcycle'
    const selElectric = getElectric(selected)
    const selMoto = getMoto(selected)

    return (
        <div className="relative mb-4">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm border border-slate-100 transition-all hover:shadow-md"
            >
                {/* Vehicle avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selElectric ? 'bg-green-100' : selMoto ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    <VehicleBodyIcon vehicleType={selected?.vehicle_type} className={`h-5 w-5 ${selElectric ? 'text-green-600' : selMoto ? 'text-orange-600' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{selected?.license_plate ?? 'Chọn xe...'}</p>
                    <p className="text-xs text-slate-500 truncate">
                        {selected ? `${selected.brand ?? ''} ${selected.model} · ${selected.year ?? ''}`.trim() : 'Không có xe nào'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${selElectric ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        <VehicleIcon fuelType={selected?.fuel_type} className="h-3 w-3" />
                        {selElectric ? 'Điện' : selected?.fuel_type === 'diesel' ? 'Dầu' : 'Xăng'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
                    {vehicles.map(v => {
                        const vElectric = getElectric(v)
                        const vMoto = getMoto(v)
                        return (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => { onSelect(v.id); setOpen(false) }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${v.id === selectedId ? 'bg-blue-50' : ''}`}
                            >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${vElectric ? 'bg-green-100' : vMoto ? 'bg-orange-100' : 'bg-blue-100'}`}>
                                    <VehicleBodyIcon vehicleType={v.vehicle_type} className={`h-4 w-4 ${vElectric ? 'text-green-600' : vMoto ? 'text-orange-600' : 'text-blue-600'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{v.license_plate}</p>
                                    <p className="text-xs text-slate-400 truncate">{v.brand} {v.model}</p>
                                </div>
                                {v.id === selectedId && <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />}
                                {v.is_default && v.id !== selectedId && (
                                    <span className="text-[10px] rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 font-semibold">Mặc định</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatsCard({ vehicle, trips }: { vehicle: VehicleRecord; trips: TripRecord[] }) {
    const totalDistance = trips.reduce((s, t) => s + (t.distance_km || 0), 0)
    const thisMonth = new Date()
    const monthTrips = trips.filter(t => {
        const d = new Date(t.trip_date)
        return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    })
    const monthDist = monthTrips.reduce((s, t) => s + (t.distance_km || 0), 0)
    const isElectric = vehicle.fuel_type === 'electric'
    const isMoto = vehicle.vehicle_type === 'motorcycle'

    const accent = isElectric ? 'bg-green-500 shadow-green-200' : isMoto ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'

    return (
        <div className={`mb-4 rounded-2xl ${accent} p-4 text-white shadow-lg`}>
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-white/20 p-1.5">
                        <Route className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold opacity-90">Lộ trình di chuyển</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <VehicleBodyIcon vehicleType={vehicle.vehicle_type} className="h-4 w-4 opacity-80" />
                    <span className="text-xs opacity-75">{vehicle.license_plate}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/15 p-2.5 text-center">
                    <p className="text-xl font-black">{trips.length}</p>
                    <p className="text-[10px] opacity-75 leading-tight">Tổng<br />chuyến</p>
                </div>
                <div className="rounded-xl bg-white/15 p-2.5 text-center">
                    <p className="text-xl font-black">{totalDistance.toLocaleString()}</p>
                    <p className="text-[10px] opacity-75 leading-tight">Tổng km<br />đã đi</p>
                </div>
                <div className="rounded-xl bg-white/15 p-2.5 text-center">
                    <p className="text-xl font-black">{monthDist.toLocaleString()}</p>
                    <p className="text-[10px] opacity-75 leading-tight">Km<br />tháng này</p>
                </div>
            </div>

            {/* Odometer row */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 opacity-75" />
                    <span className="text-xs opacity-75">Odometer hiện tại</span>
                </div>
                <span className="text-sm font-bold">{vehicle.current_odometer.toLocaleString()} km</span>
            </div>
        </div>
    )
}

// ─── Trip Card ────────────────────────────────────────────────────────────────────
function TripCard({
    trip,
    vehicleType,
    onEdit,
    onDelete,
    onComplete,
}: {
    trip: TripRecord
    vehicleType?: string
    onEdit: (trip: TripRecord) => void
    onDelete: (id: string) => void
    onComplete: (trip: TripRecord) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const typeConfig = TRIP_TYPES[trip.trip_type as TripTypeKey] ?? TRIP_TYPES.other
    const inProgress = isInProgress(trip)
    const { startedAt, completedAt, mins } = getTripDuration(trip)
    const userNotes = getTripCleanNotes(stripMeta(trip.notes))
    const hasExtra = !!(userNotes || trip.notes)

    const isMoto = vehicleType === 'motorcycle'
    const accentColor = inProgress
        ? 'border-l-amber-400'
        : isMoto ? 'border-l-orange-400' : 'border-l-blue-400'

    return (
        <div className={`overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 border-l-4 ${accentColor} transition-all hover:shadow-md`}>
            {/* In-progress banner */}
            {inProgress && (
                <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-4 py-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-700">Đang di chuyển</span>
                    {startedAt && (
                        <span className="ml-auto text-xs text-amber-600">
                            <Timer className="h-3 w-3 inline mr-0.5" />
                            Bắt đầu lúc {fmtTime(startedAt)}
                        </span>
                    )}
                </div>
            )}

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${typeConfig.bg} ${typeConfig.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${typeConfig.dot}`} />
                                {typeConfig.label}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(trip.trip_date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                {trip.trip_time && (
                                    <span className="flex items-center gap-0.5 ml-0.5">
                                        <Clock className="h-3 w-3" />
                                        {trip.trip_time.slice(0, 5)}
                                    </span>
                                )}
                            </span>
                        </div>

                        {(trip.start_location || trip.end_location) && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                                <MapPin className="h-3 w-3 text-green-500 shrink-0" />
                                <span className="truncate max-w-[90px]">{trip.start_location || '?'}</span>
                                <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                                <MapPin className="h-3 w-3 text-red-400 shrink-0" />
                                <span className="truncate max-w-[90px]">{trip.end_location || (inProgress ? '...' : '?')}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-1 ml-2 shrink-0">
                        {inProgress ? (
                            <button
                                onClick={() => onComplete(trip)}
                                className="flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
                            >
                                <Flag className="h-3.5 w-3.5" />
                                Hoàn tất
                            </button>
                        ) : (
                            <button onClick={() => onEdit(trip)} className="rounded-xl p-1.5 text-blue-500 hover:bg-blue-50 transition-colors">
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                        <button onClick={() => onDelete(trip.id)} className="rounded-xl p-1.5 text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Distance / status row */}
                {inProgress ? (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                        <Navigation className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs text-amber-700">
                            Odo bắt đầu: <span className="font-bold">{trip.start_km.toLocaleString()} km</span>
                        </span>
                        <span className="ml-auto text-xs text-amber-500">Odo kết thúc chưa cập nhật</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Navigation className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">{trip.start_km.toLocaleString()}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-semibold text-slate-700">{trip.end_km.toLocaleString()}</span>
                            <span>km</span>
                        </div>
                        <span className={`text-base font-black ${isMoto ? 'text-orange-600' : 'text-blue-600'}`}>
                            {(trip.distance_km || (trip.end_km - trip.start_km)).toLocaleString()} km
                        </span>
                    </div>
                )}

                {/* Duration row (completed trips with metadata) */}
                {!inProgress && mins !== null && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <div className="flex flex-1 items-center gap-3 text-xs text-emerald-700">
                            {startedAt && <span><Clock className="h-3 w-3 inline mr-0.5" />{fmtTime(startedAt)}</span>}
                            {completedAt && <><ArrowRight className="h-3 w-3 text-emerald-300" /><span><Flag className="h-3 w-3 inline mr-0.5" />{fmtTime(completedAt)}</span></>}
                        </div>
                        <span className="text-xs font-bold text-emerald-700">
                            <Timer className="h-3 w-3 inline mr-0.5" />
                            {fmtDur(mins)}
                        </span>
                    </div>
                )}

                {/* Expand toggle */}
                {hasExtra && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        {expanded ? 'Ẩn bớt' : 'Xem chi tiết'}
                    </button>
                )}

                {expanded && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {trip.notes && <TripGPSDisplay notes={stripMeta(trip.notes)} />}
                        {userNotes && (
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                <span className="font-semibold">Ghi chú: </span>{userNotes}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VehicleTrips() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()

    const { data: vehicles = [] } = useVehicles()
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showStartModal, setShowStartModal] = useState(false)
    const [editingTrip, setEditingTrip] = useState<TripRecord | null>(null)
    const [completingTrip, setCompletingTrip] = useState<TripRecord | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [filterType, setFilterType] = useState<TripTypeKey | 'all'>('all')
    const [periodOffset, setPeriodOffset] = useState(0) // 0 = this month
    const [showFilter, setShowFilter] = useState(false)

    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicleId) {
            const def = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedVehicleId(def.id)
        }
    }, [vehicles, selectedVehicleId])

    const { data: allTrips = [], isLoading: loading } = useVehicleTrips(selectedVehicleId || undefined)
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

    // ── Period Filter ──────────────────────────────────────────────────────
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1)
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59)
    const periodLabel = periodOffset === 0
        ? 'Tháng này'
        : periodStart.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

    // ── Combined Filter ────────────────────────────────────────────────────
    const trips = useMemo(() => {
        return allTrips.filter(t => {
            const d = new Date(t.trip_date)
            const inPeriod = d >= periodStart && d <= periodEnd
            const typeMatch = filterType === 'all' || t.trip_type === filterType
            return inPeriod && typeMatch
        })
    }, [allTrips, periodOffset, filterType])

    // ── Group by date ──────────────────────────────────────────────────────
    const groupedByDate = useMemo(() => {
        const map: Record<string, TripRecord[]> = {}
        trips.forEach(t => {
            if (!map[t.trip_date]) map[t.trip_date] = []
            map[t.trip_date].push(t)
        })
        return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
    }, [trips])

    const handleDelete = async () => {
        if (!deleteConfirmId) return
        setDeleting(true)
        try {
            await deleteTrip(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId) })
            success('Đã xóa lộ trình thành công!')
            setDeleteConfirmId(null)
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể xóa')
        } finally {
            setDeleting(false)
        }
    }

    const todayKey = new Date().toISOString().split('T')[0]
    const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    function dayLabel(key: string) {
        if (key === todayKey) return 'Hôm nay'
        if (key === yesterdayKey) return 'Hôm qua'
        return new Date(key).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
    }

    const isElectric = selectedVehicle?.fuel_type === 'electric'
    const isMoto = selectedVehicle?.vehicle_type === 'motorcycle'
    const accentClass = isElectric
        ? 'from-green-500 to-green-600'
        : isMoto
            ? 'from-orange-500 to-amber-500'
            : 'from-blue-600 to-indigo-600'

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Quản Lý Lộ Trình" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-4">

                {/* ── Vehicle Selector ─────────────────────────────────── */}
                <VehicleSelector
                    vehicles={vehicles}
                    selectedId={selectedVehicleId}
                    onSelect={setSelectedVehicleId}
                />

                {/* ── Stats Card ───────────────────────────────────────── */}
                {selectedVehicle && !loading && (
                    <StatsCard vehicle={selectedVehicle} trips={allTrips} />
                )}

                {/* ── Action Buttons ────────────────────────────────────────── */}
                <div className="mb-4 grid grid-cols-2 gap-2.5">
                    <button
                        onClick={() => setShowStartModal(true)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3.5 font-bold text-white shadow-lg shadow-amber-200 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <PlayCircle className="h-5 w-5" />
                        Bắt đầu
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${accentClass} px-4 py-3.5 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95`}
                    >
                        <Plus className="h-5 w-5" />
                        Thêm đầy đủ
                    </button>
                </div>

                {/* ── Period + Filter Bar ──────────────────────────────── */}
                <div className="mb-3 space-y-2">
                    {/* Month navigator */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPeriodOffset(o => o - 1)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
                            <p className="text-sm font-bold text-slate-700">{periodLabel}</p>
                        </div>
                        <button
                            onClick={() => setPeriodOffset(o => Math.min(0, o + 1))}
                            disabled={periodOffset >= 0}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`rounded-xl border p-1.5 transition-all ${showFilter ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-400'}`}
                        >
                            <Filter className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Trip type filter chips */}
                    {showFilter && (
                        <div className="flex gap-1.5 flex-wrap">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${filterType === 'all' ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                            >
                                Tất cả
                            </button>
                            {(Object.entries(TRIP_TYPES) as [TripTypeKey, typeof TRIP_TYPES[TripTypeKey]][]).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterType(key)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${filterType === key ? `${cfg.dot} text-white` : `${cfg.bg} ${cfg.text}`}`}
                                >
                                    {cfg.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Period summary row */}
                    {trips.length > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-white border border-slate-100 px-3 py-2 shadow-sm">
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span><span className="font-bold text-slate-700">{trips.length}</span> chuyến</span>
                                <span>·</span>
                                <span><span className="font-bold text-slate-700">{trips.reduce((s, t) => s + (t.distance_km || 0), 0).toLocaleString()}</span> km</span>
                            </div>
                            <BarChart3 className="h-4 w-4 text-slate-300" />
                        </div>
                    )}
                </div>

                {/* ── Trip List ────────────────────────────────────────── */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                                <div className="mb-3 flex gap-2">
                                    <div className="h-5 w-16 rounded-full bg-slate-200" />
                                    <div className="h-5 w-24 rounded-full bg-slate-100" />
                                </div>
                                <div className="h-10 w-full rounded-xl bg-slate-50" />
                            </div>
                        ))}
                    </div>
                ) : trips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className={`mb-4 rounded-3xl p-6 ${isMoto ? 'bg-orange-50' : isElectric ? 'bg-green-50' : 'bg-blue-50'}`}>
                            <Route className={`h-14 w-14 ${isMoto ? 'text-orange-300' : isElectric ? 'text-green-300' : 'text-blue-300'}`} />
                        </div>
                        <p className="font-semibold text-slate-600">Chưa có lộ trình nào</p>
                        <p className="mt-1 text-sm text-slate-400">
                            {filterType !== 'all'
                                ? `Không có lộ trình "${TRIP_TYPES[filterType].label}" trong tháng này`
                                : 'Bắt đầu ghi lại lộ trình của bạn'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {groupedByDate.map(([dateKey, dayTrips]) => {
                            const dayDistance = dayTrips.reduce((s, t) => s + (t.distance_km || 0), 0)
                            return (
                                <div key={dateKey}>
                                    {/* Date separator */}
                                    <div className="mb-2 flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${isMoto ? 'bg-orange-400' : isElectric ? 'bg-green-400' : 'bg-blue-400'}`} />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                {dayLabel(dateKey)}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400">
                                            {dayDistance.toLocaleString()} km · {dayTrips.length} chuyến
                                        </span>
                                    </div>
                                    <div className={`space-y-2 pl-4 border-l-2 ${isMoto ? 'border-orange-100' : isElectric ? 'border-green-100' : 'border-blue-100'}`}>
                                        {dayTrips.map(trip => (
                                            <TripCard
                                                key={trip.id}
                                                trip={trip}
                                                vehicleType={selectedVehicle?.vehicle_type}
                                                onEdit={setEditingTrip}
                                                onDelete={setDeleteConfirmId}
                                                onComplete={setCompletingTrip}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Footer Nav */}
            <VehicleFooterNav
                onAddClick={() => setShowStartModal(true)}
                addLabel="Bắt đầu lộ trình"
            />

            {/* Add / Edit Modal */}
            {(showAddModal || editingTrip) && selectedVehicle && (
                <TripModal
                    vehicle={selectedVehicle}
                    editingTrip={editingTrip}
                    onClose={() => { setShowAddModal(false); setEditingTrip(null) }}
                    onSuccess={() => {
                        setShowAddModal(false)
                        setEditingTrip(null)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId) })
                    }}
                />
            )}

            {/* Start Trip Modal */}
            {showStartModal && selectedVehicle && (
                <StartTripModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowStartModal(false)}
                    onSuccess={() => {
                        setShowStartModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId) })
                    }}
                />
            )}

            {/* Complete Trip Modal */}
            {completingTrip && selectedVehicle && (
                <CompleteTripModal
                    vehicle={selectedVehicle}
                    trip={completingTrip}
                    onClose={() => setCompletingTrip(null)}
                    onSuccess={() => {
                        setCompletingTrip(null)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId) })
                    }}
                />
            )}

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Xác nhận xóa lộ trình"
                message="Bạn có chắc muốn xóa lộ trình này? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                isLoading={deleting}
            />
        </div>
    )
}

// ─── Add / Edit Trip Modal ────────────────────────────────────────────────────
function TripModal({
    vehicle,
    editingTrip,
    onClose,
    onSuccess,
}: {
    vehicle: VehicleRecord
    editingTrip?: TripRecord | null
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const isEdit = !!editingTrip

    const [formData, setFormData] = useState({
        vehicle_id: vehicle.id,
        trip_date: editingTrip?.trip_date ?? new Date().toISOString().split('T')[0],
        trip_time: editingTrip?.trip_time ?? new Date().toTimeString().slice(0, 5),
        trip_type: (editingTrip?.trip_type ?? 'work') as TripTypeKey,
        start_km: editingTrip?.start_km?.toString() ?? vehicle.current_odometer.toString(),
        end_km: editingTrip?.end_km?.toString() ?? '',
        start_location: editingTrip?.start_location ?? '',
        end_location: editingTrip?.end_location ?? '',
        notes: editingTrip ? getTripCleanNotes(editingTrip.notes ?? '') : '',
    })

    const [startLocationData, setStartLocationData] = useState<SimpleLocationData | null>(null)
    const [endLocationData, setEndLocationData] = useState<SimpleLocationData | null>(null)

    const calcDist = Number(formData.end_km) - Number(formData.start_km)
    const validDist = Number(formData.start_km) > 0 && Number(formData.end_km) > Number(formData.start_km)

    const isElectric = vehicle.fuel_type === 'electric'
    const isMoto = vehicle.vehicle_type === 'motorcycle'
    const accentBg = isElectric ? 'bg-green-500' : isMoto ? 'bg-orange-500' : 'bg-blue-600'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (Number(formData.end_km) < Number(formData.start_km)) {
            showError('Odo kết thúc phải lớn hơn odo bắt đầu')
            return
        }
        setLoading(true)
        try {
            const tripData: any = { ...formData, start_km: Number(formData.start_km), end_km: Number(formData.end_km) }

            // Append GPS coordinates to notes
            if (startLocationData || endLocationData) {
                const gpsLines: string[] = []
                if (startLocationData) {
                    gpsLines.push(`[Start] ${startLocationData.lat.toFixed(6)}, ${startLocationData.lng.toFixed(6)}`)
                    gpsLines.push(`https://www.google.com/maps?q=${startLocationData.lat},${startLocationData.lng}`)
                }
                if (endLocationData) {
                    gpsLines.push(`[End] ${endLocationData.lat.toFixed(6)}, ${endLocationData.lng.toFixed(6)}`)
                    gpsLines.push(`https://www.google.com/maps?q=${endLocationData.lat},${endLocationData.lng}`)
                }
                tripData.notes = [formData.notes, ...gpsLines].filter(Boolean).join('\n')
            }

            if (isEdit && editingTrip) {
                await updateTrip(editingTrip.id, tripData)
                success('Đã cập nhật lộ trình!')
            } else {
                await createTrip(tripData)
                success('Đã thêm lộ trình mới!')
            }
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể lưu lộ trình')
        } finally {
            setLoading(false)
        }
    }

    const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all'
    const labelCls = 'mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide'

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[3px]">
            <div className="w-full rounded-t-3xl bg-white shadow-2xl max-h-[92vh] flex flex-col">
                {/* Modal Header */}
                <div className={`${accentBg} rounded-t-3xl px-5 pt-5 pb-4 text-white`}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5">
                                <Route className="h-4 w-4" />
                            </div>
                            <h3 className="text-base font-bold">
                                {isEdit ? 'Chỉnh sửa lộ trình' : 'Thêm lộ trình mới'}
                            </h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs opacity-75 ml-10">{vehicle.license_plate} · {vehicle.brand} {vehicle.model}</p>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <form id="trip-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Date + Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>
                                    <Calendar className="h-3.5 w-3.5" /> Ngày
                                </label>
                                <input type="date" required value={formData.trip_date}
                                    onChange={e => setFormData({ ...formData, trip_date: e.target.value })}
                                    className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    <Clock className="h-3.5 w-3.5" /> Giờ
                                </label>
                                <input type="time" value={formData.trip_time}
                                    onChange={e => setFormData({ ...formData, trip_time: e.target.value })}
                                    className={inputCls} />
                            </div>
                        </div>

                        {/* Trip Type */}
                        <div>
                            <label className={labelCls}>
                                <Tag className="h-3.5 w-3.5" /> Loại lộ trình
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {(Object.entries(TRIP_TYPES) as [TripTypeKey, typeof TRIP_TYPES[TripTypeKey]][]).map(([key, cfg]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, trip_type: key })}
                                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${formData.trip_type === key
                                            ? `${cfg.dot} text-white shadow-sm`
                                            : `${cfg.bg} ${cfg.text}`
                                            }`}
                                    >
                                        {cfg.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Odometer */}
                        <div>
                            <label className={labelCls}>
                                <Gauge className="h-3.5 w-3.5" /> Odometer (km)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Bắt đầu</p>
                                    <input type="number" required min={0} value={formData.start_km}
                                        onChange={e => setFormData({ ...formData, start_km: e.target.value })}
                                        placeholder="Odo đầu"
                                        className={inputCls} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Kết thúc</p>
                                    <input type="number" required min={0} value={formData.end_km}
                                        onChange={e => setFormData({ ...formData, end_km: e.target.value })}
                                        placeholder="Odo cuối"
                                        className={inputCls} />
                                </div>
                            </div>

                            {/* Distance preview */}
                            {validDist && (
                                <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2 ${isElectric ? 'bg-green-50 border border-green-200' : isMoto ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
                                    <span className={`text-xs font-medium ${isElectric ? 'text-green-700' : isMoto ? 'text-orange-700' : 'text-blue-700'}`}>
                                        Quãng đường di chuyển
                                    </span>
                                    <span className={`text-base font-black ${isElectric ? 'text-green-600' : isMoto ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {calcDist.toLocaleString()} km
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Locations */}
                        <div>
                            <label className={labelCls}>
                                <MapPin className="h-3.5 w-3.5" /> Địa điểm
                            </label>
                            <div className="space-y-2">
                                <SimpleLocationInput
                                    label="Điểm xuất phát"
                                    value={formData.start_location}
                                    locationData={startLocationData}
                                    onChange={(address, locationData) => {
                                        setFormData({ ...formData, start_location: address })
                                        setStartLocationData(locationData || null)
                                    }}
                                    placeholder="Địa điểm bắt đầu..."
                                />
                                <SimpleLocationInput
                                    label="Điểm đến"
                                    value={formData.end_location}
                                    locationData={endLocationData}
                                    onChange={(address, locationData) => {
                                        setFormData({ ...formData, end_location: address })
                                        setEndLocationData(locationData || null)
                                    }}
                                    placeholder="Địa điểm kết thúc..."
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className={labelCls}>
                                <FileText className="h-3.5 w-3.5" /> Ghi chú
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                placeholder="Ghi chú về chuyến đi, mục đích, chi phí khác..."
                                className={inputCls + ' resize-none'}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        form="trip-form"
                        disabled={loading}
                        className={`flex-[2] rounded-xl ${accentBg} py-3 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50 active:scale-95`}
                    >
                        {loading ? 'Đang lưu...' : isEdit ? (
                            <span className="flex items-center justify-center gap-1.5"><Save className="h-4 w-4" /> Cập nhật lộ trình</span>
                        ) : (
                            <span className="flex items-center justify-center gap-1.5"><Plus className="h-4 w-4" /> Thêm lộ trình</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Start Trip Modal ─────────────────────────────────────────────────────────
function StartTripModal({ vehicle, onClose, onSuccess }: {
    vehicle: VehicleRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [startLocData, setStartLocData] = useState<SimpleLocationData | null>(null)
    const now = new Date()
    const [form, setForm] = useState({
        trip_date: now.toISOString().split('T')[0],
        trip_time: now.toTimeString().slice(0, 5),
        trip_type: 'work' as TripTypeKey,
        start_km: vehicle.current_odometer.toString(),
        start_location: '',
        notes: '',
    })
    const isElectric = vehicle.fuel_type === 'electric'
    const isMoto = vehicle.vehicle_type === 'motorcycle'
    const accentBg = isElectric ? 'bg-green-500' : isMoto ? 'bg-orange-500' : 'bg-amber-500'
    const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all'
    const labelCls = 'mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide'

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const startedAt = new Date().toISOString()
            const metaStr = buildMeta({ status: 'in_progress', started_at: startedAt })
            const gpsNote = startLocData
                ? `\n[Start] ${startLocData.lat.toFixed(6)}, ${startLocData.lng.toFixed(6)}\nhttps://www.google.com/maps?q=${startLocData.lat},${startLocData.lng}`
                : ''
            const notes = `${metaStr}\n${form.notes}${gpsNote}`.trim()
            await createTrip({
                vehicle_id: vehicle.id,
                trip_date: form.trip_date,
                trip_time: form.trip_time,
                trip_type: form.trip_type as TripRecord['trip_type'],
                start_km: Number(form.start_km),
                end_km: Number(form.start_km),
                start_location: form.start_location,
                notes,
            })
            success('Đã bắt đầu lộ trình! Nhấn "Hoàn tất" khi đến nơi.')
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể tạo lộ trình')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[3px]">
            <div className="w-full rounded-t-3xl bg-white shadow-2xl max-h-[88vh] flex flex-col">
                <div className={`${accentBg} rounded-t-3xl px-5 pt-5 pb-4 text-white`}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5"><PlayCircle className="h-4 w-4" /></div>
                            <h3 className="text-base font-bold">Bắt đầu lộ trình</h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30"><X className="h-4 w-4" /></button>
                    </div>
                    <p className="text-xs opacity-75 ml-10">{vehicle.license_plate} · Lộ trình sẽ được lưu tạm</p>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <form id="start-trip-form" onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}><Calendar className="h-3.5 w-3.5" /> Ngày</label>
                                <input type="date" required value={form.trip_date}
                                    onChange={e => setForm({ ...form, trip_date: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}><Clock className="h-3.5 w-3.5" /> Giờ xuất phát</label>
                                <input type="time" value={form.trip_time}
                                    onChange={e => setForm({ ...form, trip_time: e.target.value })} className={inputCls} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}><Tag className="h-3.5 w-3.5" /> Loại lộ trình</label>
                            <div className="flex gap-2 flex-wrap">
                                {(Object.entries(TRIP_TYPES) as [TripTypeKey, typeof TRIP_TYPES[TripTypeKey]][]).map(([key, cfg]) => (
                                    <button key={key} type="button"
                                        onClick={() => setForm({ ...form, trip_type: key })}
                                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${form.trip_type === key ? `${cfg.dot} text-white` : `${cfg.bg} ${cfg.text}`}`}>
                                        {cfg.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}><Gauge className="h-3.5 w-3.5" /> Odo bắt đầu (km)</label>
                            <input type="number" required min={0} value={form.start_km}
                                onChange={e => setForm({ ...form, start_km: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}><MapPin className="h-3.5 w-3.5" /> Điểm xuất phát</label>
                            <SimpleLocationInput label="" value={form.start_location} locationData={startLocData}
                                onChange={(addr, loc) => { setForm({ ...form, start_location: addr }); setStartLocData(loc || null) }}
                                placeholder="Địa điểm bắt đầu..." />
                        </div>
                        <div>
                            <label className={labelCls}><FileText className="h-3.5 w-3.5" /> Ghi chú</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                rows={2} placeholder="Ghi chú..." className={inputCls + ' resize-none'} />
                        </div>
                    </form>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
                    <button type="submit" form="start-trip-form" disabled={loading}
                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-amber-600 disabled:opacity-50 active:scale-95 transition-all">
                        <PlayCircle className="h-4 w-4" />
                        {loading ? 'Đang lưu...' : 'Bắt đầu lộ trình'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Complete Trip Modal ──────────────────────────────────────────────────────
function CompleteTripModal({ vehicle: _vehicle, trip, onClose, onSuccess }: {
    vehicle: VehicleRecord
    trip: TripRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [endLocData, setEndLocData] = useState<SimpleLocationData | null>(null)
    const now = new Date()
    const { startedAt } = getTripDuration(trip)
    const elapsedMins = startedAt ? Math.round((now.getTime() - startedAt.getTime()) / 60000) : null
    const [form, setForm] = useState({
        end_km: '',
        end_location: '',
        notes: getTripCleanNotes(stripMeta(trip.notes)),
    })
    const calcDist = Number(form.end_km) - trip.start_km
    const validDist = Number(form.end_km) > trip.start_km
    const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all'
    const labelCls = 'mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide'

    const handleComplete = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validDist) { showError('Odo kết thúc phải lớn hơn odo bắt đầu'); return }
        setLoading(true)
        try {
            const completedAt = new Date().toISOString()
            const oldMeta = parseMeta(trip.notes)
            const newMeta = buildMeta({ ...oldMeta, status: 'completed', completed_at: completedAt })
            const gpsNote = endLocData
                ? `\n[End] ${endLocData.lat.toFixed(6)}, ${endLocData.lng.toFixed(6)}\nhttps://www.google.com/maps?q=${endLocData.lat},${endLocData.lng}`
                : ''
            const notes = `${newMeta}\n${form.notes}${gpsNote}`.trim()
            await updateTrip(trip.id, { end_km: Number(form.end_km), end_location: form.end_location, notes })
            success(`Lộ trình hoàn tất! ${calcDist.toLocaleString()} km${elapsedMins ? ' · ' + fmtDur(elapsedMins) : ''}`)
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể cập nhật')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[3px]">
            <div className="w-full rounded-t-3xl bg-white shadow-2xl max-h-[88vh] flex flex-col">
                <div className="bg-emerald-500 rounded-t-3xl px-5 pt-5 pb-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5"><Flag className="h-4 w-4" /></div>
                            <h3 className="text-base font-bold">Hoàn tất lộ trình</h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2 text-xs">
                        {startedAt && <span><Clock className="h-3 w-3 inline mr-0.5" />Xuất phát {fmtTime(startedAt)}</span>}
                        <ArrowRight className="h-3 w-3 opacity-60" />
                        <span><Flag className="h-3 w-3 inline mr-0.5" />Hiện tại {fmtTime(now)}</span>
                        {elapsedMins !== null && (
                            <span className="ml-auto font-bold"><Timer className="h-3 w-3 inline mr-0.5" />{fmtDur(elapsedMins)}</span>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Điểm xuất phát (đã lưu)</p>
                        <div className="flex gap-6 text-sm">
                            <div>
                                <p className="text-xs text-slate-400">Odo bắt đầu</p>
                                <p className="font-bold text-slate-700">{trip.start_km.toLocaleString()} km</p>
                            </div>
                            {trip.start_location && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-400">Địa điểm</p>
                                    <p className="font-bold text-slate-700 truncate">{trip.start_location}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <form id="complete-trip-form" onSubmit={handleComplete} className="space-y-4">
                        <div>
                            <label className={labelCls}><Gauge className="h-3.5 w-3.5" /> Odo kết thúc (km)</label>
                            <input type="number" required min={trip.start_km + 1} value={form.end_km}
                                onChange={e => setForm({ ...form, end_km: e.target.value })}
                                placeholder={`Lớn hơn ${trip.start_km.toLocaleString()}`} className={inputCls} />
                            {validDist && (
                                <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                                    <span className="text-xs font-medium text-emerald-700">Quãng đường di chuyển</span>
                                    <span className="text-base font-black text-emerald-600">{calcDist.toLocaleString()} km</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={labelCls}><MapPin className="h-3.5 w-3.5" /> Điểm đến</label>
                            <SimpleLocationInput label="" value={form.end_location} locationData={endLocData}
                                onChange={(addr, loc) => { setForm({ ...form, end_location: addr }); setEndLocData(loc || null) }}
                                placeholder="Địa điểm kết thúc..." />
                        </div>
                        <div>
                            <label className={labelCls}><FileText className="h-3.5 w-3.5" /> Ghi chú</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                rows={2} className={inputCls + ' resize-none'} />
                        </div>
                    </form>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
                    <button type="submit" form="complete-trip-form" disabled={loading}
                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all">
                        <CheckCircle2 className="h-4 w-4" />
                        {loading ? 'Đang lưu...' : 'Hoàn tất lộ trình'}
                    </button>
                </div>
            </div>
        </div>
    )
}
