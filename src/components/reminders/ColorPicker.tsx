import { FaCheck } from 'react-icons/fa'

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
  label?: string
}

const AVAILABLE_COLORS = [
  { id: 'amber', name: 'Vàng', bg: 'bg-amber-500', ring: 'ring-amber-300' },
  { id: 'emerald', name: 'Xanh lá', bg: 'bg-emerald-500', ring: 'ring-emerald-300' },
  { id: 'rose', name: 'Hồng', bg: 'bg-rose-500', ring: 'ring-rose-300' },
  { id: 'sky', name: 'Xanh dương', bg: 'bg-sky-500', ring: 'ring-sky-300' },
  { id: 'blue', name: 'Xanh đậm', bg: 'bg-blue-500', ring: 'ring-blue-300' },
  { id: 'purple', name: 'Tím', bg: 'bg-purple-500', ring: 'ring-purple-300' },
  { id: 'indigo', name: 'Chàm', bg: 'bg-indigo-500', ring: 'ring-indigo-300' },
  { id: 'pink', name: 'Hồng đậm', bg: 'bg-pink-500', ring: 'ring-pink-300' },
  { id: 'orange', name: 'Cam', bg: 'bg-orange-500', ring: 'ring-orange-300' },
  { id: 'teal', name: 'Xanh ngọc', bg: 'bg-teal-500', ring: 'ring-teal-300' },
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

