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
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <footer className="flex w-full max-w-md items-end justify-between rounded-t-3xl bg-gray-100 pt-2 pb-1 shadow-[0_-18px_60px_rgba(15,40,80,0.18)] ring-1 ring-slate-100">
        {tabs.map((tab) => {
          const { label, icon: Icon, prominent } = tab
          const active = !prominent && isActive(tab.path)
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleClick(tab)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 text-[12px] font-medium transition ${prominent ? '-translate-y-6 text-white' : active ? 'text-slate-900' : 'text-slate-500'
                }`}
            >
              <span
                className={`flex items-center justify-center rounded-full ${prominent
                  ? 'h-16 w-16 bg-blue-500 text-white text-2xl shadow-xl'
                  : `h-12 w-12 text-xl shadow-xl ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`
                  }`}
              >
                <Icon />
              </span>
              <span className={prominent ? 'text-sm font-semibold' : undefined}>{label}</span>
            </button>
          )
        })}
      </footer>
    </div>
  )
}

export default FooterNav

