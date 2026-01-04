import { useState, useEffect } from 'react'
import { Fuel, Plus, Calendar, Trash2, MapPin } from 'lucide-react'
import { createFuelLog, deleteFuelLog, type VehicleRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleFuel, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

const FUEL_TYPES = {
    petrol_a95: { label: 'Xăng A95', color: 'orange' },
    petrol_e5: { label: 'Xăng E5', color: 'green' },
    diesel: { label: 'Dầu Diesel', color: 'blue' },
    electric: { label: 'Điện', color: 'cyan' },
}

export default function VehicleFuel() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()

    // Query Hooks
    const { data: vehicles = [] } = useVehicles()

    // State
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Auto-select
    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicleId) {
            const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedVehicleId(defaultVehicle.id)
        }
    }, [vehicles, selectedVehicleId])

    // Query logs
    const { data: logs = [], isLoading: loading } = useVehicleFuel(selectedVehicleId || undefined)

    const handleDelete = async () => {
        if (!deleteConfirmId) return

        setDeleting(true)
        try {
            await deleteFuelLog(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId) })
            success('Đã xóa lịch sử đổ nhiên liệu thành công!')
            setDeleteConfirmId(null)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể xóa nhật ký'
            showError(message)
        } finally {
            setDeleting(false)
        }
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Quản Lý Nhiên Liệu" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-4">
                {/* Vehicle Selector */}
                {vehicles.length > 0 && (
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">Chọn xe</label>
                        <select
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            {vehicles.map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                    {vehicle.license_plate} - {vehicle.brand} {vehicle.model}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Summary Card */}
                {selectedVehicle && (
                    <div className="mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 text-white shadow-lg">
                        <div className="mb-2 flex items-center gap-2">
                            <Fuel className="h-5 w-5" />
                            <span className="text-sm font-medium opacity-90">Tổng quan nhiên liệu</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(logs.reduce((sum, log) => sum + log.total_amount, 0))}
                                </p>
                                <p className="text-xs opacity-75">Tổng chi phí</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {logs.reduce((sum, log) => sum + (log.liters || 0), 0).toFixed(1)}
                                </p>
                                <p className="text-xs opacity-75">Lít đã đổ</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Thêm nhật ký nhiên liệu
                </button>

                {/* Logs List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-white p-4 shadow-md">
                                <div className="h-16 w-full rounded-lg bg-slate-50"></div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-12 text-center">
                        <Fuel className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                        <p className="text-sm text-slate-600">Chưa có nhật ký nhiên liệu</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => {
                            const fuelType = FUEL_TYPES[log.fuel_type] || FUEL_TYPES.petrol_a95

                            return (
                                <div
                                    key={log.id}
                                    className="overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg"
                                >
                                    <div className="p-4">
                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className={`inline-block rounded-full bg-${fuelType.color}-100 px-2 py-1 text-xs font-semibold text-${fuelType.color}-700`}>
                                                        {fuelType.label}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {log.odometer_at_refuel.toLocaleString()} km
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(log.refuel_date).toLocaleDateString('vi-VN')}
                                                    {log.refuel_time && ` ${log.refuel_time}`}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setDeleteConfirmId(log.id)}
                                                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-lg bg-orange-50 p-3">
                                            <div className="text-sm text-slate-700">
                                                <span className="font-bold">{log.liters?.toFixed(2)}</span>
                                                <span className="text-xs text-slate-500 ml-1">lít</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-orange-600">
                                                    {formatCurrency(log.total_amount)}
                                                </div>
                                            </div>
                                        </div>

                                        {log.station_name && (
                                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                <MapPin className="h-3 w-3" />
                                                {log.station_name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Add Log Modal */}
            {showAddModal && selectedVehicle && (
                <AddFuelModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId) })
                    }}
                />
            )}

            {/* Delete Confirmation */}
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
        </div>
    )
}

function AddFuelModal({
    vehicle,
    onClose,
    onSuccess,
}: {
    vehicle: VehicleRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        vehicle_id: vehicle.id,
        refuel_date: new Date().toISOString().split('T')[0],
        refuel_time: new Date().toTimeString().slice(0, 5),
        odometer_at_refuel: vehicle.current_odometer,
        fuel_type: vehicle.fuel_type || 'petrol_a95',
        liters: '',
        total_amount: '',
        station_name: '',
        notes: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.liters || !formData.total_amount) {
            showError('Vui lòng nhập số lít và tổng tiền')
            return
        }

        setLoading(true)
        try {
            await createFuelLog({
                ...formData,
                liters: parseFloat(formData.liters),
                total_amount: parseFloat(formData.total_amount),
            } as any)
            success('Thêm nhật ký nhiên liệu thành công!')
            onSuccess()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể thêm nhật ký'
            showError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="w-full rounded-t-3xl bg-white p-5 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Thêm nhật ký nhiên liệu</h3>
                    <button
                        onClick={onClose}
                        className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày</label>
                            <input
                                type="date"
                                required
                                value={formData.refuel_date}
                                onChange={(e) => setFormData({ ...formData, refuel_date: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Giờ</label>
                            <input
                                type="time"
                                value={formData.refuel_time}
                                onChange={(e) => setFormData({ ...formData, refuel_time: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Số ODO (km)</label>
                        <input
                            type="number"
                            required
                            value={formData.odometer_at_refuel}
                            onChange={(e) => setFormData({ ...formData, odometer_at_refuel: parseInt(e.target.value) })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Loại nhiên liệu</label>
                            <select
                                value={formData.fuel_type}
                                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as any })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                                {Object.entries(FUEL_TYPES).map(([key, { label }]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Số lít</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={formData.liters}
                                onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Tổng tiền (VNĐ)</label>
                        <input
                            type="number"
                            required
                            value={formData.total_amount}
                            onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-orange-600"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Trạm xăng</label>
                        <input
                            type="text"
                            value={formData.station_name}
                            onChange={(e) => setFormData({ ...formData, station_name: e.target.value })}
                            placeholder="Petrolimex..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
                    >
                        {loading ? 'Đang lưu...' : 'Thêm nhật ký'}
                    </button>
                </form>
            </div>
        </div>
    )
}
