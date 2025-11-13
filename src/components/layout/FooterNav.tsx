import { useLocation, useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  RiAddLine,
  RiBarChartLine,
  RiHomeSmileLine,
  RiSettings3Line,
  RiWallet3Line,
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
  { id: 'home', label: 'Trang chủ', icon: RiHomeSmileLine, path: '/dashboard' },
  { id: 'wallet', label: 'Danh mục', icon: RiWallet3Line, path: '/categories' },
  { id: 'add', label: '', icon: RiAddLine, prominent: true, path: '/categories?mode=create' },
  { id: 'reports', label: 'Báo cáo', icon: RiBarChartLine, path: '/reports' },
  { id: 'settings', label: 'Cài đặt', icon: RiSettings3Line, path: '/settings' },
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
    <div className="relative z-50 flex flex-shrink-0 justify-center">
      <div className="relative w-full max-w-md">
        {/* Icon "Thêm" nổi lên ở giữa */}
        <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-8">
          <button
            type="button"
            onClick={() => handleClick(tabs[2])}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-blue-500 bg-white text-4xl text-blue-500 transition-transform hover:scale-105 active:scale-95"
          >
            <RiAddLine />
          </button>
        </div>

        {/* Nền footer với notch lõm xuống dưới icon giữa */}
        <div className="relative h-20 overflow-visible">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 375 80"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 0,15 
                 Q 0,0 16,0 
                 L 145,0 
                 Q 155,0 160,8
                 C 165,15 170,25 187.5,50
                 C 205,25 210,15 215,8
                 Q 220,0 230,0
                 L 359,0 
                 Q 375,0 375,16 
                 L 375,80 
                 L 0,80 Z"
              fill="black"
            />
          </svg>

          {/* Content các icon */}
          <div className="relative z-10 flex items-end justify-between pt-3">
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
                  className={`relative z-20 flex flex-1 flex-col items-center gap-1 text-[11px] font-medium transition ${
                    active ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-xl shadow-md transition ${
                      active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    <Icon />
                  </span>
                  <span className="mt-0.5">{label}</span>
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
