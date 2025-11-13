import type { ReactNode } from 'react'
import { FiBell } from 'react-icons/fi'
import { RiArrowLeftLine, } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'

type HeaderBarProps =
  | {
    variant?: 'greeting'
    userName: string
    avatarText?: string
    badgeColor?: string
  }
  | {
    variant: 'page'
    title: string
    onBack?: () => void
    showIcon?: ReactNode
  }

const HeaderBar = (props: HeaderBarProps) => {
  const navigate = useNavigate()

  if (props.variant === 'page') {
    const { title, onBack, showIcon } = props
    return (
      <header className="fixed inset-x-0 top-0 z-40 px-4 py-3">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100 ring-1 ring-slate-100"
            aria-label="Quay lại"
          >
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.32em] text-black">
            {title}
          </p>
          <div className="flex h-11 w-11 items-center justify-center text-slate-500">
            {showIcon ?? null}
          </div>
        </div>
      </header>
    )
  }

  const { userName, avatarText = userName.charAt(0).toUpperCase(), badgeColor = 'bg-sky-600' } = props

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 py-3">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#89f7fe] to-[#66a6ff] text-lg font-semibold text-slate-800 shadow-[0_18px_35px_rgba(102,166,255,0.35)]">
            {avatarText}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">Xin chào,</p>
            <p className="text-lg font-semibold text-slate-900">{userName}</p>
          </div>
        </div>
        <button className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100">
          <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${badgeColor}`} />
          <FiBell className="h-6 w-6 text-slate-500" />
        </button>
      </div>
    </header>
  )
}

export default HeaderBar
