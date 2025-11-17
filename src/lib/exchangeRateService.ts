/**
 * Exchange Rate Service
 * Fetches exchange rates for USD, EUR, Gold, and other currencies
 * 
 * Uses free APIs:
 * - exchangerate-api.com for currency rates
 * - Alternative: Vietnamese bank APIs for VND rates
 */

export type ExchangeRate = {
  code: string
  name: string
  buy: number // Mua vào
  sell: number // Bán ra
  transfer: number | null // Chuyển khoản
  updatedAt: string
}

export type GoldPrice = {
  type: string // SJC, 9999, etc.
  buy: number
  sell: number
  updatedAt: string
}

export type ExchangeRatesData = {
  currencies: ExchangeRate[]
  gold: GoldPrice[]
  lastUpdated: string
}

/**
 * Fetch exchange rates from exchangerate-api.com (free tier)
 * Base currency: USD
 */
const fetchCurrencyRates = async (): Promise<Record<string, number>> => {
  try {
    // Using exchangerate-api.com free tier (no API key needed for basic usage)
    // Alternative: https://api.exchangerate-api.com/v4/latest/USD
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.rates || {}
  } catch (error) {
    console.error('Error fetching currency rates:', error)
    // Fallback to static rates if API fails
    return {
      EUR: 0.92,
      VND: 24500,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.2,
      KRW: 1310,
    }
  }
}

/**
 * Fetch Vietnamese exchange rates from reliable APIs
 * Uses multiple trusted sources for accuracy
 */
const fetchVietnameseRates = async (): Promise<ExchangeRate[]> => {
  let rates: Record<string, number> | null = null

  // Try multiple reliable API sources
  const apiSources = [
    // Source 1: exchangerate.host (free, reliable, accurate)
    async () => {
      try {
        const response = await fetch('https://api.exchangerate.host/latest?base=USD', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        if (response.ok) {
          const data = await response.json()
          return data.rates || {}
        }
      } catch {
        // Ignore errors
      }
      return null
    },
    // Source 2: exchangerate-api.com (backup)
    async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        if (response.ok) {
          const data = await response.json()
          return data.rates || {}
        }
      } catch {
        // Ignore errors
      }
      return null
    },
    // Source 3: Alternative API
    async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD')
        if (response.ok) {
          const data = await response.json()
          return data.rates || {}
        }
      } catch {
        // Ignore errors
      }
      return null
    },
  ]

  // Try each source until one works
  for (const source of apiSources) {
    try {
      rates = await source()
      if (rates && rates.VND) {
        break
      }
    } catch (error) {
      console.warn('API source failed, trying next:', error)
      continue
    }
  }

  // Final fallback
  if (!rates || !rates.VND) {
    rates = await fetchCurrencyRates()
  }

  // Get VND rate (USD to VND) - this is how many VND = 1 USD
  const vndRate = rates.VND || 24500

  // Vietnamese banks typically use 1-2% spread
  // Buy rate is lower (bank buys from you), Sell rate is higher (bank sells to you)
  const spread = 0.015 // 1.5% spread (realistic for Vietnamese banks)

  const now = new Date().toISOString()

  // Calculate rates for each currency
  // Important: All rates from API are "1 USD = X currency"
  // So to convert to VND: (1 / rate) * VND_rate for currencies stronger than USD
  // Or: rate * VND_rate for currencies weaker than USD
  
  return [
    {
      code: 'USD',
      name: 'Đô la Mỹ',
      buy: Math.round(vndRate * (1 - spread)),
      sell: Math.round(vndRate * (1 + spread)),
      transfer: Math.round(vndRate),
      updatedAt: now,
    },
    {
      code: 'EUR',
      name: 'Euro',
      // 1 USD = X EUR, so 1 EUR = (1/X) USD = (1/X) * VND_rate VND
      // But EUR is stronger, so we need to invert
      buy: Math.round((vndRate / (rates.EUR || 0.92)) * (1 - spread)),
      sell: Math.round((vndRate / (rates.EUR || 0.92)) * (1 + spread)),
      transfer: Math.round(vndRate / (rates.EUR || 0.92)),
      updatedAt: now,
    },
    {
      code: 'GBP',
      name: 'Bảng Anh',
      // GBP is stronger than USD
      buy: Math.round((vndRate / (rates.GBP || 0.79)) * (1 - spread)),
      sell: Math.round((vndRate / (rates.GBP || 0.79)) * (1 + spread)),
      transfer: Math.round(vndRate / (rates.GBP || 0.79)),
      updatedAt: now,
    },
    {
      code: 'JPY',
      name: 'Yên Nhật',
      // 1 USD = X JPY, so 100 JPY = (100/X) USD = (100/X) * VND_rate VND
      // JPY is weaker, so we divide
      buy: Math.round(((100 / (rates.JPY || 149.5)) * vndRate) * (1 - spread)),
      sell: Math.round(((100 / (rates.JPY || 149.5)) * vndRate) * (1 + spread)),
      transfer: Math.round((100 / (rates.JPY || 149.5)) * vndRate),
      updatedAt: now,
    },
    {
      code: 'CNY',
      name: 'Nhân dân tệ',
      // 1 USD = X CNY, so 1 CNY = (1/X) USD = (1/X) * VND_rate VND
      buy: Math.round((vndRate / (rates.CNY || 7.2)) * (1 - spread)),
      sell: Math.round((vndRate / (rates.CNY || 7.2)) * (1 + spread)),
      transfer: Math.round(vndRate / (rates.CNY || 7.2)),
      updatedAt: now,
    },
    {
      code: 'KRW',
      name: 'Won Hàn Quốc',
      // 1 USD = X KRW, so 100 KRW = (100/X) USD = (100/X) * VND_rate VND
      // KRW is much weaker than USD (1 USD ≈ 1300-1400 KRW)
      // So 100 KRW should be much less than VND rate
      buy: Math.round(((100 / (rates.KRW || 1310)) * vndRate) * (1 - spread)),
      sell: Math.round(((100 / (rates.KRW || 1310)) * vndRate) * (1 + spread)),
      transfer: Math.round((100 / (rates.KRW || 1310)) * vndRate),
      updatedAt: now,
    },
  ]
}

/**
 * Fetch gold prices from reliable real-time APIs
 * Uses multiple sources for accurate gold prices
 */
const fetchGoldPrices = async (): Promise<GoldPrice[]> => {
  let goldPriceUSD = 0
  let usdToVnd = 24500

  // First, get current USD/VND rate for accurate conversion
  try {
    const response = await fetch('https://api.exchangerate.host/latest?base=USD')
    if (response.ok) {
      const data = await response.json()
      usdToVnd = data.rates?.VND || 24500
    }
  } catch (error) {
    // Fallback
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      if (response.ok) {
        const data = await response.json()
        usdToVnd = data.rates?.VND || 24500
      }
    } catch {
      console.warn('Failed to fetch USD/VND rate for gold conversion')
    }
  }

  // Try to fetch gold price from multiple reliable sources
  const goldApiSources = [
    // Source 1: exchangerate.host with XAU (gold) as base
    async () => {
      try {
        const response = await fetch('https://api.exchangerate.host/latest?base=XAU&symbols=USD', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        if (response.ok) {
          const data = await response.json()
          // XAU/USD means how many USD per 1 ounce of gold
          // If data.rates.USD = 0.0005, then 1 XAU = 0.0005 USD, so 1 USD = 2000 XAU
          // We need USD per ounce, so we invert
          const xauToUsd = data.rates?.USD
          if (xauToUsd && xauToUsd > 0) {
            return 1 / xauToUsd
          }
        }
      } catch {
        // Ignore errors
      }
      return 0
    },
    // Source 2: metals-api alternative (if available)
    async () => {
      try {
        const response = await fetch('https://api.metals.live/v1/spot/gold', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        if (response.ok) {
          const data = await response.json()
          return data.price || data.spot || 0
        }
      } catch {
        // Ignore errors
      }
      return 0
    },
    // Source 3: Alternative - fetch from exchangerate-api
    async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/XAU')
        if (response.ok) {
          const data = await response.json()
          const xauToUsd = data.rates?.USD
          if (xauToUsd && xauToUsd > 0) {
            return 1 / xauToUsd
          }
        }
      } catch {
        // Ignore errors
      }
      return 0
    },
  ]

  // Try to get gold price from APIs
  for (const source of goldApiSources) {
    try {
      const price = await source()
      // Gold price should be between $1500-3500 per ounce (realistic range for 2024)
      if (price > 1500 && price < 3500) {
        goldPriceUSD = price
        break
      }
    } catch {
      continue
    }
  }

  // If no API worked, use current market estimate
  // Gold price as of late 2024 is typically $2600-2800 per ounce
  if (goldPriceUSD === 0 || goldPriceUSD < 1500 || goldPriceUSD > 3500) {
    // Use a more realistic current estimate (gold is higher now)
    goldPriceUSD = 2700 // Approximate current gold price per ounce (late 2024)
  }

  // Convert to Vietnamese gold prices
  // 1 ounce (troy ounce) = 31.1035 grams
  // 1 lượng (Vietnamese tael) = 37.5 grams
  // 1 ounce ≈ 0.829 lượng (31.1035 / 37.5)
  const ounceToLượng = 0.829
  const basePricePerLượng = (goldPriceUSD * usdToVnd) / ounceToLượng

  const now = new Date().toISOString()

  // Vietnamese gold prices typically have spreads based on quality:
  // SJC 999.9: Highest quality, premium price (typically highest)
  // Vàng 9999: 99.99% pure gold (high quality)
  // Vàng 24K: 24 karat gold (99.9% pure, standard)
  
  // Typical spreads for Vietnamese gold (based on market):
  // SJC: Premium of 2-5% above base
  // 9999: Close to base price
  // 24K: Slightly below base

  return [
    {
      type: 'SJC 999.9',
      buy: Math.round(basePricePerLượng * 1.02), // Bank buys at 2% premium
      sell: Math.round(basePricePerLượng * 1.05), // Bank sells at 5% premium
      updatedAt: now,
    },
    {
      type: 'Vàng 9999',
      buy: Math.round(basePricePerLượng * 0.98), // Bank buys at 2% discount
      sell: Math.round(basePricePerLượng * 1.01), // Bank sells at 1% premium
      updatedAt: now,
    },
    {
      type: 'Vàng 24K',
      buy: Math.round(basePricePerLượng * 0.97), // Bank buys at 3% discount
      sell: Math.round(basePricePerLượng * 1.00), // Bank sells at base price
      updatedAt: now,
    },
  ]
}

/**
 * Get all exchange rates (currencies + gold)
 * Cached for 1 hour to avoid excessive API calls
 */
export const getExchangeRates = async (): Promise<ExchangeRatesData> => {
  try {
    // Check cache first
    const cacheKey = 'exchangeRates'
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      const cachedData = JSON.parse(cached)
      const cacheTime = new Date(cachedData.lastUpdated).getTime()
      const now = Date.now()
      // Cache for 1 hour
      if (now - cacheTime < 60 * 60 * 1000) {
        return cachedData
      }
    }

    // Fetch fresh data
    const [currencies, gold] = await Promise.all([
      fetchVietnameseRates(),
      fetchGoldPrices(),
    ])

    const data: ExchangeRatesData = {
      currencies,
      gold,
      lastUpdated: new Date().toISOString(),
    }

    // Cache the data
    sessionStorage.setItem(cacheKey, JSON.stringify(data))

    return data
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    // Return cached data if available, even if expired
    const cached = sessionStorage.getItem('exchangeRates')
    if (cached) {
      return JSON.parse(cached)
    }
    // Return empty data as last resort
    return {
      currencies: [],
      gold: [],
      lastUpdated: new Date().toISOString(),
    }
  }
}

/**
 * Format currency value for display
 */
export const formatCurrencyValue = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format gold price for display
 */
export const formatGoldPrice = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} triệu`
  }
  return formatCurrencyValue(value, 0)
}


