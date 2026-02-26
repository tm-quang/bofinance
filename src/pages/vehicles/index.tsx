import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Car,
    Bike,
    Route,
    Fuel,
    Wrench,
    Receipt,
    BarChart3,
    Plus,
    AlertTriangle,
    Calendar,
    Star,
    Pencil,
    Gauge,
    Zap,
    BatteryCharging,
} from 'lucide-react'
import { useVehicles, useVehicleStats, useVehicleAlerts, useSetDefaultVehicle } from '../../lib/vehicles/useVehicleQueries'
import type { VehicleAlert } from '../../lib/vehicles/vehicleService'
import HeaderBar from '../../components/layout/HeaderBar'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)

export default function VehicleManagement() {
    const navigate = useNavigate()
    // State for selection (ID only)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    // 1. React Query Hooks
    const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles()
    const { data: stats, isLoading: isLoadingStats } = useVehicleStats(selectedId || undefined)
    const { data: alerts = [] } = useVehicleAlerts(selectedId || undefined)
    const setDefaultMutation = useSetDefaultVehicle()

    // 2. Auto-select default vehicle
    useEffect(() => {
        if (vehicles.length > 0 && !selectedId) {
            const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedId(defaultVehicle.id)
        }
    }, [vehicles, selectedId])

    // Derived state for selected vehicle object
    const selectedVehicle = vehicles.find(v => v.id === selectedId) || null
    const loading = isLoadingVehicles // Main loading state

    const toggleDefaultVehicle = async (e: React.MouseEvent, vehicleId: string, isCurrentDefault: boolean) => {
        e.stopPropagation()
        try {
            await setDefaultMutation.mutateAsync({ id: vehicleId, isDefault: !isCurrentDefault })
        } catch (error) {
            console.error('Error setting default vehicle:', error)
        }
    }

    const isElectric = selectedVehicle?.fuel_type === 'electric'

    const modules = [
        {
            id: 'dashboard',
            name: 'Tổng Quan',
            icon: Car,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            shadowColor: 'shadow-blue-100',
            electric: false,
        },
        {
            id: 'trips',
            name: 'Hành Trình',
            icon: Route,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            shadowColor: 'shadow-emerald-100',
            electric: false,
        },
        {
            id: 'fuel',
            name: isElectric ? 'Sạc Điện' : 'Nhiên Liệu',
            icon: isElectric ? BatteryCharging : Fuel,
            color: isElectric ? 'text-green-600' : 'text-orange-600',
            bgColor: isElectric ? 'bg-green-50' : 'bg-orange-50',
            shadowColor: isElectric ? 'shadow-green-100' : 'shadow-orange-100',
            electric: isElectric,
        },
        {
            id: 'maintenance',
            name: 'Bảo Dưỡng',
            icon: Wrench,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            shadowColor: 'shadow-purple-100',
            electric: false,
        },
        {
            id: 'expenses',
            name: 'Chi Phí Khác',
            icon: Receipt,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            shadowColor: 'shadow-red-100',
            electric: false,
        },
        {
            id: 'reports',
            name: 'Báo Cáo',
            icon: BarChart3,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            shadowColor: 'shadow-indigo-100',
            electric: false,
        },
    ]

    const getAlertInfo = (alert: VehicleAlert) => {
        let title = ''
        let remainingText = ''
        const isCritical = alert.isOverdue || (alert.daysUntilDue !== undefined && alert.daysUntilDue < 3)

        switch (alert.type) {
            case 'inspection':
                title = 'Đăng kiểm'
                remainingText = alert.isOverdue
                    ? `Quá hạn ${Math.abs(alert.daysUntilDue || 0)} ngày`
                    : `Còn ${alert.daysUntilDue} ngày`
                break
            case 'insurance':
                title = 'Bảo hiểm'
                remainingText = alert.isOverdue
                    ? `Quá hạn ${Math.abs(alert.daysUntilDue || 0)} ngày`
                    : `Còn ${alert.daysUntilDue} ngày`
                break
            case 'maintenance_km':
                title = 'Bảo dưỡng (Km)'
                remainingText = alert.isOverdue
                    ? `Quá ${alert.kmUntilDue ? Math.abs(alert.kmUntilDue) : 0} km`
                    : `Còn ${alert.kmUntilDue} km`
                break
            case 'maintenance_date':
                title = 'Bảo dưỡng (Ngày)'
                remainingText = alert.isOverdue
                    ? `Quá hạn ${Math.abs(alert.daysUntilDue || 0)} ngày`
                    : `Còn ${alert.daysUntilDue} ngày`
                break
        }
        return { title, remainingText, isCritical }
    }

    if (loading) {
        return (
            <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
                <HeaderBar variant="page" title="Quản Lý Xe" />
                <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-20 pt-4">
                    <div className="animate-pulse space-y-4">
                        <div className="h-48 bg-gray-200 rounded-3xl"></div>
                        <div className="h-32 bg-gray-200 rounded-2xl"></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-24 bg-gray-200 rounded-2xl"></div>
                            <div className="h-24 bg-gray-200 rounded-2xl"></div>
                            <div className="h-24 bg-gray-200 rounded-2xl"></div>
                            <div className="h-24 bg-gray-200 rounded-2xl"></div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title="Quản Lý Xe"
                customContent={
                    <button
                        onClick={() => navigate('/vehicles/add')}
                        className="flex items-center justify-center rounded-full bg-blue-500 p-2 shadow-md transition-all hover:bg-blue-600 hover:shadow-lg active:scale-95"
                        aria-label="Thêm xe mới"
                    >
                        <Plus className="h-5 w-5 text-white" />
                    </button>
                }
            />
            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-4">
                {/* Vehicle Selector - ATM Card Style */}
                <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between px-1">
                        <h3 className="text-base font-bold text-slate-800">Xe của bạn</h3>
                        <span className="text-xs font-medium text-slate-500">{vehicles.length} xe</span>
                    </div>

                    {/* Swipeable Container */}
                    <div className="relative">
                        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide">
                            {vehicles.map((vehicle) => {
                                const isSelected = selectedVehicle?.id === vehicle.id
                                const VehicleIcon = vehicle.vehicle_type === 'motorcycle' ? Bike : Car
                                const gradientColor = vehicle.vehicle_type === 'motorcycle'
                                    ? 'from-orange-600 via-orange-700 to-red-800'
                                    : 'from-blue-700 via-blue-800 to-indigo-900'
                                const badgeColor = vehicle.vehicle_type === 'motorcycle'
                                    ? 'text-amber-300'
                                    : 'text-emerald-300'

                                return (
                                    <div
                                        key={vehicle.id}
                                        onClick={() => setSelectedId(vehicle.id)}
                                        className={`group relative flex min-w-[calc(100%-1rem)] flex-shrink-0 snap-center transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] rounded-3xl overflow-hidden cursor-pointer`}
                                    >
                                        <div className={`relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${gradientColor} p-5 ${isSelected
                                            ? 'shadow-2xl shadow-blue-500/30'
                                            : 'shadow-lg shadow-slate-300/40'
                                            }`}>
                                            {/* Decorative patterns */}
                                            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl"></div>
                                                <div className="absolute -right-8 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-xl"></div>
                                                <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-lg"></div>
                                                <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-white/5 blur-2xl"></div>

                                                <svg className="absolute bottom-0 left-0 w-full opacity-15" viewBox="0 0 400 180" preserveAspectRatio="none">
                                                    <path d="M0,120 Q100,60 200,120 T400,120 L400,180 L0,180 Z" fill="white" />
                                                    <path d="M0,150 Q150,90 300,150 T400,150 L400,180 L0,180 Z" fill="white" opacity="0.6" />
                                                </svg>
                                                <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 400 180" preserveAspectRatio="none">
                                                    <path d="M0,100 Q120,40 240,100 T400,100 L400,180 L0,180 Z" fill="white" opacity="0.5" />
                                                </svg>

                                                <div className="absolute right-3 top-14 -translate-y-12 z-0 opacity-15">
                                                    <VehicleIcon className="h-32 w-32 text-white" />
                                                </div>
                                            </div>

                                            {/* Card content */}
                                            <div className="relative z-10 flex h-full flex-col justify-between text-white">
                                                {/* Top section */}
                                                <div className="flex min-w-0 items-start justify-between gap-2">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm shrink-0">
                                                            <VehicleIcon className="h-5 w-5 text-white" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-lg font-bold uppercase tracking-widest text-white/90">
                                                                {vehicle.license_plate}
                                                            </p>
                                                            <p className="truncate text-xs font-medium text-white/80">
                                                                {vehicle.brand} {vehicle.model}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
                                                            {vehicle.vehicle_type === 'motorcycle' ? 'Xe máy' : 'Ô tô'}
                                                        </span>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                navigate(`/vehicles/edit/${vehicle.id}`)
                                                            }}
                                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white/60 transition-all hover:bg-white/30"
                                                            title="Sửa thông tin"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={(e) => toggleDefaultVehicle(e, vehicle.id, !!vehicle.is_default)}
                                                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${vehicle.is_default
                                                                ? 'bg-yellow-400 text-white shadow-lg'
                                                                : 'bg-white/20 text-white/60 hover:bg-white/30'
                                                                }`}
                                                            title={vehicle.is_default ? 'Bỏ mặc định' : 'Đặt làm mặc định'}
                                                        >
                                                            <Star className={`h-4 w-4 ${vehicle.is_default ? 'fill-current' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Middle section */}
                                                <div className="mt-4 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Gauge className="h-5 w-5 text-white/70" />
                                                        <p className="truncate text-3xl font-black tracking-tight">
                                                            {vehicle.current_odometer.toLocaleString()}
                                                        </p>
                                                        <span className="text-sm font-medium text-white/70">km</span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-white/70">
                                                        Số km hiện tại
                                                    </p>
                                                </div>

                                                {/* Bottom section */}
                                                <div className="mt-auto flex items-start justify-between gap-3 border-t border-white/20 pt-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-white/70">Năm SX</p>
                                                        <p className="mt-1 text-base font-bold">
                                                            {vehicle.year || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="h-12 w-px shrink-0 bg-white/20" />
                                                    <div className="flex-1 min-w-0 text-right">
                                                        <p className="text-xs text-white/70">Loại nhiên liệu</p>
                                                        <p className="mt-1 text-base font-bold">
                                                            {vehicle.fuel_type === 'petrol' ? 'Xăng' :
                                                                vehicle.fuel_type === 'diesel' ? 'Dầu' :
                                                                    vehicle.fuel_type === 'electric' ? 'Điện' : 'Hybrid'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="absolute inset-0 rounded-3xl ring-2 ring-blue-400/30 ring-inset pointer-events-none" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Dots Indicator */}
                        {vehicles.length > 1 && (
                            <div className="mt-2 flex justify-center gap-1.5">
                                {vehicles.map((vehicle) => (
                                    <button
                                        key={vehicle.id}
                                        onClick={() => setSelectedId(vehicle.id)}
                                        className={`h-1.5 rounded-full transition-all ${selectedVehicle?.id === vehicle.id
                                            ? 'w-6 bg-gradient-to-r from-blue-500 to-cyan-500'
                                            : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                                            }`}
                                        aria-label={`Chọn xe ${vehicle.license_plate}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {selectedVehicle && (stats || isLoadingStats) && (
                    <div className="mb-6 rounded-2xl bg-white p-4 shadow-lg">
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-700">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Chi phí tháng này
                        </h3>

                        {isLoadingStats ? (
                            /* Skeleton Loading */
                            <div className="space-y-3 animate-pulse">
                                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 rounded bg-gray-200"></div>
                                        <div className="h-4 w-20 rounded bg-gray-200"></div>
                                    </div>
                                    <div className="h-4 w-16 rounded bg-gray-200"></div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 rounded bg-gray-200"></div>
                                        <div className="h-4 w-20 rounded bg-gray-200"></div>
                                    </div>
                                    <div className="h-4 w-16 rounded bg-gray-200"></div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 rounded bg-gray-200"></div>
                                        <div className="h-4 w-20 rounded bg-gray-200"></div>
                                    </div>
                                    <div className="h-4 w-16 rounded bg-gray-200"></div>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                                    <div className="h-5 w-24 rounded bg-gray-200"></div>
                                    <div className="h-6 w-32 rounded bg-gray-200"></div>
                                </div>
                            </div>
                        ) : stats ? (
                            /* Actual Content */
                            <div className="space-y-3">
                                <div className={`flex items-center justify-between rounded-lg p-3 ${isElectric ? 'bg-green-50' : 'bg-orange-50'}`}>
                                    <div className="flex items-center gap-2">
                                        {isElectric
                                            ? <Zap className="h-4 w-4 text-green-600" />
                                            : <Fuel className="h-4 w-4 text-orange-600" />
                                        }
                                        <span className="text-sm font-medium text-slate-700">
                                            {isElectric ? 'Sạc điện' : 'Nhiên liệu'}
                                        </span>
                                    </div>
                                    <span className={`font-semibold ${isElectric ? 'text-green-600' : 'text-orange-600'}`}>{formatCurrency(stats.totalFuelCost)}</span>
                                </div>

                                <div className="flex items-center justify-between rounded-lg bg-purple-50 p-3">
                                    <div className="flex items-center gap-2">
                                        <Wrench className="h-4 w-4 text-purple-600" />
                                        <span className="text-sm font-medium text-slate-700">Bảo dưỡng</span>
                                    </div>
                                    <span className="font-semibold text-purple-600">{formatCurrency(stats.totalMaintenanceCost)}</span>
                                </div>

                                <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-red-600" />
                                        <span className="text-sm font-medium text-slate-700">Phí khác</span>
                                    </div>
                                    <span className="font-semibold text-red-600">{formatCurrency(stats.totalOtherExpenses)}</span>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                                    <span className="font-semibold text-slate-700">Tổng cộng</span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {formatCurrency(stats.totalFuelCost + stats.totalMaintenanceCost + stats.totalOtherExpenses)}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Alerts Section */}
                {alerts.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {alerts.map((alert, index) => {
                            const { title, remainingText, isCritical } = getAlertInfo(alert)
                            return (
                                <div key={index} className={`flex items-start gap-3 rounded-2xl p-4 shadow-sm ${isCritical ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                                    }`}>
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="font-bold">{title}</p>
                                        <p className="text-sm opacity-90">{alert.message}</p>
                                        <p className="mt-1 text-xs font-semibold uppercase opacity-75">
                                            {remainingText}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Module Grid - Only show when vehicle is selected */}
                {selectedVehicle && (
                    <div className="mb-6">
                        <h3 className="mb-4 font-semibold text-slate-700">Chức năng</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {modules.slice(1).map((module) => {
                                const Icon = module.icon

                                return (
                                    <button
                                        key={module.id}
                                        onClick={() => navigate(`/vehicles/${module.id}`)}
                                        className={`group relative overflow-hidden rounded-2xl p-4 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 active:translate-y-0 ${module.electric
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-200'
                                            : 'bg-white'
                                            }`}
                                    >
                                        <div
                                            className={`mb-3 inline-flex rounded-xl p-3 ${module.electric ? 'bg-white/25' : module.bgColor
                                                }`}
                                            style={module.electric ? {} : {
                                                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06), inset 0 -2px 4px 0 rgba(255, 255, 255, 1)'
                                            }}
                                        >
                                            <Icon className={`h-6 w-6 ${module.electric ? 'text-white' : module.color}`} />
                                        </div>

                                        <h4 className={`text-left text-sm font-bold ${module.electric ? 'text-white' : 'text-slate-700'
                                            }`}>{module.name}</h4>
                                        {module.electric && (
                                            <div className="absolute top-2 right-2 rounded-full bg-yellow-300 px-1.5 py-0.5">
                                                <span className="text-[9px] font-black text-yellow-800">EV</span>
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Vehicle Footer Nav - on main page, first tab = Trang chủ → /dashboard */}
            <VehicleFooterNav
                onAddClick={() => navigate('/vehicles/fuel')}
                isElectricVehicle={isElectric}
                addLabel="Ghi chép"
                isMainPage={true}
            />
        </div>
    )
}
