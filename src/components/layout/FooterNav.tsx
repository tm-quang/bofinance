import { useLocation, useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  FaPlus,
  FaChartBar,
  FaHome,
  FaCog,
  FaWallet,
} from 'react-icons/fa'

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
  { id: 'home', label: 'Trang chủ', icon: FaHome, path: '/dashboard' },
  { id: 'budgets', label: 'Ngân sách', icon: FaWallet, path: '/budgets' },
  { id: 'add', label: '', icon: FaPlus, prominent: true },
  { id: 'reports', label: 'Báo cáo', icon: FaChartBar, path: '/reports' },
  { id: 'settings', label: 'Cài đặt', icon: FaCog, path: '/settings' },
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
        {/* Central Add Button - Centered vertically and horizontally */}
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={() => handleClick(tabs[2])}
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-white border-2 border-blue-800 shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
          >
            <FaPlus className="h-7 w-7 text-blue-800" />
          </button>
        </div>

        {/* Navigation Bar - Simple white background */}
        <div className="relative h-16 bg-white border-t border-slate-200">
          {/* Navigation Items */}
          <div className="relative z-10 flex items-center justify-between px-0 h-full pt-1">
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
                  className={`relative z-20 flex flex-1 flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                    active ? 'text-blue-800' : 'text-slate-600'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all ${
                      active
                        ? 'bg-blue-800 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="leading-tight">{label}</span>
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
