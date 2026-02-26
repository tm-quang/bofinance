import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
    Plus, Calendar, Trash2, MapPin, Settings, Zap, Droplet,
    BatteryCharging, Activity, TrendingUp, Clock, ChevronDown, ChevronUp,
    Bolt, Gauge, Check, Gift, DollarSign, Image, Loader2,
    Fuel, CreditCard, ScanLine,
    ChevronLeft, ChevronRight
} from 'lucide-react'
import { createFuelLog, deleteFuelLog, type VehicleRecord, type FuelLogRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleFuel, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImageUpload } from '../../components/vehicles/ImageUpload'
import { FuelPriceSettings } from '../../components/vehicles/FuelPriceSettings'
import { getFuelPrice, type FuelType } from '../../lib/vehicles/fuelPriceService'
import { uploadToCloudinary } from '../../lib/cloudinaryService'
import { SimpleLocationInput, type SimpleLocationData } from '../../components/vehicles/SimpleLocationInput'
import { GPSInfoDisplay, getCleanNotes } from '../../components/vehicles/GPSInfoDisplay'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'
import { analyzeChargeReceipt, type ChargeReceiptData } from '../../lib/vehicles/chargeReceiptAnalyzer'

const FUEL_TYPES = {
    petrol_a95: { label: 'Xăng A95', color: 'gray', category: 'fuel' as const },
    petrol_e5: { label: 'Xăng E5', color: 'gray', category: 'fuel' as const },
    diesel: { label: 'Dầu Diesel', color: 'gray', category: 'fuel' as const },
    electric: { label: 'Điện', color: 'green', category: 'electric' as const },
}

// Charging location presets for quick input
const CHARGE_LOCATION_PRESETS = [
    { label: 'Trạm sạc Vinfast' },
    { label: 'Trạm sạc khác' },
]

// Quick amount presets (kWh) - reserved for future use
// const KWH_PRESETS = [10, 20, 30, 40, 50, 70]

type TabType = 'fuel' | 'electric'

// ── MAP: vehicle.fuel_type → tab + default fuel log type ──────────────────
const VEHICLE_FUEL_CONFIG: Record<string, {
    tab: TabType
    defaultFuelLogType: string
    label: string
    isElectric: boolean
}> = {
    electric: { tab: 'electric', defaultFuelLogType: 'electric', label: 'Xe điện', isElectric: true },
    petrol: { tab: 'fuel', defaultFuelLogType: 'petrol_a95', label: 'Xe xăng', isElectric: false },
    diesel: { tab: 'fuel', defaultFuelLogType: 'diesel', label: 'Xe dầu', isElectric: false },
    hybrid: { tab: 'fuel', defaultFuelLogType: 'petrol_a95', label: 'Xe hybrid', isElectric: false },
}

function getVehicleFuelConfig(vehicleFuelType?: string) {
    return VEHICLE_FUEL_CONFIG[vehicleFuelType ?? ''] ?? VEHICLE_FUEL_CONFIG.petrol
}

// =============================================
// ELECTRIC STATS CARD
// =============================================
function ElectricStatsCard({ logs }: { logs: FuelLogRecord[] }) {
    const totalKwh = logs.reduce((sum, log) => sum + (log.kwh || log.liters || 0), 0)
    const totalCost = logs.reduce((sum, log) => sum + (log.total_cost || log.total_amount || 0), 0)
    const avgPricePerKwh = totalKwh > 0 ? totalCost / totalKwh : 0
    const sessions = logs.length

    // Cost per session average
    const avgCostPerSession = sessions > 0 ? totalCost / sessions : 0

    // Monthly (current month) stats
    const thisMonth = new Date()
    const monthLogs = logs.filter(log => {
        const d = new Date(log.refuel_date)
        return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    })
    const monthKwh = monthLogs.reduce((sum, log) => sum + (log.kwh || log.liters || 0), 0)
    const monthCost = monthLogs.reduce((sum, log) => sum + (log.total_cost || log.total_amount || 0), 0)

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

    return (
        <div className="mb-4 space-y-3">
            {/* Main summary - solid green hero */}
            <div className="rounded-2xl bg-green-500 p-4 text-white shadow-lg shadow-green-200">
                <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-xl bg-white/20 p-1.5">
                        <BatteryCharging className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold opacity-90">Tổng quan sạc điện</span>
                    <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{sessions} lần sạc</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-2xl font-black">{totalKwh.toFixed(1)}</p>
                        <p className="text-xs opacity-75">kWh đã sạc</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black">{formatCurrency(totalCost)}</p>
                        <p className="text-xs opacity-75">Tổng chi phí</p>
                    </div>
                </div>
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
                    <div className="mb-1 rounded-lg bg-amber-100 p-1.5">
                        <Bolt className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                        {avgPricePerKwh > 0 ? `${Math.round(avgPricePerKwh).toLocaleString()}đ` : '--'}
                    </p>
                    <p className="text-center text-[10px] leading-tight text-slate-500">TB/kWh</p>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
                    <div className="mb-1 rounded-lg bg-blue-100 p-1.5">
                        <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                        {avgCostPerSession > 0 ? `${Math.round(avgCostPerSession / 1000)}k` : '--'}
                    </p>
                    <p className="text-center text-[10px] leading-tight text-slate-500">TB/lần sạc</p>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
                    <div className="mb-1 rounded-lg bg-green-100 p-1.5">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                        {monthKwh > 0 ? `${monthKwh.toFixed(0)} kWh` : '--'}
                    </p>
                    <p className="text-center text-[10px] leading-tight text-slate-500">Tháng này</p>
                </div>
            </div>

            {/* Month summary badge */}
            {monthCost > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Chi phí tháng này</span>
                    </div>
                    <span className="text-sm font-bold text-green-700">{formatCurrency(monthCost)}</span>
                </div>
            )}
        </div>
    )
}

// =============================================
// FUEL STATS CARD (simple)
// =============================================
function FuelStatsCard({ logs }: { logs: FuelLogRecord[] }) {
    const totalLiters = logs.reduce((sum, log) => sum + (log.liters || 0), 0)
    const totalCost = logs.reduce((sum, log) => sum + (log.total_cost || log.total_amount || 0), 0)
    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

    return (
        <div className="mb-4 rounded-2xl bg-slate-600 p-4 text-white shadow-lg shadow-slate-200">
            <div className="mb-3 flex items-center gap-2">
                <Droplet className="h-4 w-4" />
                <span className="text-sm font-semibold opacity-90">Tổng quan xăng/dầu</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-2xl font-black">{totalLiters.toFixed(1)}</p>
                    <p className="text-xs opacity-75">Lít đã đổ</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black">{formatCurrency(totalCost)}</p>
                    <p className="text-xs opacity-75">Tổng chi phí</p>
                </div>
            </div>
        </div>
    )
}

// =============================================
// CHARGE LOG CARD (electric)
// =============================================
function ChargeLogCard({
    log,
    onDelete,
}: {
    log: FuelLogRecord
    onDelete: (id: string) => void
}) {
    const [expanded, setExpanded] = useState(false)

    const kwh = log.kwh || log.liters || 0
    const cost = log.total_cost || log.total_amount || 0
    const pricePerKwh = kwh > 0 ? cost / kwh : log.unit_price || 0
    const hasExtra = log.station_name || log.notes || log.receipt_image_url

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg border border-slate-100">
            {/* Top accent bar - solid green */}
            <div className="h-1 w-full bg-green-500" />

            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5">
                                <Zap className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-bold text-green-700">Sạc điện</span>
                            </div>
                            <span className="text-xs text-slate-400">
                                {log.odometer_at_refuel.toLocaleString()} km
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(log.refuel_date).toLocaleDateString('vi-VN', {
                                weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
                            })}
                            {log.refuel_time && (
                                <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {log.refuel_time.slice(0, 5)}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => onDelete(log.id)}
                        className="ml-2 rounded-xl p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                {/* Main metrics */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-green-50 p-2.5 text-center">
                        <p className="text-base font-black text-green-700">{kwh.toFixed(1)}</p>
                        <p className="text-[10px] text-green-600 font-medium">kWh</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-2.5 text-center">
                        <p className="text-base font-black text-amber-700">
                            {pricePerKwh > 0 ? `${Math.round(pricePerKwh / 100) * 100 >= 1000 ? (Math.round(pricePerKwh / 100) * 100 / 1000).toFixed(1) + 'k' : Math.round(pricePerKwh).toLocaleString()}đ` : '--'}
                        </p>
                        <p className="text-[10px] text-amber-600 font-medium">đ/kWh</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                        <p className="text-base font-black text-slate-700">
                            {formatCurrency(cost).replace('₫', '').trim()}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">tổng tiền</p>
                    </div>
                </div>

                {/* Station name quick view */}
                {log.station_name && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0 text-green-500" />
                        <span className="truncate">{log.station_name}</span>
                    </div>
                )}

                {/* Expand toggle */}
                {hasExtra && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expanded ? 'Ẩn bớt' : 'Xem thêm'}
                    </button>
                )}

                {/* Expanded content */}
                {expanded && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {log.receipt_image_url && (
                            <img
                                src={log.receipt_image_url}
                                alt="Hóa đơn"
                                className="w-full h-28 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(log.receipt_image_url, '_blank')}
                            />
                        )}
                        {log.notes && <GPSInfoDisplay notes={log.notes} />}
                        {log.notes && getCleanNotes(log.notes) && (
                            <div className="text-xs text-slate-600">
                                <span className="font-medium">Ghi chú: </span>
                                {getCleanNotes(log.notes)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// =============================================
// FUEL LOG CARD (petrol/diesel)
// =============================================
function FuelLogCard({
    log,
    onDelete,
}: {
    log: FuelLogRecord
    onDelete: (id: string) => void
}) {
    const fuelType = FUEL_TYPES[log.fuel_type] || FUEL_TYPES.petrol_a95
    const cost = log.total_cost || log.total_amount || 0
    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-md border-l-4 border-l-slate-400 transition-all hover:shadow-lg">
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {fuelType.label}
                            </span>
                            <span className="text-xs text-slate-400">{log.odometer_at_refuel.toLocaleString()} km</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(log.refuel_date).toLocaleDateString('vi-VN')}
                            {log.refuel_time && ` · ${log.refuel_time.slice(0, 5)}`}
                        </div>
                    </div>
                    <button
                        onClick={() => onDelete(log.id)}
                        className="rounded-xl p-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                        <span className="text-lg font-bold text-slate-700">{log.liters?.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 ml-1">lít</span>
                        {log.unit_price && (
                            <span className="ml-2 text-xs text-slate-400">× {log.unit_price.toLocaleString()}đ</span>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-slate-700">{formatCurrency(cost)}</div>
                    </div>
                </div>

                {log.station_name && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {log.station_name}
                    </div>
                )}
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================
export default function VehicleFuel() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()

    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
    const [activeTab, setActiveTab] = useState<TabType>('fuel')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // ── Time-period filter ──────────────────────────────────
    type FilterPeriod = 'day' | 'week' | 'month' | 'quarter' | 'all'
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month')
    const [periodOffset, setPeriodOffset] = useState(0) // 0 = current, -1 = prev, ...

    const { data: vehicles = [] } = useVehicles()
    const { data: allLogs = [], isLoading: loading } = useVehicleFuel(selectedVehicleId || undefined)

    const logs = allLogs.filter(log => {
        const fuelType = FUEL_TYPES[log.fuel_type]
        return fuelType?.category === activeTab
    })

    // Auto-select vehicle + auto-switch tab based on vehicle fuel_type
    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicleId) {
            const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedVehicleId(defaultVehicle.id)
            setActiveTab(getVehicleFuelConfig(defaultVehicle.fuel_type).tab)
        }
    }, [vehicles, selectedVehicleId])

    // When vehicle changes, auto-switch tab based on vehicle fuel_type
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)
    useEffect(() => {
        if (selectedVehicle) {
            setActiveTab(getVehicleFuelConfig(selectedVehicle.fuel_type).tab)
        }
    }, [selectedVehicle?.fuel_type])

    const handleDelete = async () => {
        if (!deleteConfirmId) return
        setDeleting(true)
        try {
            await deleteFuelLog(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId) })
            success('Đã xóa nhật ký thành công!')
            setDeleteConfirmId(null)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể xóa nhật ký'
            showError(message)
        } finally {
            setDeleting(false)
        }
    }

    const vehicleFuelConfig = getVehicleFuelConfig(selectedVehicle?.fuel_type)
    const isElectricVehicle = vehicleFuelConfig.isElectric

    // ── Period range helpers ─────────────────────────────────
    const now = new Date()
    function getPeriodRange(period: FilterPeriod, offset: number): { start: Date; end: Date; label: string } {
        const d = new Date(now)
        if (period === 'day') {
            d.setDate(d.getDate() + offset)
            const s = new Date(d); s.setHours(0, 0, 0, 0)
            const e = new Date(d); e.setHours(23, 59, 59, 999)
            const label = offset === 0 ? 'Hôm nay'
                : offset === -1 ? 'Hôm qua'
                    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
            return { start: s, end: e, label }
        }
        if (period === 'week') {
            const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0
            d.setDate(d.getDate() - dayOfWeek + offset * 7)
            const s = new Date(d); s.setHours(0, 0, 0, 0)
            const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999)
            const label = offset === 0 ? 'Tuần này'
                : offset === -1 ? 'Tuần trước'
                    : `${s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
            return { start: s, end: e, label }
        }
        if (period === 'month') {
            const s = new Date(now.getFullYear(), now.getMonth() + offset, 1)
            const e = new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999)
            const label = offset === 0 ? 'Tháng này'
                : s.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
            return { start: s, end: e, label }
        }
        if (period === 'quarter') {
            const q = Math.floor(now.getMonth() / 3) + offset
            const actualYear = now.getFullYear() + Math.floor(q / 4)
            const actualQ = ((q % 4) + 4) % 4
            const s = new Date(actualYear, actualQ * 3, 1)
            const e = new Date(actualYear, actualQ * 3 + 3, 0, 23, 59, 59, 999)
            const qLabel = `Q${actualQ + 1}/${actualYear}`
            return { start: s, end: e, label: offset === 0 ? `Quý này (${qLabel})` : qLabel }
        }
        // 'all'
        return { start: new Date(0), end: new Date(9999, 0), label: 'Tất cả' }
    }

    const periodRange = getPeriodRange(filterPeriod, periodOffset)

    // Filter logs by time range
    const filteredLogs = logs.filter(log => {
        if (filterPeriod === 'all') return true
        const d = new Date(log.refuel_date)
        return d >= periodRange.start && d <= periodRange.end
    })

    // Group logs by date (newest first)
    const groupedLogs = filteredLogs.reduce<Record<string, typeof filteredLogs>>((acc, log) => {
        const key = log.refuel_date
        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
    }, {})
    const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a))

    // Period stats
    const periodTotalCost = filteredLogs.reduce((s, l) => s + (l.total_cost || l.total_amount || 0), 0)
    const periodTotalKwh = filteredLogs.reduce((s, l) => s + (l.kwh || l.liters || 0), 0)

    const PERIOD_TABS: { id: FilterPeriod; label: string }[] = [
        { id: 'day', label: 'Ngày' },
        { id: 'week', label: 'Tuần' },
        { id: 'month', label: 'Tháng' },
        { id: 'quarter', label: 'Quý' },
        { id: 'all', label: 'Tất cả' },
    ]

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title={activeTab === 'electric' ? 'Lịch sử sạc điện' : 'Lịch sử nhiên liệu'}
                customContent={
                    <button
                        onClick={() => setShowSettings(true)}
                        className="flex items-center justify-center rounded-full bg-white/80 p-2 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
                        title="Cài đặt giá"
                    >
                        <Settings className="h-5 w-5 text-slate-600" />
                    </button>
                }
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-4">
                {/* Vehicle Selector */}
                {vehicles.length > 1 && (
                    <div className="mb-4">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            {vehicles.map(vehicle => (
                                <button
                                    key={vehicle.id}
                                    onClick={() => setSelectedVehicleId(vehicle.id)}
                                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${selectedVehicleId === vehicle.id
                                        ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    {vehicle.fuel_type === 'electric' ? <Zap className="h-4 w-4" /> : <Droplet className="h-4 w-4" />}
                                    {vehicle.license_plate}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                {!isElectricVehicle && (
                    <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
                        <button
                            onClick={() => setActiveTab('fuel')}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'fuel'
                                ? 'bg-white text-slate-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Droplet className="h-4 w-4" />
                            Xăng/Dầu
                        </button>
                        <button
                            onClick={() => setActiveTab('electric')}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'electric'
                                ? 'bg-white text-green-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Zap className="h-4 w-4" />
                            Sạc điện
                        </button>
                    </div>
                )}

                {/* Electric header when electric vehicle */}
                {isElectricVehicle && (
                    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-green-500 px-4 py-3 text-white">
                        <div className="rounded-xl bg-white/20 p-2">
                            <BatteryCharging className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">{selectedVehicle?.license_plate}</p>
                            <p className="text-xs opacity-75">{selectedVehicle?.brand} {selectedVehicle?.model} · Xe điện</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{selectedVehicle?.current_odometer.toLocaleString()} km</p>
                            <p className="text-xs opacity-75">Odometer</p>
                        </div>
                    </div>
                )}

                {/* Stats */}
                {selectedVehicle && !loading && (
                    activeTab === 'electric'
                        ? <ElectricStatsCard logs={logs} />
                        : <FuelStatsCard logs={logs} />
                )}

                {/* Add Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className={`w-full mb-4 flex items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${activeTab === 'electric'
                        ? 'bg-green-500 shadow-green-200'
                        : 'bg-slate-600 shadow-slate-200'
                        }`}
                >
                    <Plus className="h-5 w-5" />
                    {activeTab === 'electric' ? 'Thêm lần sạc mới' : 'Thêm nhật ký đổ xăng'}
                </button>

                {/* ── FILTER BAR ── */}
                <div className="mb-3 space-y-2">
                    {/* Period type tabs */}
                    <div className="flex rounded-xl bg-slate-100 p-1 gap-0.5">
                        {PERIOD_TABS.map(tab => (
                            <button key={tab.id} type="button"
                                onClick={() => { setFilterPeriod(tab.id); setPeriodOffset(0) }}
                                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${filterPeriod === tab.id
                                    ? activeTab === 'electric'
                                        ? 'bg-green-500 text-white shadow-sm'
                                        : 'bg-slate-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Period navigator (hidden for 'all') */}
                    {filterPeriod !== 'all' && (
                        <div className="flex items-center gap-2">
                            <button type="button"
                                onClick={() => setPeriodOffset(o => o - 1)}
                                className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
                                <p className={`text-sm font-bold ${activeTab === 'electric' ? 'text-green-700' : 'text-slate-700'}`}
                                >  {periodRange.label}</p>
                            </div>
                            <button type="button"
                                onClick={() => setPeriodOffset(o => Math.min(0, o + 1))}
                                disabled={periodOffset >= 0}
                                className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30 active:scale-95 transition-all">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Period summary */}
                    {filteredLogs.length > 0 && (
                        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${activeTab === 'electric' ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'
                            }`}>
                            <span className="text-xs text-slate-500">
                                <span className="font-bold text-slate-700">{filteredLogs.length}</span> lần ·
                                <span className="font-bold text-slate-700">{periodTotalKwh.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                                {activeTab === 'electric' ? ' kWh' : ' lít'}
                            </span>
                            <span className={`text-sm font-black ${activeTab === 'electric' ? 'text-green-700' : 'text-slate-700'
                                }`}>{Math.round(periodTotalCost).toLocaleString('vi-VN')}đ</span>
                        </div>
                    )}
                </div>

                {/* Log List */}
                {
                    loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
                                    <div className="mb-3 h-4 w-2/3 rounded-lg bg-slate-100" />
                                    <div className="h-16 w-full rounded-xl bg-slate-50" />
                                </div>
                            ))}
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className={`mb-4 rounded-3xl p-6 ${activeTab === 'electric' ? 'bg-green-100' : 'bg-slate-100'}`}>
                                {activeTab === 'electric'
                                    ? <BatteryCharging className="h-12 w-12 text-green-400" />
                                    : <Droplet className="h-12 w-12 text-slate-400" />
                                }
                            </div>
                            <p className="font-semibold text-slate-600">
                                {filterPeriod === 'all'
                                    ? (activeTab === 'electric' ? 'Chưa có nhật ký sạc điện' : 'Chưa có nhật ký đổ xăng')
                                    : `Không có dữ liệu trong ${periodRange.label.toLowerCase()}`
                                }
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                {filterPeriod !== 'all' ? 'Thử chọn khung thời gian khác' :
                                    activeTab === 'electric'
                                        ? 'Bắt đầu ghi chép việc sạc xe để theo dõi chi phí'
                                        : 'Bắt đầu ghi lại các lần đổ xăng của bạn'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedDates.map(dateKey => {
                                const dayLogs = groupedLogs[dateKey]
                                const d = new Date(dateKey)
                                const isToday = dateKey === new Date().toISOString().split('T')[0]
                                const isYesterday = dateKey === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                                const dayLabel = isToday ? 'Hôm nay'
                                    : isYesterday ? 'Hôm qua'
                                        : d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })
                                const dayTotal = dayLogs.reduce((s, l) => s + (l.total_cost || l.total_amount || 0), 0)
                                return (
                                    <div key={dateKey}>
                                        {/* Date separator */}
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${activeTab === 'electric' ? 'bg-green-400' : 'bg-slate-400'
                                                    }`} />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dayLabel}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-400">
                                                {Math.round(dayTotal).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                        <div className="space-y-2 pl-4 border-l-2 ${
                                        activeTab === 'electric' ? 'border-green-100' : 'border-slate-100'
                                    }">
                                            {dayLogs.map(log =>
                                                activeTab === 'electric' ? (
                                                    <ChargeLogCard key={log.id} log={log} onDelete={(id) => setDeleteConfirmId(id)} />
                                                ) : (
                                                    <FuelLogCard key={log.id} log={log} onDelete={(id) => setDeleteConfirmId(id)} />
                                                )
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                }

            </main >

            {/* Vehicle Footer Nav */}
            < VehicleFooterNav
                onAddClick={() => setShowAddModal(true)
                }
                isElectricVehicle={isElectricVehicle}
                addLabel={activeTab === 'electric' ? 'Sạc điện' : 'Đổ xăng'}
            />

            {/* Add Modal */}
            {
                showAddModal && selectedVehicle && (
                    <AddChargeModal
                        vehicle={selectedVehicle}
                        category={activeTab}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            setShowAddModal(false)
                            queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId) })
                        }}
                    />
                )
            }

            {/* Price Settings */}
            <FuelPriceSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSave={() => { }}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Xác nhận xóa"
                message="Bạn có chắc chắn muốn xóa nhật ký này?"
                confirmText="Xóa"
                cancelText="Hủy"
                isLoading={deleting}
            />
        </div >
    )
}

// =============================================
// ADD CHARGE MODAL
// =============================================
function AddChargeModal({
    vehicle,
    category,
    onClose,
    onSuccess,
}: {
    vehicle: VehicleRecord
    category: TabType
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const isElectric = category === 'electric'
    const [loading, setLoading] = useState(false)
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
    const [stationLocationData, setStationLocationData] = useState<SimpleLocationData | null>(null)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [discountMode, setDiscountMode] = useState<'pct' | 'vnd'>('vnd')

    // AI Scan states
    const [scanning, setScanning] = useState(false)
    const [scanResult, setScanResult] = useState<ChargeReceiptData | null>(null)
    const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)
    const scanInputRef = useRef<HTMLInputElement>(null)

    const vehicleFuelConfig = getVehicleFuelConfig(vehicle.fuel_type)
    const defaultFuelType = category === 'electric'
        ? 'electric'
        : vehicleFuelConfig.defaultFuelLogType
    const now = new Date()

    const [formData, setFormData] = useState({
        vehicle_id: vehicle.id,
        refuel_date: now.toISOString().split('T')[0],
        start_time: now.toTimeString().slice(0, 5),
        end_time: '',
        odometer_at_refuel: vehicle.current_odometer || 0,
        fuel_type: defaultFuelType,
        fuel_category: category,
        quantity: '',           // kWh or liters
        unit_price: '',
        discount: '',           // khuyến mãi (optional)
        station_name: '',
        receipt_image_url: null as string | null,
        notes: '',
    })

    // Load default price on mount
    const hasLoadedPrice = useRef(false)
    useEffect(() => {
        const loadPrice = async () => {
            try {
                const price = await getFuelPrice(formData.fuel_type as FuelType)
                setFormData(prev => ({ ...prev, unit_price: price != null ? price.toString() : '' }))
                hasLoadedPrice.current = true
            } catch (e) { console.error('Price load error', e) }
        }
        if (!hasLoadedPrice.current) loadPrice()
    }, [formData.fuel_type])

    const quantity = parseFloat(formData.quantity) || 0
    const unitPrice = parseFloat(formData.unit_price) || 0
    const chargeAmount = quantity * unitPrice                        // Phí sạc thực tế

    // Discount: interpret formData.discount as % or VND depending on mode
    const discountRaw = parseFloat(formData.discount) || 0
    const discount = discountMode === 'pct'
        ? Math.round(chargeAmount * discountRaw / 100)
        : discountRaw
    const discountPct = chargeAmount > 0
        ? (discountMode === 'pct' ? discountRaw : (discount / chargeAmount) * 100)
        : 0
    const totalPayment = Math.max(0, chargeAmount - discount)      // Tổng thanh toán

    // Duration = end_time - start_time
    const duration = useMemo(() => {
        if (!formData.start_time || !formData.end_time) return null
        const [sh, sm] = formData.start_time.split(':').map(Number)
        const [eh, em] = formData.end_time.split(':').map(Number)
        let mins = (eh * 60 + em) - (sh * 60 + sm)
        if (mins < 0) mins += 24 * 60  // overnight
        if (mins <= 0) return null
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return h > 0 ? `${h}g ${m}ph` : `${m} phút`
    }, [formData.start_time, formData.end_time])

    // applyKwhPreset reserved for future kWh quick-select UI

    // Quick location preset
    const applyLocationPreset = useCallback((label: string) => {
        setFormData(prev => ({ ...prev, station_name: label }))
    }, [])

    // Friendly number display helper
    const fmtInput = (raw: string) => {
        if (!raw || raw === '') return ''
        const n = parseFloat(raw)
        return isNaN(n) ? raw : n.toLocaleString('vi-VN')
    }

    // ── AI SCAN HANDLER ─────────────────────────────────────────────────
    const handleScanImage = useCallback(async (file: File) => {
        setScanning(true)
        setScanResult(null)
        setScanPreviewUrl(URL.createObjectURL(file))
        setSelectedImageFile(file)
        try {
            const data = await analyzeChargeReceipt(file)
            setScanResult(data)
            setFormData(prev => {
                const u = { ...prev }
                if (data.date) u.refuel_date = data.date
                if (data.time) u.start_time = data.time
                if (data.kwh && data.kwh > 0) u.quantity = data.kwh.toString()
                // Unit price: prefer explicit, else back-calculate from chargeAmount
                if (data.unitPrice && data.unitPrice > 0) {
                    u.unit_price = data.unitPrice.toString()
                } else if (data.chargeAmount && data.kwh && data.kwh > 0) {
                    u.unit_price = Math.round(data.chargeAmount / data.kwh).toString()
                }
                // Discount = chargeAmount - totalPayment
                if (data.chargeAmount != null && data.totalPayment != null) {
                    const disc = data.chargeAmount - data.totalPayment
                    if (disc > 0) u.discount = disc.toString()
                }
                if (data.stationName) u.station_name = data.stationName
                return u
            })
            success('Đã đọc hóa đơn thành công!')
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể đọc ảnh')
            setScanPreviewUrl(null)
        } finally {
            setScanning(false)
        }
    }, [success, showError])

    // ── SUBMIT ───────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.quantity || !formData.unit_price) {
            showError('Vui lòng nhập số điện đã sạc và đơn giá')
            return
        }
        setLoading(true)
        try {
            let finalImageUrl = formData.receipt_image_url
            if (selectedImageFile) {
                const r = await uploadToCloudinary(selectedImageFile, { folder: 'fuel_receipts' })
                finalImageUrl = r.secure_url
            }

            // Build notes: include end_time, duration, discount if present
            const extras: string[] = []
            if (isElectric && formData.end_time) {
                extras.push(`⏱ Kết thúc: ${formData.end_time}`)
                if (duration) extras.push(`⏳ Thời gian sạc: ${duration}`)
            }
            if (isElectric && discount > 0)
                extras.push(`Khuyến mãi: -${discount.toLocaleString('vi-VN')}đ`)
            if (stationLocationData) {
                extras.push(`GPS: ${stationLocationData.lat.toFixed(6)}, ${stationLocationData.lng.toFixed(6)}`)
                extras.push(`https://www.google.com/maps?q=${stationLocationData.lat},${stationLocationData.lng}`)
            }
            const finalNotes = [formData.notes, ...extras].filter(Boolean).join('\n')

            const rawChargeAmount = Math.round(chargeAmount)   // phí sạc gốc trước khuyến mãi
            const rawTotalPayment = Math.round(totalPayment)   // số thực trả sau khuyến mãi

            const payload = {
                vehicle_id: formData.vehicle_id,
                refuel_date: formData.refuel_date,
                refuel_time: formData.start_time || null,
                odometer_at_refuel: formData.odometer_at_refuel,
                fuel_type: formData.fuel_type,
                station_name: formData.station_name || null,
                notes: finalNotes || null,
                receipt_image_url: finalImageUrl || null,
                ...(isElectric ? { kwh: quantity } : { liters: quantity }),
                price_per_liter: unitPrice || null,
                unit_price: unitPrice || null,
                // total_amount = phí gốc (để backward compat, không bao giờ = 0 nếu có sạc)
                total_amount: rawChargeAmount,
                // total_cost = số thực trả (có thể = 0 nếu KM 100%)
                total_cost: rawTotalPayment,
            }

            console.log('[FuelLog] payload:', payload)
            try {
                await createFuelLog(payload as any)
            } catch (insertErr: any) {
                console.error('[FuelLog] Supabase error:', insertErr?.message, insertErr?.details, insertErr?.hint, insertErr)
                throw insertErr
            }
            success(isElectric ? 'Thêm lịch sử sạc thành công!' : 'Thêm nhật ký thành công!')
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể lưu nhật ký')
        } finally {
            setLoading(false)
        }
    }

    const availableFuelTypes = Object.entries(FUEL_TYPES).filter(([, c]) => c?.category === category)

    // ── RENDER ───────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[3px]">
            <div className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl max-h-[95vh] overflow-y-auto">

                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                </div>

                {/* Header */}
                <div className={`mx-4 mb-4 mt-2 rounded-2xl px-4 py-3 ${isElectric ? 'bg-green-500 text-white' : 'bg-slate-600 text-white'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isElectric ? <BatteryCharging className="h-5 w-5" /> : <Droplet className="h-5 w-5" />}
                            <div>
                                <h3 className="font-bold">
                                    {isElectric ? 'Thêm lịch sử sạc' : 'Thêm nhật ký đổ xăng'}
                                </h3>
                                <p className="text-xs opacity-75">{vehicle.license_plate} · {vehicle.brand} {vehicle.model}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">

                    {/* ── AI SCAN BANNER (electric only) ── */}
                    {isElectric && (
                        <div className="rounded-2xl border-2 border-dashed border-green-200 bg-green-50 overflow-hidden">
                            {scanning ? (
                                <div className="flex flex-col items-center gap-2 py-5">
                                    <div className="relative h-10 w-10">
                                        <div className="absolute inset-0 rounded-full border-4 border-green-200" />
                                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-green-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-green-700">Đang phân tích ảnh...</p>
                                </div>
                            ) : scanResult ? (
                                <div className="p-3">
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="rounded-full bg-green-500 p-1"><Check className="h-3 w-3 text-white" /></div>
                                        <span className="text-xs font-bold text-green-700">Đã trích xuất dữ liệu từ ảnh</span>
                                        <button type="button" onClick={() => scanInputRef.current?.click()} className="ml-auto text-xs text-green-600 underline">Scan lại</button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {scanResult.kwh != null && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-700 shadow-sm border border-green-200"><Zap className="h-3 w-3" /> {scanResult.kwh} kWh</span>}
                                        {(scanResult.chargeAmount ?? scanResult.totalPayment) != null && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700 shadow-sm border border-slate-200"><CreditCard className="h-3 w-3" /> {((scanResult.chargeAmount ?? scanResult.totalPayment) ?? 0).toLocaleString('vi-VN')}đ</span>}
                                        {scanResult.date && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 shadow-sm border border-slate-200"><Calendar className="h-3 w-3" /> {new Date(scanResult.date).toLocaleDateString('vi-VN')}</span>}
                                        {scanResult.stationName && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 shadow-sm border border-slate-200 max-w-[180px] truncate"><MapPin className="h-3 w-3 shrink-0" /> {scanResult.stationName}</span>}
                                    </div>
                                    {scanResult.summary && <p className="mt-1.5 text-[10px] text-green-600">{scanResult.summary}</p>}
                                    {scanPreviewUrl && <img src={scanPreviewUrl} alt="Hóa đơn" className="mt-2 h-16 w-auto rounded-lg object-cover border border-green-200" />}
                                </div>
                            ) : (
                                <button type="button" onClick={() => scanInputRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-green-100 transition-colors">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500 shadow-md shadow-green-200">
                                        <ScanLine className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-green-700">Scan ảnh hóa đơn sạc</p>
                                        <p className="text-xs text-green-500">Tự động điền ngày, kWh, chi phí, địa chỉ</p>
                                    </div>
                                    <Zap className="ml-auto h-4 w-4 text-green-400" />
                                </button>
                            )}
                            <input ref={scanInputRef} type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanImage(f); e.target.value = '' }}
                            />
                        </div>
                    )}

                    {/* ── 1. NGÀY SẠC ── */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <Calendar className="h-3 w-3" /> Ngày sạc
                        </label>
                        <input type="date" required
                            value={formData.refuel_date}
                            onChange={(e) => setFormData({ ...formData, refuel_date: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                        />
                    </div>

                    {/* ── 2. ĐỊA CHỈ TRẠM SẠC ── */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <MapPin className="h-3 w-3 text-red-500" /> {isElectric ? 'Địa chỉ trạm sạc' : 'Trạm xăng'}
                        </label>
                        {isElectric && (
                            <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                                {CHARGE_LOCATION_PRESETS.map(p => (
                                    <button key={p.label} type="button" onClick={() => applyLocationPreset(p.label)}
                                        className={`flex shrink-0 items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${formData.station_name === p.label
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }`}>
                                        <Zap className="h-3 w-3 text-green-600" />{p.label}
                                        {formData.station_name === p.label && <Check className="h-3 w-3 text-green-600" />}
                                    </button>
                                ))}
                            </div>
                        )}
                        <SimpleLocationInput label="" value={formData.station_name} locationData={stationLocationData}
                            onChange={(addr, loc) => { setFormData({ ...formData, station_name: addr }); setStationLocationData(loc || null) }}
                            placeholder={isElectric ? 'Hoặc nhập địa chỉ / lấy vị trí GPS' : 'Petrolimex, Shell...'}
                        />
                    </div>

                    {/* ── 3. THỜI GIAN SẠC ── */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <Clock className="h-3 w-3" /> Thời gian {isElectric ? 'sạc' : ''}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Bắt đầu</label>
                                <input type="time" value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Kết thúc</label>
                                <input type="time" value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                                />
                            </div>
                        </div>
                        {duration && (
                            <div className="flex items-center justify-between rounded-xl bg-green-100 px-3 py-2">
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><Clock className="h-3 w-3" /> Tổng thời gian sạc</span>
                                <span className="text-sm font-black text-green-700">{duration}</span>
                            </div>
                        )}
                    </div>

                    {/* ── 4. SỐ ĐIỆN + ĐƠN GIÁ ── */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <Zap className="h-3 w-3 text-green-500" /> {isElectric ? 'Điện năng & chi phí' : 'Nhiên liệu & chi phí'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {/* kWh / Liters */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">
                                    {isElectric ? 'Số điện đã sạc' : 'Số lít'}
                                </label>
                                <div className="relative">
                                    <input type="text" required
                                        value={(() => {
                                            if (formData.quantity === '') return ''
                                            if (formData.quantity.endsWith('.')) {
                                                const p = formData.quantity.split('.')
                                                return (p[0] ? parseInt(p[0]).toLocaleString('vi-VN') : '') + ','
                                            }
                                            const v = parseFloat(formData.quantity)
                                            if (isNaN(v)) return formData.quantity
                                            const p = formData.quantity.split('.')
                                            p[0] = parseInt(p[0]).toLocaleString('vi-VN')
                                            return p.join(',')
                                        })()}
                                        onChange={(e) => {
                                            let v = e.target.value.replace(/,/g, '.')
                                            if (!/^[\d.]*$/.test(v)) return
                                            if ((v.match(/\./g) || []).length > 1) return
                                            setFormData({ ...formData, quantity: v })
                                        }}
                                        placeholder=""
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-12 text-right text-lg font-black text-slate-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">{isElectric ? 'kWh' : 'lít'}</span>
                                </div>
                            </div>
                            {/* Unit price */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">
                                    Đơn giá{isElectric ? ' /kWh' : ' /lít'}
                                </label>
                                <div className="relative">
                                    <input type="text" required
                                        value={fmtInput(formData.unit_price)}
                                        onChange={(e) => setFormData({ ...formData, unit_price: e.target.value.replace(/[^\d]/g, '') })}
                                        placeholder=""
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-8 text-right text-lg font-black text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">đ</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Phí sạc thực tế (auto-calculated) */}
                        {chargeAmount > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600"><Zap className="h-3 w-3 text-green-500" /> Phí sạc thực tế</span>
                                <span className="text-md font-black text-slate-800">{Math.round(chargeAmount).toLocaleString('vi-VN')} đ</span>
                            </div>
                        )}
                    </div>

                    {/* ── 6. KHUYẾN MÃI (electric only, optional) ── */}
                    {isElectric && (
                        <div className="rounded-2xl border border-pink-100 bg-red-50 p-3 space-y-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <Gift className="h-3.5 w-3.5 text-red-500" /> Khuyến mãi
                                    <span className="normal-case font-normal text-slate-400">(tùy chọn)</span>
                                </p>
                                {/* % / VND toggle */}
                                <div className="flex rounded-lg overflow-hidden border border-pink-200">
                                    <button type="button"
                                        onClick={() => { setDiscountMode('pct'); setFormData(prev => ({ ...prev, discount: '' })) }}
                                        className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'pct' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 hover:bg-red-50'
                                            }`}>%</button>
                                    <button type="button"
                                        onClick={() => { setDiscountMode('vnd'); setFormData(prev => ({ ...prev, discount: '' })) }}
                                        className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'vnd' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 hover:bg-red-50'
                                            }`}>đ</button>
                                </div>
                            </div>

                            {/* Quick % presets */}
                            {discountMode === 'pct' && (
                                <div className="flex gap-1.5">
                                    {[25, 50, 100].map(pct => (
                                        <button key={pct} type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, discount: pct.toString() }))}
                                            className={`flex-1 rounded-xl border py-2 text-sm font-bold transition-all ${formData.discount === pct.toString()
                                                ? 'border-red-500 bg-red-500 text-white shadow-sm'
                                                : 'border-red-200 bg-white text-red-600 hover:border-red-400'
                                                }`}>
                                            -{pct}%
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <div className="relative">
                                <input type="text"
                                    value={discountMode === 'vnd' ? fmtInput(formData.discount) : formData.discount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^\d]/g, '')
                                        if (discountMode === 'pct') {
                                            // clamp to 100
                                            const n = parseInt(raw) || 0
                                            setFormData(prev => ({ ...prev, discount: n > 100 ? '100' : raw }))
                                        } else {
                                            setFormData(prev => ({ ...prev, discount: raw }))
                                        }
                                    }}
                                    placeholder={discountMode === 'pct' ? 'Nhập % giảm...' : 'Nhập số tiền được giảm...'}
                                    className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 pr-10 text-sm font-semibold focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">
                                    {discountMode === 'pct' ? '%' : 'đ'}
                                </span>
                            </div>

                            {/* Preview */}
                            {discount > 0 && chargeAmount > 0 && (
                                <div className="flex items-center justify-between rounded-xl bg-red-100 px-3 py-2">
                                    <span className="text-xs font-medium text-red-700">Tiết kiệm được</span>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-red-700">-{discount.toLocaleString('vi-VN')}đ</span>
                                        {discountMode === 'vnd' && chargeAmount > 0 && (
                                            <span className="ml-1.5 text-xs text-red-500">({discountPct.toFixed(0)}%)</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── 7. TỔNG THANH TOÁN ── */}
                    {chargeAmount > 0 && (
                        <div className="rounded-2xl bg-green-500 px-4 py-3 text-white">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-90"><DollarSign className="h-4 w-4" /> Tổng thanh toán</span>
                                <span className="text-xl font-black">{totalPayment.toLocaleString('vi-VN')}đ</span>
                            </div>
                            {discount > 0 && (
                                <div className="mt-1.5 flex items-center justify-between rounded-xl bg-white/20 px-3 py-1.5 text-xs">
                                    <span>Phí gốc: {chargeAmount.toLocaleString('vi-VN')}đ</span>
                                    <span className="inline-flex items-center gap-1"><Gift className="h-3 w-3" /> -{discount.toLocaleString('vi-VN')}đ</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fuel type selector (fuel only, when multiple types) */}
                    {!isElectric && availableFuelTypes.length > 1 && (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Loại nhiên liệu</label>
                            <div className="flex gap-2">
                                {availableFuelTypes.map(([key, { label }]) => {
                                    const sel = formData.fuel_type === key
                                    return (
                                        <label key={key} className={`flex-1 cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-xs font-semibold transition-all ${sel ? 'border-slate-500 bg-slate-50 text-slate-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'
                                            }`}>
                                            <input type="radio" name="fuel_type" value={key} checked={sel}
                                                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as any })}
                                                className="hidden" />
                                            {key === 'electric' ? <Zap className="h-3 w-3 inline mr-0.5" /> : <Fuel className="h-3 w-3 inline mr-0.5" />}{label}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── ODO ── */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <Gauge className="h-3 w-3" /> ODO hiện tại (km)
                        </label>
                        <input type="number" required
                            value={formData.odometer_at_refuel}
                            onChange={(e) => setFormData({ ...formData, odometer_at_refuel: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {/* ── ẢNH & GHI CHÚ (collapsible) ── */}
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex w-full items-center justify-between text-sm text-slate-500 hover:text-slate-700 transition-colors">
                        <span className="inline-flex items-center gap-2 font-medium"><Image className="h-4 w-4" /> Ảnh hóa đơn &amp; ghi chú</span>
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showAdvanced && (
                        <div className="space-y-4 border-t border-slate-100 pt-3">
                            <ImageUpload
                                value={scanPreviewUrl || formData.receipt_image_url}
                                onChange={(url) => {
                                    if (!url) { setSelectedImageFile(null); setScanPreviewUrl(null); setFormData({ ...formData, receipt_image_url: null }) }
                                    else { setFormData({ ...formData, receipt_image_url: url }) }
                                }}
                                onFileSelect={(file) => setSelectedImageFile(file)}
                                label="Ảnh hóa đơn"
                            />
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Ghi chú</label>
                                <textarea rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder={isElectric ? 'Ví dụ: pin sạc từ 20% → 80%...' : 'Ghi chú thêm...'}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    )}

                    {/* ── SUBMIT ── */}
                    <button type="submit" disabled={loading}
                        className={`w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 ${isElectric ? 'bg-green-500 shadow-green-200' : 'bg-slate-600 shadow-slate-200'
                            }`}>
                        {loading
                            ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</span>
                            : isElectric
                                ? <span className="flex items-center justify-center gap-2"><Zap className="h-4 w-4" /> Lưu lịch sử sạc</span>
                                : <span className="flex items-center justify-center gap-2"><Droplet className="h-4 w-4" /> Lưu nhật ký</span>
                        }
                    </button>
                </form>
            </div>
        </div>
    )
}

