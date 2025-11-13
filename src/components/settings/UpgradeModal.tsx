import { useState } from 'react'
import { RiCheckLine, RiCloseLine, RiSparkling2Line, RiVipCrownLine } from 'react-icons/ri'

type UpgradeModalProps = {
  isOpen: boolean
  onClose: () => void
}

const features = [
  { name: 'Báo cáo tài chính chuyên sâu', included: true },
  { name: 'AI gợi ý quản lý tài chính', included: true },
  { name: 'Tăng giới hạn ngân sách không giới hạn', included: true },
  { name: 'Xuất dữ liệu Excel/PDF', included: true },
  { name: 'Hỗ trợ ưu tiên 24/7', included: true },
  { name: 'Quảng cáo miễn phí', included: true },
  { name: 'Đồng bộ đa thiết bị', included: true },
]

export const UpgradeModal = ({ isOpen, onClose }: UpgradeModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-md bg-slate-950/50">
      <div className="flex w-full max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-br from-amber-50 via-amber-50/50 to-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg sm:h-14 sm:w-14">
              <RiVipCrownLine className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Nâng cấp BoFin+</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Trải nghiệm đầy đủ tính năng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <RiCloseLine className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {/* Plan Selector */}
          <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selectedPlan === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hàng tháng
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan('yearly')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selectedPlan === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hàng năm <span className="text-xs text-emerald-600">(-20%)</span>
            </button>
          </div>

          {/* Pricing */}
          <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <RiSparkling2Line className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">Ưu đãi đặc biệt</span>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-bold text-slate-900">
                {selectedPlan === 'monthly' ? '99.000' : '950.000'}
              </span>
              <span className="text-lg text-slate-600">₫</span>
            </div>
            <p className="text-sm text-slate-500">
              {selectedPlan === 'monthly' ? '/tháng' : '/năm (tiết kiệm 238.000₫)'}
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Tính năng BoFin+</h3>
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <RiCheckLine className="h-4 w-4" />
                </div>
                <span className="text-sm text-slate-700">{feature.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-amber-600 hover:to-orange-700 sm:py-3.5 sm:text-base"
          >
            Nâng cấp ngay
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Hủy bất cứ lúc nào. Không có phí ẩn.
          </p>
        </div>
      </div>
    </div>
  )
}

