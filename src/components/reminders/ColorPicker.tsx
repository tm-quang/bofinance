import { FaCheck } from 'react-icons/fa'

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
  label?: string
}

// Bộ màu khác biệt rõ ràng, đối lập nhau và đậm hơn
// Chọn 10 màu phân bố đều trên vòng tròn màu sắc để dễ phân biệt
const AVAILABLE_COLORS = [
  // Đỏ - Xanh lá (đối lập)
  { id: 'red', name: 'Đỏ', bg: 'bg-red-600', ring: 'ring-red-400' },
  { id: 'green', name: 'Xanh lá', bg: 'bg-green-600', ring: 'ring-green-400' },
  // Cam - Xanh dương (đối lập)
  { id: 'orange', name: 'Cam', bg: 'bg-orange-600', ring: 'ring-orange-400' },
  { id: 'blue', name: 'Xanh dương', bg: 'bg-blue-600', ring: 'ring-blue-400' },
  // Vàng - Tím (đối lập)
  { id: 'yellow', name: 'Vàng', bg: 'bg-yellow-500', ring: 'ring-yellow-400' },
  { id: 'purple', name: 'Tím', bg: 'bg-purple-600', ring: 'ring-purple-400' },
  // Hồng - Xanh ngọc (đối lập)
  { id: 'pink', name: 'Hồng', bg: 'bg-pink-600', ring: 'ring-pink-400' },
  { id: 'cyan', name: 'Xanh ngọc', bg: 'bg-cyan-600', ring: 'ring-cyan-400' },
  // Đỏ tươi - Xanh lục (đối lập)
  { id: 'fuchsia', name: 'Đỏ tươi', bg: 'bg-fuchsia-600', ring: 'ring-fuchsia-400' },
  { id: 'lime', name: 'Xanh lục', bg: 'bg-lime-500', ring: 'ring-lime-400' },
]

export const ColorPicker = ({ value, onChange, label }: ColorPickerProps) => {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-xs font-medium text-slate-600 sm:text-sm">
          {label}
        </label>
      )}
      <div className="grid grid-cols-5 gap-2">
        {AVAILABLE_COLORS.map((color) => {
          const isSelected = value === color.id
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              className={`relative flex aspect-square items-center justify-center rounded-xl transition-all active:scale-95 ${
                isSelected
                  ? `${color.bg} ring-2 ${color.ring} shadow-md scale-110`
                  : `${color.bg} opacity-60 hover:opacity-100 hover:scale-105`
              }`}
              title={color.name}
            >
              {isSelected && (
                <FaCheck className="h-4 w-4 text-white drop-shadow-md" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

