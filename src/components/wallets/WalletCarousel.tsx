import { useEffect, useState } from 'react'
import { fetchWallets, getDefaultWallet, type WalletRecord } from '../../lib/walletService'
import { WalletCardSkeleton } from '../skeletons'
import { WalletCard } from './WalletCard'
import { useSwipe } from '../../hooks/useSwipe'

type WalletCarouselProps = {
  onWalletChange?: (wallet: WalletRecord) => void
  onAddWallet?: () => void
}

export const WalletCarousel = ({ onWalletChange, onAddWallet }: WalletCarouselProps) => {
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadWallets = async () => {
      try {
        // Chỉ lấy ví active, không lấy ví đã ẩn
        const data = await fetchWallets(false)
        setWallets(data)
        
        if (data.length > 0) {
          // Kiểm tra ví mặc định từ database
          let defaultWalletId: string | null = null
          try {
            defaultWalletId = await getDefaultWallet()
          } catch (error) {
            console.error('Error loading default wallet:', error)
            // Fallback về localStorage
            try {
              defaultWalletId = localStorage.getItem('bofin_default_wallet_id')
            } catch (e) {
              console.error('Error reading from localStorage:', e)
            }
          }
          
          // Tìm index của ví mặc định
          let selectedIndex = 0
          if (defaultWalletId) {
            const defaultIndex = data.findIndex(w => w.id === defaultWalletId)
            if (defaultIndex !== -1) {
              selectedIndex = defaultIndex
            }
          }
          
          // Set index để hiển thị ví mặc định (hoặc ví đầu tiên nếu không có mặc định)
          setCurrentIndex(selectedIndex)
          
          if (onWalletChange) {
            onWalletChange(data[selectedIndex])
          }
        }
      } catch (error) {
        console.error('Error loading wallets:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWallets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swipe left (translateX < 0) = next wallet
  const handleSwipeLeft = () => {
    if (currentIndex < wallets.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      if (onWalletChange && wallets[newIndex]) {
        onWalletChange(wallets[newIndex])
      }
    }
  }

  // Swipe right (translateX > 0) = previous wallet
  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      if (onWalletChange && wallets[newIndex]) {
        onWalletChange(wallets[newIndex])
      }
    }
  }

  const swipe = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
  })

  if (isLoading) {
    return <WalletCardSkeleton />
  }

  if (wallets.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-3xl bg-slate-100">
        <p className="mb-4 text-sm text-slate-500">Chưa có ví nào</p>
        {onAddWallet && (
          <button
            onClick={onAddWallet}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700"
          >
            Thêm ví mới
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Card container with swipe */}
      <div
        className="relative overflow-hidden"
        onTouchStart={swipe.handleTouchStart}
        onTouchMove={swipe.handleTouchMove}
        onTouchEnd={swipe.handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${swipe.translateX}px))`,
          }}
        >
          {wallets.map((wallet, index) => {
            // Lấy ví mặc định từ database (sẽ được cache trong state)
            // Tạm thời dùng localStorage để check, sẽ được cập nhật khi load
            const defaultWalletId = localStorage.getItem('bofin_default_wallet_id')
            const isDefault = defaultWalletId === wallet.id
            return (
              <div key={wallet.id} className="min-w-full flex-shrink-0">
                {/* Sử dụng wallet.id làm key để tránh re-render không cần thiết */}
                <WalletCard 
                  key={wallet.id}
                  wallet={wallet} 
                  isActive={index === currentIndex} 
                  isDefault={isDefault} 
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination dots and Add button */}
      <div className="mt-4 flex items-center justify-center gap-3">
        {/* Pagination dots */}
        {wallets.length > 1 && (
          <div className="flex items-center gap-2">
            {wallets.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setCurrentIndex(index)
                  if (onWalletChange && wallets[index]) {
                    onWalletChange(wallets[index])
                  }
                }}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'w-6 bg-slate-900' : 'w-2 bg-slate-300'
                }`}
                aria-label={`Chọn ví ${index + 1}`}
              />
            ))}
          </div>
        )}
        
        {/* Add wallet button */}
        {onAddWallet && (
          <button
            onClick={onAddWallet}
            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-1 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-105 active:scale-95 sm:px-6 sm:py-3 sm:text-base"
            aria-label="Quản lý ví của bạn"
          >
            <span>Quản lý ví của bạn</span>
          </button>
        )}
      </div>
    </div>
  )
}

