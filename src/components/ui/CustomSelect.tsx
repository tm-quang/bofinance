import { useEffect, useRef, useState } from 'react'
import { FaChevronDown, FaCheck, FaWallet, FaFolder, FaReceipt } from 'react-icons/fa'
import { Skeleton } from '../skeletons'

type Option = {
  value: string
  label: string
  icon?: React.ReactNode
  metadata?: string
}

type CustomSelectProps = {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export const CustomSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  disabled = false,
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  className = '',
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (loading) {
    return (
      <div className={`rounded-xl border-2 border-slate-200 bg-white p-3 ${className}`}>
        <Skeleton variant="rounded" height={24} width="100%" />
      </div>
    )
  }

  // Determine icon based on emptyMessage content
  const getEmptyIcon = () => {
    const message = emptyMessage.toLowerCase()
    if (message.includes('ví')) {
      return <FaWallet className="h-5 w-5 text-amber-500" />
    } else if (message.includes('hạng mục')) {
      return <FaFolder className="h-5 w-5 text-amber-500" />
    } else if (message.includes('giao dịch')) {
      return <FaReceipt className="h-5 w-5 text-amber-500" />
    }
    return null
  }

  if (options.length === 0) {
    const emptyIcon = getEmptyIcon()
    return (
      <div className={`rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-600 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          {emptyIcon && <div className="flex items-center justify-center">{emptyIcon}</div>}
          <span>{emptyMessage}</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative flex ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex h-full w-full items-center justify-between rounded-xl border-2 bg-white p-3 text-left transition-all ${
          isOpen
            ? 'border-sky-500 shadow-lg shadow-sky-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
          !selectedOption ? 'text-slate-400' : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedOption?.icon && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-600">
              {selectedOption.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {selectedOption ? (
              <>
                <div className="truncate text-sm font-medium text-slate-900">{selectedOption.label}</div>
                {selectedOption.metadata && (
                  <div className="truncate text-xs text-slate-500">{selectedOption.metadata}</div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400">{placeholder}</div>
            )}
          </div>
        </div>
        <FaChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-2 w-full rounded-xl border-2 border-slate-200 bg-white shadow-2xl transition-all">
            <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    value === option.value
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {option.icon && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
                      {option.icon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{option.label}</div>
                    {option.metadata && <div className="text-xs text-slate-500 mt-0.5">{option.metadata}</div>}
                  </div>
                  {value === option.value && (
                    <FaCheck className="h-4 w-4 shrink-0 text-sky-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

