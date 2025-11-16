import { useState, useEffect, useCallback, useMemo } from 'react'
import { FaTimes, FaChevronRight } from 'react-icons/fa'
import { formatVNDInput } from '../../utils/currencyInput'

type NumberPadModalProps = {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
}

const QUICK_VALUES = [100, 1000, 10000, 20000]

export const NumberPadModal = ({ isOpen, onClose, value, onChange, onConfirm }: NumberPadModalProps) => {
  // Get numeric value from formatted string (remove dots)
  const getNumericValue = useCallback((formatted: string) => formatted.replace(/\./g, ''), [])
  
  const [displayValue, setDisplayValue] = useState(getNumericValue(value))

  // Sync display value when modal opens or value prop changes
  useEffect(() => {
    if (isOpen) {
      setDisplayValue(getNumericValue(value))
    }
  }, [isOpen, value, getNumericValue])

  // Update display value when prop value changes - optimized with useCallback
  const handleValueChange = useCallback((newValue: string) => {
    setDisplayValue(newValue)
    // Debounce onChange to reduce re-renders
    const formatted = formatVNDInput(newValue)
    onChange(formatted)
  }, [onChange])

  const handleNumberClick = useCallback((num: string) => {
    const newValue = displayValue + num
    handleValueChange(newValue)
  }, [displayValue, handleValueChange])

  const handleQuickValueClick = useCallback((quickValue: number) => {
    const currentValue = displayValue ? parseInt(displayValue) : 0
    const newValue = (currentValue + quickValue).toString()
    handleValueChange(newValue)
  }, [displayValue, handleValueChange])

  const handleBackspace = useCallback(() => {
    if (displayValue.length > 0) {
      handleValueChange(displayValue.slice(0, -1))
    }
  }, [displayValue, handleValueChange])

  const handleClear = useCallback(() => {
    handleValueChange('')
  }, [handleValueChange])

  const handleConfirm = useCallback(() => {
    onConfirm()
    onClose()
  }, [onConfirm, onClose])

  // Memoize formatted display to avoid recalculation
  const formattedDisplay = useMemo(() => {
    return displayValue ? formatVNDInput(displayValue) : ''
  }, [displayValue])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end backdrop-blur-sm bg-slate-950/50">
      <div className="flex w-full max-w-md mx-auto max-h-[75vh] flex-col rounded-t-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Nhập số tiền</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {formattedDisplay} ₫
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Display */}
        <div className="px-3 py-3 bg-slate-50 border-b border-slate-200">
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">
              {formattedDisplay || '0'} <span className="text-base text-slate-500">₫</span>
            </p>
            {displayValue && parseInt(displayValue) > 0 && (
              <p className="mt-0.5 text-xs text-slate-500">
                {parseInt(displayValue).toLocaleString('vi-VN')} đồng
              </p>
            )}
          </div>
        </div>

        {/* Quick Value Buttons */}
        <div className="px-3 py-2 border-b border-slate-200">
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_VALUES.map((quickValue) => (
              <button
                key={quickValue}
                type="button"
                onClick={() => handleQuickValueClick(quickValue)}
                className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:bg-slate-300"
              >
                +{formatVNDInput(quickValue.toString())}
              </button>
            ))}
          </div>
        </div>

        {/* Number Pad */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1: Clear, Divide, Multiply, Backspace */}
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl bg-emerald-100 px-2 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 active:bg-emerald-300"
            >
              C
            </button>
            <button
              type="button"
              className="rounded-xl bg-blue-100 px-2 py-3 text-sm font-semibold text-blue-700 opacity-50 cursor-not-allowed"
              disabled
            >
              ÷
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-100 px-2 py-3 text-sm font-semibold text-amber-700 opacity-50 cursor-not-allowed"
              disabled
            >
              ×
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="rounded-xl bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              ⌫
            </button>

            {/* Row 2: 7, 8, 9, Minus */}
            <button
              type="button"
              onClick={() => handleNumberClick('7')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('8')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('9')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              9
            </button>
            <button
              type="button"
              className="rounded-xl bg-rose-100 px-2 py-3 text-sm font-semibold text-rose-700 opacity-50 cursor-not-allowed"
              disabled
            >
              −
            </button>

            {/* Row 3: 4, 5, 6, Plus */}
            <button
              type="button"
              onClick={() => handleNumberClick('4')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('5')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('6')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              6
            </button>
            <button
              type="button"
              className="rounded-xl bg-emerald-100 px-2 py-3 text-sm font-semibold text-emerald-700 opacity-50 cursor-not-allowed"
              disabled
            >
              +
            </button>

            {/* Row 4: 1, 2, 3, Confirm (spans 2 rows) */}
            <button
              type="button"
              onClick={() => handleNumberClick('1')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('2')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('3')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              3
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="row-span-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 px-2 py-3 text-white shadow-md transition-colors hover:from-sky-600 hover:to-blue-700 active:from-sky-700 active:to-blue-800 flex items-center justify-center"
            >
              <FaChevronRight className="h-5 w-5" />
            </button>

            {/* Row 5: 0, 000, Comma */}
            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('000')}
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              000
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 opacity-50 cursor-not-allowed"
              disabled
            >
              ,
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

