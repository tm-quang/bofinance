import { useState, useEffect } from 'react'
import { X, Save, DollarSign } from 'lucide-react'
import { getAllFuelPrices, updateAllFuelPrices, type FuelType, getElectricDiscountSettings, setElectricDiscountSettings } from '../../lib/vehicles/fuelPriceService'
import { useNotification } from '../../contexts/notificationContext.helpers'

interface FuelPriceSettingsProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
}

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
    petrol_a95: 'Xăng A95',
    petrol_e5: 'Xăng E5',
    diesel: 'Dầu Diesel',
    electric: 'Điện',
}

const FUEL_TYPE_UNITS: Record<FuelType, string> = {
    petrol_a95: 'đ/lít',
    petrol_e5: 'đ/lít',
    diesel: 'đ/lít',
    electric: 'đ/kWh',
}

export function FuelPriceSettings({ isOpen, onClose, onSave }: FuelPriceSettingsProps) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [prices, setPrices] = useState<Record<FuelType, number>>({
        petrol_a95: 25000,
        petrol_e5: 23000,
        diesel: 21000,
        electric: 3000,
    })
    const [discountMode, setDiscountMode] = useState<'pct' | 'vnd'>('vnd')
    const [discountValue, setDiscountValue] = useState('')

    useEffect(() => {
        if (isOpen) {
            loadPrices()
        }
    }, [isOpen])

    const loadPrices = async () => {
        try {
            const currentPrices = await getAllFuelPrices()
            setPrices(currentPrices)
            const d = getElectricDiscountSettings()
            setDiscountMode(d.mode)
            setDiscountValue(d.value)
        } catch (error) {
            console.error('Error loading prices:', error)
            showError('Không thể tải giá hiện tại')
        }
    }

    const handlePriceChange = (fuelType: FuelType, value: string) => {
        const numValue = parseInt(value) || 0
        setPrices((prev) => ({
            ...prev,
            [fuelType]: numValue,
        }))
    }

    const handleSave = async () => {
        // Validate
        const invalidTypes: string[] = []
        Object.entries(prices).forEach(([type, price]) => {
            if (price <= 0) {
                invalidTypes.push(FUEL_TYPE_LABELS[type as FuelType])
            }
        })

        if (invalidTypes.length > 0) {
            showError(`Giá không hợp lệ: ${invalidTypes.join(', ')}`)
            return
        }

        setLoading(true)
        try {
            await updateAllFuelPrices(prices)
            setElectricDiscountSettings({ mode: discountMode, value: discountValue.replace(/[^\d]/g, '') })
            success('Đã cập nhật cài đặt thành công!')
            onSave()
            onClose()
        } catch (error) {
            console.error('Error saving prices:', error)
            showError('Không thể lưu giá. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Cài đặt giá
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Price Inputs */}
                <div className="space-y-4 mb-6">
                    {/* Xăng/Dầu Section */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-3">Xăng/Dầu</h4>
                        <div className="space-y-3">
                            {(['petrol_a95', 'petrol_e5', 'diesel'] as FuelType[]).map((fuelType) => (
                                <div key={fuelType} className="flex items-center gap-3">
                                    <label className="flex-1 text-sm font-medium text-slate-700">
                                        {FUEL_TYPE_LABELS[fuelType]}
                                    </label>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={prices[fuelType]}
                                            onChange={(e) => handlePriceChange(fuelType, e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm text-right"
                                            min="0"
                                            step="100"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                            {FUEL_TYPE_UNITS[fuelType]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Điện Section */}
                    <div>
                        <h4 className="text-sm font-semibold text-green-600 mb-3">Điện</h4>
                        <div className="flex items-center gap-3">
                            <label className="flex-1 text-sm font-medium text-slate-700">
                                {FUEL_TYPE_LABELS.electric}
                            </label>
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={prices.electric}
                                    onChange={(e) => handlePriceChange('electric', e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm text-right"
                                    min="0"
                                    step="100"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                    {FUEL_TYPE_UNITS.electric}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs text-blue-800">
                        💡 Giá và khuyến mãi thiết lập tại đây sẽ được tự động điền khi bạn thêm nhật ký mới.
                        Bạn vẫn có thể điều chỉnh lại cho mỗi lần đổ/sạc riêng biệt.
                    </p>
                </div>

                {/* Electric Discount Section */}
                <div className="mb-6 border-t border-slate-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-red-500">Khuyến mãi & giảm giá (Xe điện)</h4>
                        <div className="flex rounded-lg overflow-hidden border border-red-200">
                            <button
                                onClick={() => { setDiscountMode('pct'); setDiscountValue('') }}
                                className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'pct' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 hover:bg-red-50'
                                    }`}>%</button>
                            <button
                                onClick={() => { setDiscountMode('vnd'); setDiscountValue('') }}
                                className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'vnd' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 hover:bg-red-50'
                                    }`}>đ</button>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={discountMode === 'vnd'
                                ? (discountValue ? parseInt(discountValue || '0').toLocaleString('vi-VN') : '')
                                : discountValue
                            }
                            onChange={(e) => {
                                const raw = e.target.value.replace(/[^\d]/g, '')
                                if (discountMode === 'pct') {
                                    setDiscountValue(parseInt(raw) > 100 ? '100' : raw)
                                } else {
                                    setDiscountValue(raw)
                                }
                            }}
                            className="w-full rounded-lg border border-red-200 px-3 py-2.5 pr-10 text-sm font-medium focus:border-red-400 outline-none"
                            placeholder={discountMode === 'pct' ? 'Nhập % khuyến mãi mặc định (VD: 50)' : 'Số tiền giảm mặc định'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-500">
                            {discountMode === 'pct' ? '%' : 'đ'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            Lưu cài đặt
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
