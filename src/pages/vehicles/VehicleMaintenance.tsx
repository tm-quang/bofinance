import { useState, useEffect } from 'react'
import { Wrench, Plus, Calendar, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createMaintenance, deleteMaintenance, type VehicleRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleMaintenance, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'

const MAINTENANCE_TYPES = {
    scheduled: { label: 'Định kỳ', color: 'blue', icon: Calendar },
    repair: { label: 'Sửa chữa', color: 'red', icon: Wrench },
}

export default function VehicleMaintenance() {
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
    const { data: logs = [], isLoading: loading } = useVehicleMaintenance(selectedVehicleId || undefined)

    const handleDelete = async () => {
        if (!deleteConfirmId) return

        setDeleting(true)
        try {
            await deleteMaintenance(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenance(selectedVehicleId) })
            success('Đã xóa nhật ký bảo dưỡng thành công!')
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
            <HeaderBar variant="page" title="Quản Lý Bảo Dưỡng" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-4">
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
                    <div className="mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 p-4 text-white shadow-lg">
                        <div className="mb-2 flex items-center gap-2">
                            <Wrench className="h-5 w-5" />
                            <span className="text-sm font-medium opacity-90">Tổng chi phí bảo dưỡng</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(logs.reduce((sum, log) => sum + (log.total_cost || 0), 0))}
                                </p>
                                <p className="text-xs opacity-75">Tổng cộng</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {logs.length}
                                </p>
                                <p className="text-xs opacity-75">Lần bảo dưỡng</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Thêm nhật ký bảo dưỡng
                </button>

                {/* Logs List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-white p-4 shadow-md">
                                <div className="h-24 w-full rounded-lg bg-slate-50"></div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-12 text-center">
                        <Wrench className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                        <p className="text-sm text-slate-600">Chưa có nhật ký bảo dưỡng</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => {
                            const type = MAINTENANCE_TYPES[log.maintenance_type] || MAINTENANCE_TYPES.scheduled
                            const TypeIcon = type.icon

                            return (
                                <div
                                    key={log.id}
                                    className="overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg"
                                >
                                    <div className="p-4">
                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 rounded-full bg-${type.color}-100 px-2 py-1 text-xs font-semibold text-${type.color}-700`}>
                                                        <TypeIcon className="h-3 w-3" />
                                                        {type.label}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {log.odometer.toLocaleString()} km
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(log.maintenance_date).toLocaleDateString('vi-VN')}
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

                                        {/* Service Items */}
                                        {log.service_items && log.service_items.length > 0 && (
                                            <div className="mb-3 flex flex-wrap gap-1">
                                                {log.service_items.map((item, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                            <div className="text-xs text-slate-500">
                                                {log.service_provider && <span>Tại: {log.service_provider}</span>}
                                            </div>
                                            <div className="text-lg font-bold text-purple-600">
                                                {formatCurrency(log.total_cost || 0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Vehicle Footer Nav */}
            <VehicleFooterNav
                onAddClick={() => setShowAddModal(true)}
                addLabel="Bảo dưỡng"
            />

            {/* Add Maintenance Modal */}
            {showAddModal && selectedVehicle && (
                <AddMaintenanceModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenance(selectedVehicleId) })
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

function AddMaintenanceModal({
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
        maintenance_date: new Date().toISOString().split('T')[0],
        odometer: vehicle.current_odometer,
        maintenance_type: 'scheduled' as const,
        service_items_text: '', // Helper to split into array
        service_provider: '',
        parts_cost: '',
        labor_cost: '',
        next_reminder_km: '',
        next_reminder_date: '',
        notes: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parts = parseFloat(formData.parts_cost) || 0
        const labor = parseFloat(formData.labor_cost) || 0
        const total = parts + labor

        if (total === 0) {
            showError('Vui lòng nhập chi phí')
            return
        }

        setLoading(true)
        try {
            await createMaintenance({
                ...formData,
                service_items: formData.service_items_text.split(',').map(s => s.trim()).filter(s => s),
                parts_cost: parts,
                labor_cost: labor,
                next_reminder_km: formData.next_reminder_km ? parseInt(formData.next_reminder_km) : undefined,
                next_reminder_date: formData.next_reminder_date || undefined,
            } as any)
            success('Thêm nhật ký bảo dưỡng thành công!')
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
            <div className="w-full rounded-t-3xl bg-white p-5 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                <div className="mb-6 flex items-center justify-between sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-slate-800">Thêm nhật ký bảo dưỡng</h3>
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
                                value={formData.maintenance_date}
                                onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Số ODO (km)</label>
                            <input
                                type="number"
                                required
                                value={formData.odometer}
                                onChange={(e) => setFormData({ ...formData, odometer: parseInt(e.target.value) })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Loại bảo dưỡng</label>
                        <select
                            value={formData.maintenance_type}
                            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value as any })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                            {Object.entries(MAINTENANCE_TYPES).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Hạng mục (cách nhau bởi dấu phẩy)</label>
                        <textarea
                            value={formData.service_items_text}
                            onChange={(e) => setFormData({ ...formData, service_items_text: e.target.value })}
                            placeholder="VD: Thay nhớt, Thay lọc gió, Rửa xe..."
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Tiền phụ tùng</label>
                            <input
                                type="number"
                                value={formData.parts_cost}
                                onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })}
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Tiền nhân công</label>
                            <input
                                type="number"
                                value={formData.labor_cost}
                                onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-3">
                        <h4 className="mb-2 text-sm font-bold text-blue-800 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Nhắc nhở bảo dưỡng tiếp theo
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">Tại số km</label>
                                <input
                                    type="number"
                                    value={formData.next_reminder_km}
                                    onChange={(e) => setFormData({ ...formData, next_reminder_km: e.target.value })}
                                    placeholder={formData.odometer ? (formData.odometer + 1500).toString() : ''}
                                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">Hoặc ngày</label>
                                <input
                                    type="date"
                                    value={formData.next_reminder_date}
                                    onChange={(e) => setFormData({ ...formData, next_reminder_date: e.target.value })}
                                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
                    >
                        {loading ? 'Đang lưu...' : 'Lưu bảo dưỡng'}
                    </button>
                </form>
            </div>
        </div>
    )
}
