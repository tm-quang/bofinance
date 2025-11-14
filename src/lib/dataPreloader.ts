/**
 * Data Preloader Service
 * Tải và cache toàn bộ dữ liệu khi người dùng đăng nhập
 * Cache tồn tại trong suốt phiên đăng nhập và lưu vào localStorage
 */

import { fetchWallets } from './walletService'
import { fetchTransactions } from './transactionService'
import { fetchCategories } from './categoryService'
import { getCurrentProfile } from './profileService'
import { getDefaultWallet } from './walletService'
import { cacheManager } from './cache'
import { getCachedUser } from './userCache'

export type PreloadStatus = {
  isPreloading: boolean
  progress: number
  currentStep: string
  error: string | null
}

/**
 * Preload toàn bộ dữ liệu cho user hiện tại
 * Cache tất cả dữ liệu với TTL dài (24 giờ cho session cache)
 */
export const preloadAllData = async (onProgress?: (status: PreloadStatus) => void): Promise<void> => {
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để preload dữ liệu.')
  }

  const userId = user.id
  const totalSteps = 5
  let currentStep = 0

  const updateProgress = (step: string) => {
    currentStep++
    onProgress?.({
      isPreloading: currentStep < totalSteps,
      progress: Math.round((currentStep / totalSteps) * 100),
      currentStep: step,
      error: null,
    })
  }

  try {
    // Step 1: Load Profile (persistent cache - lưu vào thiết bị)
    updateProgress('Đang tải thông tin cá nhân...')
    const profileKey = await cacheManager.generateKey('getCurrentProfile', {})
    const profileData = await getCurrentProfile()
    // Cache profile với TTL 24 giờ (persistent)
    await cacheManager.set(profileKey, profileData, 24 * 60 * 60 * 1000)

    // Step 2: Load Wallets (active và inactive)
    updateProgress('Đang tải danh sách ví...')
    const [activeWallets, allWallets] = await Promise.all([
      fetchWallets(false), // Active wallets
      fetchWallets(true),  // All wallets (active + inactive)
    ])
    // Cache đã được set trong fetchWallets, nhưng đảm bảo TTL dài
    const activeWalletsKey = await cacheManager.generateKey('fetchWallets', { includeInactive: false })
    const allWalletsKey = await cacheManager.generateKey('fetchWallets', { includeInactive: true })
    await cacheManager.set(activeWalletsKey, activeWallets, 24 * 60 * 60 * 1000) // 24 giờ
    await cacheManager.set(allWalletsKey, allWallets, 24 * 60 * 60 * 1000) // 24 giờ

    // Step 3: Load Default Wallet
    updateProgress('Đang tải ví mặc định...')
    const defaultWalletId = await getDefaultWallet()
    if (defaultWalletId) {
      const defaultWalletKey = await cacheManager.generateKey('getDefaultWallet', {})
      await cacheManager.set(defaultWalletKey, defaultWalletId, 24 * 60 * 60 * 1000)
    }

    // Step 4: Load Categories
    updateProgress('Đang tải danh mục...')
    await fetchCategories()
    // Cache đã được set trong fetchCategories

    // Step 5: Load Recent Transactions (limit để không quá nặng)
    updateProgress('Đang tải giao dịch gần đây...')
    await fetchTransactions({ limit: 50 })
    // Cache đã được set trong fetchTransactions

    // Mark preload as complete
    updateProgress('Hoàn tất!')
    
    // Lưu timestamp preload để biết khi nào cần refresh
    const preloadTimestampKey = `bofin_preload_timestamp_${userId}`
    localStorage.setItem(preloadTimestampKey, Date.now().toString())

    console.log('✅ Preload completed successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định'
    onProgress?.({
      isPreloading: false,
      progress: 0,
      currentStep: 'Lỗi khi tải dữ liệu',
      error: errorMessage,
    })
    throw error
  }
}

/**
 * Kiểm tra xem dữ liệu đã được preload chưa
 */
export const isDataPreloaded = async (): Promise<boolean> => {
  const user = await getCachedUser()

  if (!user) return false

  const userId = user.id
  const preloadTimestampKey = `bofin_preload_timestamp_${userId}`
  const timestamp = localStorage.getItem(preloadTimestampKey)

  if (!timestamp) return false

  // Kiểm tra xem preload có còn valid không (trong vòng 24 giờ)
  const preloadTime = parseInt(timestamp, 10)
  const now = Date.now()
  const hoursSincePreload = (now - preloadTime) / (1000 * 60 * 60)

  return hoursSincePreload < 24
}

/**
 * Clear preload timestamp (khi logout hoặc clear cache)
 */
export const clearPreloadTimestamp = async (): Promise<void> => {
  const user = await getCachedUser()

  if (user) {
    const userId = user.id
    const preloadTimestampKey = `bofin_preload_timestamp_${userId}`
    localStorage.removeItem(preloadTimestampKey)
  }
}

