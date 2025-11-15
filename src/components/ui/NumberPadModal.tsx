import { useState, useEffect } from 'react'
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
  const getNumericValue = (formatted: string) => formatted.replace(/\./g, '')
  
  const [displayValue, setDisplayValue] = useState(getNumericValue(value))

  // Sync display value when modal opens or value prop changes
  useEffect(() => {
    if (isOpen) {
      setDisplayValue(getNumericValue(value))
    }
  }, [isOpen, value])

  // Update display value when prop value changes
  const handleValueChange = (newValue: string) => {
    setDisplayValue(newValue)
    const formatted = formatVNDInput(newValue)
    onChange(formatted)
  }

  const handleNumberClick = (num: string) => {
    handleValueChange(displayValue + num)
  }

  const handleQuickValueClick = (quickValue: number) => {
    const currentValue = displayValue ? parseInt(displayValue) : 0
    const newValue = (currentValue + quickValue).toString()
    handleValueChange(newValue)
  }

  const handleBackspace = () => {
    if (displayValue.length > 0) {
      handleValueChange(displayValue.slice(0, -1))
    }
  }

  const handleClear = () => {
    handleValueChange('')
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

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

  const formattedDisplay = displayValue ? formatVNDInput(displayValue) : ''

  return (
    <div className="fixed inset-0 z-[60] flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 sm:text-lg">Nhập số tiền</h3>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {formattedDisplay} ₫
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Display */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-slate-50 border-b border-slate-200">
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {formattedDisplay || '0'} <span className="text-xl text-slate-500">₫</span>
            </p>
            {displayValue && parseInt(displayValue) > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                {parseInt(displayValue).toLocaleString('vi-VN')} đồng
              </p>
            )}
          </div>
        </div>

        {/* Quick Value Buttons */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200">
          <div className="grid grid-cols-4 gap-2">
            {QUICK_VALUES.map((quickValue) => (
              <button
                key={quickValue}
                type="button"
                onClick={() => handleQuickValueClick(quickValue)}
                className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200 hover:scale-105 active:scale-95"
              >
                +{formatVNDInput(quickValue.toString())}
              </button>
            ))}
          </div>
        </div>

        {/* Number Pad */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-4 gap-2">
            {/* Row 1: Clear, Divide, Multiply, Backspace */}
            <button
              type="button"
              onClick={handleClear}
              className="rounded-2xl bg-emerald-100 px-4 py-4 text-base font-semibold text-emerald-700 transition-all hover:bg-emerald-200 active:scale-95"
            >
              C
            </button>
            <button
              type="button"
              className="rounded-2xl bg-blue-100 px-4 py-4 text-base font-semibold text-blue-700 transition-all hover:bg-blue-200 active:scale-95 opacity-50 cursor-not-allowed"
              disabled
            >
              ÷
            </button>
            <button
              type="button"
              className="rounded-2xl bg-amber-100 px-4 py-4 text-base font-semibold text-amber-700 transition-all hover:bg-amber-200 active:scale-95 opacity-50 cursor-not-allowed"
              disabled
            >
              ×
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-base font-semibold text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
            >
              ⌫
            </button>

            {/* Row 2: 7, 8, 9, Minus */}
            <button
              type="button"
              onClick={() => handleNumberClick('7')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('8')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('9')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              9
            </button>
            <button
              type="button"
              className="rounded-2xl bg-rose-100 px-4 py-4 text-base font-semibold text-rose-700 transition-all hover:bg-rose-200 active:scale-95 opacity-50 cursor-not-allowed"
              disabled
            >
              −
            </button>

            {/* Row 3: 4, 5, 6, Plus */}
            <button
              type="button"
              onClick={() => handleNumberClick('4')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('5')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('6')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              6
            </button>
            <button
              type="button"
              className="rounded-2xl bg-emerald-100 px-4 py-4 text-base font-semibold text-emerald-700 transition-all hover:bg-emerald-200 active:scale-95 opacity-50 cursor-not-allowed"
              disabled
            >
              +
            </button>

            {/* Row 4: 1, 2, 3, Confirm (spans 2 rows) */}
            <button
              type="button"
              onClick={() => handleNumberClick('1')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('2')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('3')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              3
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="row-span-2 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 px-4 py-4 text-white shadow-lg transition-all hover:from-sky-600 hover:to-blue-700 active:scale-95 flex items-center justify-center"
            >
              <FaChevronRight className="h-6 w-6" />
            </button>

            {/* Row 5: 0, 000, Comma */}
            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('000')}
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            >
              000
            </button>
            <button
              type="button"
              className="rounded-2xl bg-slate-100 px-4 py-4 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-200 active:scale-95 opacity-50 cursor-not-allowed"
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

