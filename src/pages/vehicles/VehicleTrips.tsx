import { useState, useEffect } from 'react'
import { Route, Plus, MapPin, Calendar, Trash2 } from 'lucide-react'
import { createTrip, deleteTrip, type VehicleRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleTrips, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SimpleLocationInput, type SimpleLocationData } from '../../components/vehicles/SimpleLocationInput'

const TRIP_TYPES = {
    work: { label: 'Đi làm', color: 'blue' },
    business: { label: 'Công tác', color: 'purple' },
    service: { label: 'Dịch vụ', color: 'teal' },
    leisure: { label: 'Đi chơi', color: 'green' },
    hometown: { label: 'Về quê', color: 'orange' },
    other: { label: 'Khác', color: 'gray' },
}

export default function VehicleTrips() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()

    // React Query Hooks
    const { data: vehicles = [] } = useVehicles()

    // State
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Auto-select first/default vehicle
    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicleId) {
            const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedVehicleId(defaultVehicle.id)
        }
    }, [vehicles, selectedVehicleId])

    // Fetch trips using hook
    const { data: trips = [], isLoading: loading } = useVehicleTrips(selectedVehicleId || undefined)

    const handleDelete = async () => {
        if (!deleteConfirmId) return

        setDeleting(true)
        try {
            await deleteTrip(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId) })
            success('Đã xóa hành trình thành công!')
            setDeleteConfirmId(null)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể xóa hành trình'
            showError(message)
        } finally {
            setDeleting(false)
        }
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Quản Lý Hành Trình" />

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
                    <div className="mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-4 text-white shadow-lg">
                        <div className="mb-2 flex items-center gap-2">
                            <Route className="h-5 w-5" />
                            <span className="text-sm font-medium opacity-90">Tổng quan hành trình</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold">{trips.length}</p>
                                <p className="text-xs opacity-75">Chuyến đi</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {trips.reduce((sum, trip) => sum + (trip.distance_km || 0), 0).toLocaleString()}
                                </p>
                                <p className="text-xs opacity-75">km</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Thêm hành trình mới
                </button>

                {/* Trips List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-white p-4 shadow-md">
                                <div className="mb-3 flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="h-6 w-20 rounded-full bg-slate-200"></div>
                                        <div className="h-4 w-32 rounded bg-slate-100"></div>
                                    </div>
                                    <div className="h-8 w-8 rounded-lg bg-slate-200"></div>
                                </div>
                                <div className="mb-3 space-y-2">
                                    <div className="h-4 w-full rounded bg-slate-100"></div>
                                    <div className="h-4 w-full rounded bg-slate-100"></div>
                                </div>
                                <div className="h-16 w-full rounded-lg bg-slate-50"></div>
                            </div>
                        ))}
                    </div>
                ) : trips.length === 0 ? (
                    <div className="py-12 text-center">
                        <Route className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                        <p className="text-sm text-slate-600">Chưa có hành trình nào</p>
                        <p className="text-xs text-slate-500">Thêm hành trình đầu tiên của bạn</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {trips.map((trip) => {
                            const tripType = TRIP_TYPES[trip.trip_type as keyof typeof TRIP_TYPES] || TRIP_TYPES.other

                            return (
                                <div
                                    key={trip.id}
                                    className="overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg"
                                >
                                    <div className="p-4">
                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className={`inline-block rounded-full bg-${tripType.color}-100 px-2 py-1 text-xs font-semibold text-${tripType.color}-700`}>
                                                        {tripType.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(trip.trip_date).toLocaleDateString('vi-VN')}
                                                    {trip.trip_time && ` ${trip.trip_time}`}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setDeleteConfirmId(trip.id)}
                                                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {(trip.start_location || trip.end_location) && (
                                            <div className="mb-3 space-y-1 text-sm">
                                                {trip.start_location && (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <MapPin className="h-4 w-4 text-green-500" />
                                                        <span>{trip.start_location}</span>
                                                    </div>
                                                )}
                                                {trip.end_location && (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <MapPin className="h-4 w-4 text-red-500" />
                                                        <span>{trip.end_location}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                                            <div className="text-sm text-slate-600">
                                                <span className="font-medium">{trip.start_km.toLocaleString()}</span>
                                                {' → '}
                                                <span className="font-medium">{trip.end_km.toLocaleString()}</span>
                                                {' km'}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-green-600">{trip.distance_km?.toLocaleString() || 0} km</div>
                                                <div className="text-xs text-slate-500">Quãng đường</div>
                                            </div>
                                        </div>

                                        {trip.notes && (
                                            <div className="mt-3 text-sm text-slate-600">
                                                <span className="font-medium">Ghi chú: </span>
                                                {trip.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Add Trip Modal */}
            {showAddModal && selectedVehicle && (
                <AddTripModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId) })
                    }}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Xác nhận xóa"
                message="Bạn có chắc chắn muốn xóa hành trình này?"
                confirmText="Xóa"
                cancelText="Hủy"
                isLoading={deleting}
            />

        </div>
    )
}

// Add Trip Modal Component
function AddTripModal({
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
        trip_date: new Date().toISOString().split('T')[0],
        trip_time: new Date().toTimeString().slice(0, 5),
        trip_type: 'work' as const,
        start_km: '',
        end_km: '',
        start_location: '',
        end_location: '',
        notes: '',
    })

    // Location data with GPS coordinates
    const [startLocationData, setStartLocationData] = useState<SimpleLocationData | null>(null)
    const [endLocationData, setEndLocationData] = useState<SimpleLocationData | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.end_km < formData.start_km) {
            showError('Số km kết thúc phải lớn hơn số km bắt đầu')
            return
        }

        setLoading(true)
        try {
            // Include GPS coordinates if available
            const tripData: any = {
                ...formData,
            }

            // Add GPS data to notes if available
            if (startLocationData || endLocationData) {
                const gpsInfo = []
                if (startLocationData) {
                    gpsInfo.push(`📍 Điểm đi: ${startLocationData.lat.toFixed(6)}, ${startLocationData.lng.toFixed(6)}`)
                    gpsInfo.push(`🔗 https://www.google.com/maps?q=${startLocationData.lat},${startLocationData.lng}`)
                }
                if (endLocationData) {
                    gpsInfo.push(`📍 Điểm đến: ${endLocationData.lat.toFixed(6)}, ${endLocationData.lng.toFixed(6)}`)
                    gpsInfo.push(`🔗 https://www.google.com/maps?q=${endLocationData.lat},${endLocationData.lng}`)
                }

                tripData.notes = [formData.notes, ...gpsInfo].filter(Boolean).join('\n')
            }

            await createTrip(tripData)
            success('Thêm hành trình thành công!')
            onSuccess()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể thêm hành trình'
            showError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="w-full rounded-t-3xl bg-white p-5 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Thêm hành trình mới</h3>
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
                                value={formData.trip_date}
                                onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Giờ</label>
                            <input
                                type="time"
                                value={formData.trip_time}
                                onChange={(e) => setFormData({ ...formData, trip_time: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Loại hành trình</label>
                        <select
                            value={formData.trip_type}
                            onChange={(e) => setFormData({ ...formData, trip_type: e.target.value as any })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                            {Object.entries(TRIP_TYPES).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Odo bắt đầu</label>
                            <input
                                type="number"
                                required
                                value={formData.start_km}
                                onChange={(e) => setFormData({ ...formData, start_km: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Odo kết thúc</label>
                            <input
                                type="number"
                                required
                                value={formData.end_km}
                                onChange={(e) => setFormData({ ...formData, end_km: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    {/* Distance Calculation Display */}
                    {Number(formData.start_km) > 0 && Number(formData.end_km) > 0 && Number(formData.end_km) >= Number(formData.start_km) && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-800">
                                    Khoảng cách đã di chuyển:
                                </span>
                                <span className="text-lg font-bold text-blue-600">
                                    {(Number(formData.end_km) - Number(formData.start_km)).toLocaleString()} km
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Simple Location Inputs */}
                    <SimpleLocationInput
                        label="Từ"
                        value={formData.start_location}
                        locationData={startLocationData}
                        onChange={(address, locationData) => {
                            setFormData({ ...formData, start_location: address })
                            setStartLocationData(locationData || null)
                        }}
                        placeholder="Địa điểm xuất phát"
                    />

                    <SimpleLocationInput
                        label="Đến"
                        value={formData.end_location}
                        locationData={endLocationData}
                        onChange={(address, locationData) => {
                            setFormData({ ...formData, end_location: address })
                            setEndLocationData(locationData || null)
                        }}
                        placeholder="Địa điểm đến"
                    />

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            placeholder="Ghi chú về chuyến đi..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
                    >
                        {loading ? 'Đang lưu...' : 'Thêm hành trình'}
                    </button>
                </form>
            </div>
        </div>
    )
}
