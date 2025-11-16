import { useEffect, useState, type ReactNode } from 'react'
import { FaBell, FaArrowLeft, FaRedoAlt } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

type HeaderBarProps =
  | {
    variant?: 'greeting'
    userName: string
    avatarUrl?: string
    avatarText?: string
    badgeColor?: string
    onNotificationClick?: () => void
    onReload?: () => void | Promise<void>
    unreadNotificationCount?: number
    isReloading?: boolean
  }
  | {
    variant: 'page'
    title: string
    onBack?: () => void
    showIcon?: ReactNode
  }

const HeaderBar = (props: HeaderBarProps) => {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Check both window scroll and scrollable main elements
      const windowScroll = window.scrollY || document.documentElement.scrollTop
      const mainElements = document.querySelectorAll('main')
      let maxScroll = windowScroll

      mainElements.forEach((main) => {
        if (main.scrollTop > maxScroll) {
          maxScroll = main.scrollTop
        }
      })

      setIsScrolled(maxScroll > 20)
    }

    // Listen to scroll on window
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Also listen to scroll on all main elements (for overflow-y-auto containers)
    const mainElements = document.querySelectorAll('main')
    mainElements.forEach((main) => {
      main.addEventListener('scroll', handleScroll, { passive: true })
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      mainElements.forEach((main) => {
        main.removeEventListener('scroll', handleScroll)
      })
    }
  }, [])

  if (props.variant === 'page') {
    const { title, onBack, showIcon } = props
    return (
      <header className="pointer-events-none relative z-40 flex-shrink-0 bg-[#F7F9FC]">
      {isScrolled && (
        <div className="absolute inset-0 bg-white" aria-hidden="true" />
      )}
      <div className="relative px-1 py-1">
        <div
          className={`pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2 transition-all duration-300 ${
            isScrolled
              ? 'bg-transparent'
              : 'bg-transparent'
          }`}
        >
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100"
            aria-label="Quay lại"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
            {title}
          </p>
          <div className="flex h-11 w-11 items-center justify-center text-slate-500">
            {showIcon ?? null}
          </div>
          </div>
        </div>
      </header>
    )
  }

  const { 
    userName, 
    avatarUrl, 
    avatarText = userName.charAt(0).toUpperCase(), 
    badgeColor = 'bg-sky-600',
    onNotificationClick,
    onReload,
    unreadNotificationCount = 0,
    isReloading = false,
  } = props

  return (
    <header className="pointer-events-none relative z-40 flex-shrink-0 bg-[#F7F9FC]">
      {isScrolled && (
        <div className="absolute inset-0 bg-white" aria-hidden="true" />
      )}
      <div className="relative px-1 py-1">
        <div
          className={`pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2 transition-all duration-300 ${
            isScrolled
              ? 'bg-transparent'
              : 'bg-transparent'
          }`}
        >
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-[0_18px_35px_rgba(102,166,255,0.35)]"
            />
          ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#89f7fe] to-[#66a6ff] text-lg font-semibold text-slate-800 shadow-[0_18px_35px_rgba(102,166,255,0.35)]">
            {avatarText}
          </div>
          )}
          <div>
            <p className="text-sm tracking-[0.25em] text-slate-500" style={{ fontFamily: "'Lobster', cursive" }}>Xin chào,</p>
            <p className="text-xl font-medium text-slate-900" style={{ fontFamily: "'Lobster', cursive" }}>{userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Reload Button */}
          {onReload && (
            <button 
              onClick={() => {
                if (onReload) {
                  onReload()
                }
              }}
              disabled={isReloading}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100 transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Làm mới dữ liệu"
              title="Làm mới dữ liệu"
            >
              <FaRedoAlt className={`h-6 w-6 text-slate-500 ${isReloading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Notification Button */}
          <button 
            onClick={() => {
              if (onNotificationClick) {
                onNotificationClick()
              } else {
                navigate('/notifications')
              }
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100 transition hover:scale-110 active:scale-95"
            aria-label="Thông báo"
          >
            {unreadNotificationCount > 0 ? (
              <span className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full ${badgeColor} text-xs font-bold text-white`}>
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            ) : (
              <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${badgeColor}`} />
            )}
            <FaBell className="h-6 w-6 text-slate-500" />
          </button>
        </div>
        </div>
      </div>
    </header>
  )
}

export default HeaderBar
