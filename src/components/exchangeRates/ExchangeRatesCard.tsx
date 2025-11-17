import { useEffect, useState } from 'react'
import { FaDollarSign, FaEuroSign, FaCoins, FaSyncAlt } from 'react-icons/fa'
import { getExchangeRates, formatCurrencyValue, formatGoldPrice, type ExchangeRatesData } from '../../lib/exchangeRateService'

type ExchangeRatesCardProps = {
  className?: string
}

const ExchangeRatesCard = ({ className = '' }: ExchangeRatesCardProps) => {
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
    loadRates()
  }, [])

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

  if (isLoading) {
    return (
      <div className={`rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Tỷ giá & Giá vàng</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className={`rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Tỷ giá & Giá vàng</h2>
        </div>
        <div className="rounded-xl bg-rose-50 p-4 text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-rose-600 underline hover:text-rose-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  if (!data || (data.currencies.length === 0 && data.gold.length === 0)) {
    return null
  }

  return (
    <div className={`rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">Tỷ giá & Giá vàng</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          title="Làm mới"
        >
          <FaSyncAlt className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 rounded-xl bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('currencies')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'currencies'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
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
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'gold'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FaCoins className="h-4 w-4" />
            <span>Vàng</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {activeTab === 'currencies' ? (
          <>
            {data.currencies.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Không có dữ liệu tỷ giá</p>
            ) : (
              data.currencies.map((currency) => (
                <div
                  key={currency.code}
                  className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-4 ring-1 ring-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white">
                        {currency.code === 'USD' && <FaDollarSign className="h-5 w-5" />}
                        {currency.code === 'EUR' && <FaEuroSign className="h-5 w-5" />}
                        {!['USD', 'EUR'].includes(currency.code) && (
                          <span className="text-xs font-bold">{currency.code}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{currency.name}</p>
                        <p className="text-xs text-slate-500">{currency.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Mua</p>
                          <p className="text-sm font-bold text-emerald-600">
                            {formatCurrencyValue(currency.buy, 0)} đ
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Bán</p>
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
            {data.gold.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Không có dữ liệu giá vàng</p>
            ) : (
              data.gold.map((gold, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 p-4 ring-1 ring-amber-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white">
                        <FaCoins className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{gold.type}</p>
                        <p className="text-xs text-slate-500">Vàng</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Mua</p>
                          <p className="text-sm font-bold text-emerald-600">
                            {formatGoldPrice(gold.buy)} đ
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Bán</p>
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

      {/* Footer with last updated time */}
      {data.lastUpdated && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-center text-slate-500">
            Cập nhật lúc: {formatTime(data.lastUpdated)}
          </p>
        </div>
      )}
    </div>
  )
}

export default ExchangeRatesCard

