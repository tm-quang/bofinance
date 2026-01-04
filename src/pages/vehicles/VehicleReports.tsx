import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { fetchVehicles, getVehicleStats, type VehicleRecord, type VehicleStats } from '../../lib/vehicles/vehicleService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'

export default function VehicleReports() {
    const { error: showError } = useNotification()
    const [vehicles, setVehicles] = useState<VehicleRecord[]>([])
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
    const [stats, setStats] = useState<VehicleStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('all') // all, month, year

    useEffect(() => {
        loadVehicles()
    }, [])

    useEffect(() => {
        if (selectedVehicleId) {
            loadStats()
        }
    }, [selectedVehicleId, dateRange])

    const loadVehicles = async () => {
        try {
            const data = await fetchVehicles()
            setVehicles(data)
            if (data.length > 0) {
                const defaultVehicle = data.find(v => v.is_default) || data[0]
                setSelectedVehicleId(defaultVehicle.id)
            }
        } catch (error) {
            console.error('Error loading vehicles:', error)
            showError('Không thể tải danh sách xe')
        } finally {
            setLoading(false)
        }
    }

    const loadStats = async () => {
        try {
            setLoading(true)

            // Calculate date range
            let startDate: string | undefined
            let endDate: string | undefined
            const now = new Date()

            if (dateRange === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
                endDate = now.toISOString()
            } else if (dateRange === 'year') {
                startDate = new Date(now.getFullYear(), 0, 1).toISOString()
                endDate = now.toISOString()
            }

            const data = await getVehicleStats(selectedVehicleId, startDate, endDate)
            setStats(data)
        } catch (error) {
            console.error('Error loading stats:', error)
            showError('Không thể tải báo cáo')
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Báo Cáo Hoạt Động" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-4">
                {/* Controls */}
                <div className="mb-4 space-y-3">
                    {/* Vehicle Selector */}
                    {vehicles.length > 0 && (
                        <select
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            {vehicles.map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                    {vehicle.license_plate} - {vehicle.brand} {vehicle.model}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Date Filter */}
                    <div className="flex rounded-lg bg-white p-1 shadow-sm">
                        <button
                            onClick={() => setDateRange('all')}
                            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${dateRange === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setDateRange('year')}
                            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${dateRange === 'year' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Năm nay
                        </button>
                        <button
                            onClick={() => setDateRange('month')}
                            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${dateRange === 'month' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Tháng này
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                            <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                        </div>
                    </div>
                ) : stats ? (
                    <div className="space-y-4 pb-8">
                        {/* Total Cost Card */}
                        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg">
                            <div className="mb-2 text-indigo-100 text-sm font-medium">Tổng chi phí vận hành</div>
                            <div className="text-3xl font-bold">
                                {formatCurrency(stats.totalFuelCost + stats.totalMaintenanceCost + stats.totalOtherExpenses)}
                            </div>
                            <div className="mt-4 flex gap-4 text-xs opacity-80">
                                <div>
                                    <span className="block font-bold">{stats.totalTrips}</span>
                                    <span>Chuyến đi</span>
                                </div>
                                <div>
                                    <span className="block font-bold">{stats.totalDistance.toLocaleString()} km</span>
                                    <span>Quãng đường</span>
                                </div>
                            </div>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-white p-4 shadow-sm">
                                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <div className="text-sm text-slate-500">Nhiên liệu</div>
                                <div className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalFuelCost)}</div>
                            </div>
                            <div className="rounded-2xl bg-white p-4 shadow-sm">
                                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <div className="text-sm text-slate-500">Bảo dưỡng</div>
                                <div className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalMaintenanceCost)}</div>
                            </div>
                            <div className="rounded-2xl bg-white p-4 shadow-sm">
                                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <div className="text-sm text-slate-500">Chi phí khác</div>
                                <div className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalOtherExpenses)}</div>
                            </div>
                            <div className="rounded-2xl bg-white p-4 shadow-sm">
                                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                                    <BarChart3 className="h-4 w-4" />
                                </div>
                                <div className="text-sm text-slate-500">Chi phí / km</div>
                                <div className="text-lg font-bold text-slate-800">{formatCurrency(stats.costPerKm)}</div>
                            </div>
                        </div>

                        {/* Efficiency */}
                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            <h3 className="mb-4 text-base font-bold text-slate-800">Hiệu quả sử dụng</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="mb-1 flex justify-between text-sm">
                                        <span className="text-slate-600">Tiêu thụ nhiên liệu TB</span>
                                        <span className="font-bold text-slate-800">{stats.averageFuelConsumption.toFixed(2)} L/100km</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full bg-orange-400" style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center text-slate-500">
                        Không có dữ liệu báo cáo
                    </div>
                )}
            </main>
        </div>
    )
}
