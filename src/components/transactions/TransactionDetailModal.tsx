import { useEffect, useState } from 'react'
import { FaTimes, FaWallet, FaImage, FaTag, FaClock } from 'react-icons/fa'
import type { TransactionRecord } from '../../lib/transactionService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'
import { getIconNode } from '../../utils/iconLoader'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'

type TransactionDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  transaction: TransactionRecord | null
  categoryInfo?: {
    name: string
    icon: React.ReactNode | null
    iconId?: string
    iconUrl?: string | null
  }
  walletInfo?: {
    name: string
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const TransactionDetailModal = ({
  isOpen,
  onClose,
  transaction,
  categoryInfo,
  walletInfo,
}: TransactionDetailModalProps) => {
  const [categoryIcon, setCategoryIcon] = useState<React.ReactNode | null>(null)

  useEffect(() => {
    const loadIcon = async () => {
      if (!categoryInfo) {
        setCategoryIcon(null)
        return
      }

      // Nếu có iconId hoặc iconUrl, load icon với kích thước phù hợp
      if (categoryInfo.iconId || categoryInfo.iconUrl) {
        try {
          const iconNode = await getIconNode(categoryInfo.iconId || '')
          if (iconNode) {
            // Wrap icon với kích thước phù hợp cho modal
            setCategoryIcon(
              <span className="h-6 w-6 flex items-center justify-center overflow-hidden rounded-full">
                {iconNode}
              </span>
            )
          } else if (categoryInfo.iconUrl) {
            // Nếu có iconUrl, sử dụng trực tiếp
            setCategoryIcon(
              <img
                src={categoryInfo.iconUrl}
                alt=""
                className="h-6 w-6 object-cover rounded-full"
                onError={() => setCategoryIcon(null)}
              />
            )
          } else {
            // Fallback to hardcoded icon
            const hardcodedIcon = CATEGORY_ICON_MAP[categoryInfo.iconId || '']
            if (hardcodedIcon?.icon) {
              const IconComponent = hardcodedIcon.icon
              setCategoryIcon(<IconComponent className="h-6 w-6" />)
            } else {
              setCategoryIcon(null)
            }
          }
        } catch (error) {
          console.error('Error loading category icon:', error)
          // Fallback to hardcoded icon
          const hardcodedIcon = CATEGORY_ICON_MAP[categoryInfo.iconId || '']
          if (hardcodedIcon?.icon) {
            const IconComponent = hardcodedIcon.icon
            setCategoryIcon(<IconComponent className="h-6 w-6" />)
          } else {
            setCategoryIcon(null)
          }
        }
      } else if (categoryInfo.icon) {
        // Nếu đã có icon từ props, sử dụng nó nhưng resize
        setCategoryIcon(
          <div className="h-6 w-6 flex items-center justify-center [&>span]:!h-6 [&>span]:!w-6 [&>span>img]:!h-6 [&>span>img]:!w-6 [&>svg]:!h-6 [&>svg]:!w-6 [&>span>svg]:!h-6 [&>span>svg]:!w-6">
            {categoryInfo.icon}
          </div>
        )
      } else {
        setCategoryIcon(null)
      }
    }

    loadIcon()
  }, [categoryInfo])

  if (!isOpen || !transaction) return null

  const isIncome = transaction.type === 'Thu'
  
  // Format created_at date and time for display
  const formatCreatedAt = () => {
    try {
      const createdDate = new Date(transaction.created_at)
      const components = getDateComponentsUTC7(createdDate)
      const dateStr = `${String(components.day).padStart(2, '0')}/${String(components.month).padStart(2, '0')}/${components.year}`
      const timeStr = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`
      return `${dateStr} - ${timeStr}`
    } catch {
      return transaction.created_at
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.5)] ring-1 ring-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Chi tiết giao dịch</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {isIncome ? 'Khoản thu' : 'Khoản chi'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
            >
              <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div className="space-y-4">
              {/* Amount - Large Display */}
              <div className="text-center py-4">
                <div className={`text-3xl font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isIncome ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mô tả
                </label>
                <p className="text-base font-semibold text-slate-900">
                  {transaction.description || categoryInfo?.name || 'Không có mô tả'}
                </p>
              </div>

              {/* Category */}
              {categoryInfo && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Hạng mục
                  </label>
                  <div className="flex items-center gap-2">
                    {categoryIcon && (
                      <div className="flex items-center justify-center">
                        {categoryIcon}
                      </div>
                    )}
                    <span className="text-base font-medium text-slate-900">{categoryInfo.name}</span>
                  </div>
                </div>
              )}

              {/* Created At - Combined date and time */}
              {transaction.created_at && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ngày Tạo giao dịch
                  </label>
                  <div className="flex items-center gap-2">
                    <FaClock className="h-4 w-4 text-slate-400" />
                    <span className="text-base font-medium text-slate-900">{formatCreatedAt()}</span>
                  </div>
                </div>
              )}

              {/* Wallet */}
              {walletInfo && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ví
                  </label>
                  <div className="flex items-center gap-2">
                    <FaWallet className="h-4 w-4 text-slate-400" />
                    <span className="text-base font-medium text-slate-900">{walletInfo.name}</span>
                  </div>
                </div>
              )}

              {/* Tags */}
              {transaction.tags && transaction.tags.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {transaction.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-700"
                      >
                        <FaTag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {transaction.image_urls && Array.isArray(transaction.image_urls) && transaction.image_urls.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ảnh/Hóa đơn ({transaction.image_urls.length})
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {transaction.image_urls.filter(url => url && url.trim() !== '').map((url, index) => (
                      <div
                        key={index}
                        className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <img
                          src={url}
                          alt={`Receipt ${index + 1}`}
                          className="h-48 w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback nếu ảnh không load được
                            const target = e.target as HTMLImageElement
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <div class="flex h-48 w-full items-center justify-center bg-slate-100 rounded-xl">
                                  <div class="text-center">
                                    <svg class="h-12 w-12 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p class="text-xs text-slate-500">Không thể tải ảnh</p>
                                  </div>
                                </div>
                              `
                            }
                          }}
                        />
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all hover:bg-black/20 group-hover:opacity-100 opacity-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FaImage className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {transaction.notes && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ghi chú
                  </label>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3">
                    {transaction.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-center border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 active:scale-95"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

