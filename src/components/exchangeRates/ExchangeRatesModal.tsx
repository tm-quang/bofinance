import { useEffect, useState } from 'react'
import { FaTimes, FaDollarSign, FaEuroSign, FaCoins, FaSyncAlt } from 'react-icons/fa'
import { getExchangeRates, formatCurrencyValue, formatGoldPrice, type ExchangeRatesData } from '../../lib/exchangeRateService'

type ExchangeRatesModalProps = {
  isOpen: boolean
  onClose: () => void
}

const ExchangeRatesModal = ({ isOpen, onClose }: ExchangeRatesModalProps) => {
  const [data, setData] = useState<ExchangeRatesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'currencies' | 'gold'>('currencies')

  const loadRates = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      
      // Clear cache to force refresh
      if (isRefresh) {
        sessionStorage.removeItem('exchangeRates')
      }
      
      const ratesData = await getExchangeRates()
      setData(ratesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải tỷ giá'
      setError(errorMessage)
      console.error('Error loading exchange rates:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadRates()
    }
  }, [isOpen])

  const handleRefresh = () => {
    loadRates(true)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
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

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Tỷ giá & Giá vàng</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Cập nhật tỷ giá ngoại tệ và giá vàng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 disabled:opacity-50 sm:h-10 sm:w-10"
              title="Làm mới"
            >
              <FaSyncAlt className={`h-4 w-4 sm:h-5 sm:w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
            >
              <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-6">
          <div className="flex gap-2 rounded-xl bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab('currencies')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'currencies'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaDollarSign className="h-4 w-4" />
                <span>Ngoại tệ</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gold')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'gold'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaCoins className="h-4 w-4" />
                <span>Vàng</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : error && !data ? (
            <div className="rounded-xl bg-rose-50 p-6 text-center">
              <p className="text-sm font-semibold text-rose-600 mb-2">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-sm text-rose-600 underline hover:text-rose-700"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === 'currencies' ? (
                <>
                  {!data || data.currencies.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <FaDollarSign className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">Không có dữ liệu tỷ giá</p>
                    </div>
                  ) : (
                    data.currencies.map((currency) => (
                      <div
                        key={currency.code}
                        className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-4 ring-1 ring-slate-100 transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md">
                              {currency.code === 'USD' && <FaDollarSign className="h-6 w-6" />}
                              {currency.code === 'EUR' && <FaEuroSign className="h-6 w-6" />}
                              {!['USD', 'EUR'].includes(currency.code) && (
                                <span className="text-sm font-bold">{currency.code}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{currency.name}</p>
                              <p className="text-xs text-slate-500">{currency.code}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Mua</p>
                                <p className="text-sm font-bold text-emerald-600">
                                  {formatCurrencyValue(currency.buy, 0)} đ
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Bán</p>
                                <p className="text-sm font-bold text-rose-600">
                                  {formatCurrencyValue(currency.sell, 0)} đ
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {!data || data.gold.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <FaCoins className="h-6 w-6 text-amber-400" />
                      </div>
                      <p className="text-sm text-slate-500">Không có dữ liệu giá vàng</p>
                    </div>
                  ) : (
                    data.gold.map((gold, index) => (
                      <div
                        key={index}
                        className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 p-4 ring-1 ring-amber-100 transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-md">
                              <FaCoins className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{gold.type}</p>
                              <p className="text-xs text-slate-500">Vàng</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Mua</p>
                                <p className="text-sm font-bold text-emerald-600">
                                  {formatGoldPrice(gold.buy)} đ
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Bán</p>
                                <p className="text-sm font-bold text-rose-600">
                                  {formatGoldPrice(gold.sell)} đ
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer with last updated time */}
        {data && data.lastUpdated && (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <p className="text-xs text-center text-slate-500">
              Cập nhật lúc: {formatTime(data.lastUpdated)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExchangeRatesModal

