import { useEffect, useState } from 'react'
import { fetchWallets, type WalletRecord } from '../../lib/walletService'
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
        const data = await fetchWallets()
        setWallets(data.filter((w) => w.is_active))
        if (data.length > 0 && onWalletChange) {
          onWalletChange(data[0])
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
          {wallets.map((wallet, index) => (
            <div key={wallet.id} className="min-w-full flex-shrink-0">
              <WalletCard wallet={wallet} isActive={index === currentIndex} />
            </div>
          ))}
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
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 sm:px-4 sm:py-2 sm:text-sm"
            aria-label="Thêm ví mới"
          >
            <span className="text-base sm:text-lg">+</span>
            <span>Thêm ví</span>
          </button>
        )}
      </div>
    </div>
  )
}

