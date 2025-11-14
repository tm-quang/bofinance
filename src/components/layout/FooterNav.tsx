import { useLocation, useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  RiAddLine,
  RiBarChart2Line,
  RiHome2Line,
  RiSettings4Line,
  RiFolder2Line,
} from 'react-icons/ri'

type FooterNavProps = {
  onAddClick?: () => void
}

type TabItem = {
  id: string
  label: string
  icon: IconType
  path?: string
  prominent?: boolean
}

const tabs: TabItem[] = [
  { id: 'home', label: 'Trang chủ', icon: RiHome2Line, path: '/dashboard' },
  { id: 'wallet', label: 'Danh mục', icon: RiFolder2Line, path: '/categories' },
  { id: 'add', label: '', icon: RiAddLine, prominent: true },
  { id: 'reports', label: 'Báo cáo', icon: RiBarChart2Line, path: '/reports' },
  { id: 'settings', label: 'Cài đặt', icon: RiSettings4Line, path: '/settings' },
]

export const FooterNav = ({ onAddClick }: FooterNavProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path?: string) => {
    if (!path) return false
    const pathname = location.pathname
    const cleanPath = path.split('?')[0]
    return pathname === cleanPath || pathname.startsWith(cleanPath)
  }

  const handleClick = (tab: TabItem) => {
    if (tab.prominent) {
      if (onAddClick) {
        onAddClick()
        return
      }
      if (tab.path) {
        navigate(tab.path)
      }
      return
    }
    if (tab.path) {
      navigate(tab.path)
    }
  }

  return (
    <div className="relative z-50 flex flex-shrink-0 justify-center bg-transparent">
      <div className="relative w-full max-w-md">
        {/* Central Add Button - Floating above with Logo */}
        <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-4">
          <button
            type="button"
            onClick={() => handleClick(tabs[2])}
            className="group flex h-16 w-16 items-center justify-center rounded-full bg-white border-2 border-blue-500 shadow-2xl shadow-blue-500/40 transition-all hover:scale-110 hover:shadow-blue-500/60 active:scale-95"
          >
            <img
              src="/logo-nontext.png"
              alt="BoFin Logo"
              className="relative z-10 h-16 w-16 object-contain"
            />
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-50 blur-xl" />
          </button>
        </div>

        {/* Navigation Bar with Notch */}
        <div className="relative h-20 overflow-visible ">
          {/* Background Bar with Notch Cutout */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full "
            viewBox="0 0 375 80"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="navGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
            {/* Main bar with deeper notch cutout for spacing with icon */}
            <path
              d="M 0,0 
                 L 145,0 
                 Q 155,0 160,18
                 Q 165,30 170,35
                 Q 175,40 187.5,45
                 Q 200,40 205,35
                 Q 210,30 215,18
                 Q 220,0 230,0
                 L 375,0 
                 L 375,80 
                 L 0,80 
                 Z"
              fill="url(#navGradient)"
            />
          </svg>

          {/* Navigation Items */}
          <div className="relative z-10 flex items-end justify-between px-0 pb-1 pt-3">
            {tabs.map((tab) => {
              if (tab.prominent) {
                return <div key={tab.id} className="flex flex-1" />
              }

              const { label, icon: Icon } = tab
              const active = isActive(tab.path)

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleClick(tab)}
                  aria-current={active ? 'page' : undefined}
                  data-no-haptic="true"
                  className={`relative z-20 flex flex-1 flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
                    active ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all ${
                      active
                        ? 'bg-white text-slate-900 shadow-lg'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    <Icon />
                  </span>
                  <span className="mt-0.5 leading-tight">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FooterNav
