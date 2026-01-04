import { useState, useEffect, useRef } from 'react'
import { Plus, Calendar, Trash2, MapPin, Settings, Zap, Droplet } from 'lucide-react'
import { createFuelLog, deleteFuelLog, type VehicleRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleFuel, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImageUpload } from '../../components/vehicles/ImageUpload'
import { FuelPriceSettings } from '../../components/vehicles/FuelPriceSettings'
import { getFuelPrice, type FuelType } from '../../lib/vehicles/fuelPriceService'

const FUEL_TYPES = {
    petrol_a95: { label: 'Xăng A95', color: 'gray', category: 'fuel' as const },
    petrol_e5: { label: 'Xăng E5', color: 'gray', category: 'fuel' as const },
    diesel: { label: 'Dầu Diesel', color: 'gray', category: 'fuel' as const },
    electric: { label: 'Điện', color: 'green', category: 'electric' as const },
}

type TabType = 'fuel' | 'electric'

export default function VehicleFuel() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()

    // State
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
    const [activeTab, setActiveTab] = useState<TabType>('fuel')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Query Hooks
    const { data: vehicles = [] } = useVehicles()
    const { data: allLogs = [], isLoading: loading } = useVehicleFuel(selectedVehicleId || undefined)

    // Filter logs by category
    const logs = allLogs.filter(log => {
        const fuelType = FUEL_TYPES[log.fuel_type]
        return fuelType?.category === activeTab
    })

    // Auto-select
    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicleId) {
            const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedVehicleId(defaultVehicle.id)
        }
    }, [vehicles, selectedVehicleId])

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

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

    // Calculate statistics
    const totalCost = logs.reduce((sum, log) => sum + (log.total_cost || log.total_amount || 0), 0)
    const totalQuantity = logs.reduce((sum, log) => sum + (log.liters || 0), 0)

    // Tab colors
    const tabColors = {
        fuel: {
            active: 'bg-gray-500 text-white',
            inactive: 'bg-gray-100 text-gray-600',
            gradient: 'from-gray-500 to-gray-600',
            accent: 'border-l-gray-500',
            bg: 'bg-gray-50',
        },
        electric: {
            active: 'bg-green-600 text-white',
            inactive: 'bg-green-100 text-green-600',
            gradient: 'from-green-500 to-green-600',
            accent: 'border-l-green-600',
            bg: 'bg-green-50',
        },
    }

    const currentColors = tabColors[activeTab]

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Sạc Pin & Nhiên Liệu" />

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

                {/* Tabs + Settings Button */}
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex-1 flex gap-2">
                        <button
                            onClick={() => setActiveTab('fuel')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'fuel' ? tabColors.fuel.active : tabColors.fuel.inactive
                                }`}
                        >
                            <Droplet className="h-5 w-5" />
                            Xăng/Dầu
                        </button>
                        <button
                            onClick={() => setActiveTab('electric')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'electric' ? tabColors.electric.active : tabColors.electric.inactive
                                }`}
                        >
                            <Zap className="h-5 w-5" />
                            Điện
                        </button>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="px-4 py-3 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        title="Cài đặt giá"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                </div>

                {/* Summary Card */}
                {selectedVehicle && (
                    <div className={`mb-4 rounded-2xl bg-gradient-to-br ${currentColors.gradient} p-4 text-white shadow-lg`}>
                        <div className="mb-2 flex items-center gap-2">
                            {activeTab === 'fuel' ? <Droplet className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                            <span className="text-sm font-medium opacity-90">
                                {activeTab === 'fuel' ? 'Tổng quan xăng/dầu' : 'Tổng quan sạc điện'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(totalCost)}
                                </p>
                                <p className="text-xs opacity-75">Tổng chi phí</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {totalQuantity.toFixed(1)}
                                </p>
                                <p className="text-xs opacity-75">
                                    {activeTab === 'fuel' ? 'Lít đã đổ' : 'kWh đã sạc'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className={`w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${currentColors.gradient} px-4 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95`}
                >
                    <Plus className="h-5 w-5" />
                    {activeTab === 'fuel' ? 'Thêm nhật ký đổ xăng' : 'Thêm nhật ký sạc điện'}
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
                        {activeTab === 'fuel' ? (
                            <Droplet className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                        ) : (
                            <Zap className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                        )}
                        <p className="text-sm text-slate-600">
                            {activeTab === 'fuel' ? 'Chưa có nhật ký đổ xăng/dầu' : 'Chưa có nhật ký sạc điện'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => {
                            const fuelType = FUEL_TYPES[log.fuel_type] || FUEL_TYPES.petrol_a95

                            return (
                                <div
                                    key={log.id}
                                    className={`overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg border-l-4 ${currentColors.accent}`}
                                >
                                    <div className="p-4">
                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${activeTab === 'fuel'
                                                        ? 'bg-gray-100 text-gray-700'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
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

                                        {/* Quantity & Cost */}
                                        <div className={`flex items-center justify-between rounded-lg p-3 ${currentColors.bg}`}>
                                            <div className="text-sm text-slate-700">
                                                <span className="font-bold">{log.liters?.toFixed(2)}</span>
                                                <span className="text-xs text-slate-500 ml-1">
                                                    {activeTab === 'fuel' ? 'lít' : 'kWh'}
                                                </span>
                                                {log.unit_price && (
                                                    <span className="text-xs text-slate-500 ml-2">
                                                        × {log.unit_price.toLocaleString()}đ
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${activeTab === 'fuel' ? 'text-gray-600' : 'text-green-600'
                                                    }`}>
                                                    {formatCurrency(log.total_cost || log.total_amount)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Receipt Image */}
                                        {log.receipt_image_url && (
                                            <div className="mt-3">
                                                <img
                                                    src={log.receipt_image_url}
                                                    alt="Receipt"
                                                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(log.receipt_image_url, '_blank')}
                                                />
                                            </div>
                                        )}

                                        {/* Station Name */}
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
                    category={activeTab}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId) })
                    }}
                />
            )}

            {/* Price Settings Modal */}
            <FuelPriceSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSave={() => {
                    // Refresh will happen automatically
                }}
            />

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
    const [loading, setLoading] = useState(false)

    // Default fuel type based on category
    const defaultFuelType = category === 'electric' ? 'electric' : (vehicle.fuel_type || 'petrol_a95')

    const [formData, setFormData] = useState({
        vehicle_id: vehicle.id,
        refuel_date: new Date().toISOString().split('T')[0],
        refuel_time: new Date().toTimeString().slice(0, 5),
        odometer_at_refuel: vehicle.current_odometer,
        fuel_type: defaultFuelType,
        fuel_category: category,
        quantity: '',
        unit_price: '',
        total_cost: '',
        station_name: '',
        receipt_image_url: null as string | null,
        notes: '',
    })

    // Load price when fuel type changes
    const prevFuelTypeRef = useRef(defaultFuelType)
    useEffect(() => {
        // Only load price if fuel type actually changed
        if (prevFuelTypeRef.current !== formData.fuel_type) {
            prevFuelTypeRef.current = formData.fuel_type
            const loadPrice = async () => {
                try {
                    const price = await getFuelPrice(formData.fuel_type as FuelType)
                    setFormData(prev => ({ ...prev, unit_price: price.toString() }))
                } catch (error) {
                    console.error('Error loading price:', error)
                }
            }
            loadPrice()
        }
    }, [formData.fuel_type])

    // Auto-calculate total cost
    useEffect(() => {
        const quantity = parseFloat(formData.quantity) || 0
        const unitPrice = parseFloat(formData.unit_price) || 0
        const total = quantity * unitPrice
        setFormData(prev => ({ ...prev, total_cost: total > 0 ? total.toString() : '' }))
    }, [formData.quantity, formData.unit_price])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.quantity || !formData.unit_price) {
            showError('Vui lòng nhập số lượng và đơn giá')
            return
        }

        setLoading(true)
        try {
            await createFuelLog({
                ...formData,
                liters: parseFloat(formData.quantity),
                unit_price: parseFloat(formData.unit_price),
                total_cost: parseFloat(formData.total_cost),
                total_amount: parseFloat(formData.total_cost), // Backward compatibility
            } as any)
            success('Thêm nhật ký thành công!')
            onSuccess()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể thêm nhật ký'
            showError(message)
        } finally {
            setLoading(false)
        }
    }

    const tabColors = category === 'electric'
        ? { gradient: 'from-green-500 to-green-600', text: 'text-green-600' }
        : { gradient: 'from-gray-500 to-gray-600', text: 'text-gray-600' }

    // Filter fuel types by category
    const availableFuelTypes = Object.entries(FUEL_TYPES).filter(
        ([, config]) => config.category === category
    )

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">
                        {category === 'fuel' ? 'Thêm nhật ký - Xăng/Dầu' : 'Thêm nhật ký - Điện'}
                    </h3>
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
                    {/* Date & Time */}
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

                    {/* Fuel Type (Radio Buttons) */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            {category === 'fuel' ? 'Loại nhiên liệu' : 'Loại'}
                        </label>
                        <div className="flex gap-2">
                            {availableFuelTypes.map(([key, { label }]) => (
                                <label
                                    key={key}
                                    className={`flex-1 cursor-pointer rounded-lg border-2 px-3 py-2 text-center text-sm font-medium transition-all ${formData.fuel_type === key
                                        ? `border-${category === 'electric' ? 'green' : 'gray'}-500 bg-${category === 'electric' ? 'green' : 'gray'}-50 text-${category === 'electric' ? 'green' : 'gray'}-700`
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="fuel_type"
                                        value={key}
                                        checked={formData.fuel_type === key}
                                        onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as any })}
                                        className="hidden"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            {category === 'fuel' ? 'Số lít' : 'Số kWh'}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Unit Price */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Đơn giá ({category === 'fuel' ? 'đ/lít' : 'đ/kWh'})
                        </label>
                        <input
                            type="number"
                            required
                            value={formData.unit_price}
                            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="0"
                        />
                    </div>

                    {/* Total Cost (Auto-calculated) */}
                    {formData.total_cost && (
                        <div className={`rounded-lg bg-${category === 'electric' ? 'green' : 'gray'}-50 border border-${category === 'electric' ? 'green' : 'gray'}-200 p-3`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${tabColors.text}`}>
                                    💰 Tổng tiền:
                                </span>
                                <span className={`text-lg font-bold ${tabColors.text}`}>
                                    {parseFloat(formData.total_cost).toLocaleString()}đ
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Odometer */}
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

                    {/* Station Name */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            {category === 'fuel' ? 'Trạm xăng' : 'Trạm sạc'}
                        </label>
                        <input
                            type="text"
                            value={formData.station_name}
                            onChange={(e) => setFormData({ ...formData, station_name: e.target.value })}
                            placeholder={category === 'fuel' ? 'Petrolimex...' : 'VinFast...'}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    {/* Receipt Image Upload */}
                    <ImageUpload
                        value={formData.receipt_image_url}
                        onChange={(url) => setFormData({ ...formData, receipt_image_url: url })}
                        label="📷 Ảnh hóa đơn"
                    />

                    {/* Notes */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Ghi chú thêm..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            rows={2}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-xl bg-gradient-to-r ${tabColors.gradient} px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-50`}
                    >
                        {loading ? 'Đang lưu...' : 'Thêm nhật ký'}
                    </button>
                </form>
            </div>
        </div>
    )
}
