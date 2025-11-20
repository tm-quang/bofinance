import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FaTimes, FaChevronRight } from 'react-icons/fa'
import { formatVNDInput } from '../../utils/currencyInput'

type NumberPadModalProps = {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
}

const QUICK_VALUES = [10000, 30000, 50000, 100000]

const getNumericValue = (formatted: string) => formatted.replace(/\./g, '')

// Memoized button component for better performance
const NumberButton = ({ 
  children, 
  onClick, 
  className = '',
  disabled = false 
}: { 
  children: React.ReactNode
  onClick: () => void
  className?: string
  disabled?: boolean
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!disabled && buttonRef.current) {
      buttonRef.current.classList.add('active-touch')
    }
  }, [disabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!disabled) {
      onClick()
    }
    if (buttonRef.current) {
      buttonRef.current.classList.remove('active-touch')
    }
  }, [disabled, onClick])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (!disabled && buttonRef.current) {
      buttonRef.current.classList.add('active-touch')
    }
  }, [disabled])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (!disabled) {
      onClick()
    }
    if (buttonRef.current) {
      buttonRef.current.classList.remove('active-touch')
    }
  }, [disabled, onClick])

  const handleMouseLeave = useCallback(() => {
    if (buttonRef.current) {
      buttonRef.current.classList.remove('active-touch')
    }
  }, [])

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`touch-manipulation select-none ${className}`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  )
}

export const NumberPadModal = ({ isOpen, onClose, value, onChange, onConfirm }: NumberPadModalProps) => {
  const [displayValue, setDisplayValue] = useState(getNumericValue(value))
  const isUpdatingRef = useRef(false)

  // Sync display value when modal opens or value prop changes
  useEffect(() => {
    if (isOpen) {
      setDisplayValue(getNumericValue(value))
    }
  }, [isOpen, value])

  // Update display value when prop value changes - optimized with useCallback
  const handleValueChange = useCallback((newValue: string) => {
    if (isUpdatingRef.current) return
    isUpdatingRef.current = true
    
    setDisplayValue(newValue)
    const formatted = formatVNDInput(newValue)
    onChange(formatted)
    
    // Reset flag after a short delay to allow rapid clicks
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 50)
  }, [onChange])

  // Memoize number click handlers
  const handleNumberClick = useCallback((num: string) => {
    const newValue = displayValue + num
    handleValueChange(newValue)
  }, [displayValue, handleValueChange])

  // Memoize quick value handlers
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
    <>
      <style>{`
        .touch-manipulation {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
        }
        .active-touch {
          transform: scale(0.95);
          opacity: 0.8;
        }
        .number-pad-button {
          transition: transform 0.1s ease-out, opacity 0.1s ease-out, background-color 0.15s ease-out;
          will-change: transform, opacity;
        }
        .number-pad-button:active {
          transform: scale(0.95);
        }
      `}</style>
      <div 
        className="fixed inset-0 z-[60] flex items-end backdrop-blur-sm bg-slate-950/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
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
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300 active:scale-95 touch-manipulation"
              style={{ touchAction: 'manipulation' }}
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
                <NumberButton
                  key={quickValue}
                  onClick={() => handleQuickValueClick(quickValue)}
                  className="number-pad-button rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  +{formatVNDInput(quickValue.toString())}
                </NumberButton>
              ))}
            </div>
          </div>

          {/* Number Pad */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="grid grid-cols-4 gap-1.5">
              {/* Row 1: Clear, Divide, Multiply, Backspace */}
              <NumberButton
                onClick={handleClear}
                className="number-pad-button rounded-xl bg-emerald-100 px-2 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
              >
                C
              </NumberButton>
              <NumberButton
                onClick={() => {}}
                disabled
                className="rounded-xl bg-blue-100 px-2 py-3 text-sm font-semibold text-blue-700 opacity-50 cursor-not-allowed"
              >
                ÷
              </NumberButton>
              <NumberButton
                onClick={() => {}}
                disabled
                className="rounded-xl bg-amber-100 px-2 py-3 text-sm font-semibold text-amber-700 opacity-50 cursor-not-allowed"
              >
                ×
              </NumberButton>
              <NumberButton
                onClick={handleBackspace}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                ⌫
              </NumberButton>

              {/* Row 2: 7, 8, 9, Minus */}
              <NumberButton
                onClick={() => handleNumberClick('7')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                7
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('8')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                8
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('9')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                9
              </NumberButton>
              <NumberButton
                onClick={() => {}}
                disabled
                className="rounded-xl bg-rose-100 px-2 py-3 text-sm font-semibold text-rose-700 opacity-50 cursor-not-allowed"
              >
                −
              </NumberButton>

              {/* Row 3: 4, 5, 6, Plus */}
              <NumberButton
                onClick={() => handleNumberClick('4')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                4
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('5')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                5
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('6')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                6
              </NumberButton>
              <NumberButton
                onClick={() => {}}
                disabled
                className="rounded-xl bg-emerald-100 px-2 py-3 text-sm font-semibold text-emerald-700 opacity-50 cursor-not-allowed"
              >
                +
              </NumberButton>

              {/* Row 4: 1, 2, 3, Confirm (spans 2 rows) */}
              <NumberButton
                onClick={() => handleNumberClick('1')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                1
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('2')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                2
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('3')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                3
              </NumberButton>
              <NumberButton
                onClick={handleConfirm}
                className="number-pad-button row-span-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 px-2 py-3 text-white shadow-md hover:from-sky-600 hover:to-blue-700 flex items-center justify-center"
              >
                <FaChevronRight className="h-5 w-5" />
              </NumberButton>

              {/* Row 5: 0, 000, Comma */}
              <NumberButton
                onClick={() => handleNumberClick('0')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                0
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('000')}
                className="number-pad-button rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 hover:bg-slate-200"
              >
                000
              </NumberButton>
              <NumberButton
                onClick={() => {}}
                disabled
                className="rounded-xl bg-slate-100 px-2 py-3 text-base font-semibold text-slate-900 opacity-50 cursor-not-allowed"
              >
                ,
              </NumberButton>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
