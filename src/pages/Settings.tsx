import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RiAlertLine,
  RiArrowRightSLine,
  RiBellLine,
  RiBugLine,
  RiCloudLine,
  RiColorFilterLine,
  RiDownloadLine,
  RiEmotionLine,
  RiFeedbackLine,
  RiLock2Line,
  RiMoonLine,
  RiPaletteLine,
  RiSmartphoneLine,
  RiSunLine,
  RiTrophyLine,
  RiUser3Line,
  RiWallet3Line,
} from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { AccountInfoModal } from '../components/settings/AccountInfoModal'
import { SecurityModal } from '../components/settings/SecurityModal'
import { SupportModal } from '../components/settings/SupportModal'
import { UpgradeModal } from '../components/settings/UpgradeModal'
import { getCurrentProfile, type ProfileRecord } from '../lib/profileService'
import { useDialog } from '../contexts/dialogContext.helpers'
import { getSupabaseClient } from '../lib/supabaseClient'

type ToggleSetting = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const notificationToggleSettings: ToggleSetting[] = [
  {
    id: 'push',
    title: 'Thông báo đẩy',
    description: 'Nhận nhắc nhở thu chi, cảnh báo ngân sách khi vượt mức.',
    icon: <RiBellLine className="h-5 w-5" />,
  },
  {
    id: 'dailyDigest',
    title: 'Email tổng kết hàng ngày',
    description: 'Tổng hợp thu chi, hạn mức còn lại gửi về email lúc 20:00.',
    icon: <RiSmartphoneLine className="h-5 w-5" />,
  },
  {
    id: 'budgetAlert',
    title: 'Cảnh báo vượt ngân sách',
    description: 'Nhận thông báo khi chi tiêu gần đạt hoặc vượt hạn mức.',
    icon: <RiAlertLine className="h-5 w-5" />,
  },
  {
    id: 'reminder',
    title: 'Nhắc nhở giao dịch định kỳ',
    description: 'Nhắc nhở các khoản thu chi định kỳ (hóa đơn, lương, v.v.).',
    icon: <RiBellLine className="h-5 w-5" />,
  },
]

const financeToggleSettings: ToggleSetting[] = [
  {
    id: 'autoCategorize',
    title: 'Tự động phân loại giao dịch',
    description: 'Sử dụng AI để tự động phân loại giao dịch dựa trên mô tả.',
    icon: <RiWallet3Line className="h-5 w-5" />,
  },
  {
    id: 'budgetSuggestion',
    title: 'Gợi ý ngân sách',
    description: 'Nhận gợi ý ngân sách dựa trên lịch sử chi tiêu của bạn.',
    icon: <RiAlertLine className="h-5 w-5" />,
  },
  {
    id: 'autoBackup',
    title: 'Tự động sao lưu',
    description: 'Sao lưu dữ liệu cá nhân mỗi ngày vào 02:00 sáng.',
    icon: <RiCloudLine className="h-5 w-5" />,
  },
]

const themeOptions = [
  {
    id: 'classic',
    label: 'Giao diện sáng tối giản',
    description: 'Nền trắng, card rõ ràng, phù hợp môi trường văn phòng.',
    icon: <RiPaletteLine className="h-5 w-5" />,
  },
  {
    id: 'vivid',
    label: 'Giao diện đa sắc',
    description: 'Dải màu gradient cho nav và thẻ, tạo cảm hứng sử dụng.',
    icon: <RiColorFilterLine className="h-5 w-5" />,
  },
  {
    id: 'focus',
    label: 'Giao diện tập trung',
    description: 'Nhấn mạnh dữ liệu tài chính với card tối, chữ sáng.',
    icon: <RiEmotionLine className="h-5 w-5" />,
  },
]

// Reserved for future use
// const accountShortcuts = [
//   {
//     title: 'Thông tin cá nhân',
//     icon: <RiUser3Line className="h-5 w-5 text-sky-500" />,
//   },
//   {
//     title: 'Bảo mật & xác thực',
//     icon: <RiLock2Line className="h-5 w-5 text-emerald-500" />,
//   },
//   {
//     title: 'Xuất dữ liệu',
//     icon: <RiDownloadLine className="h-5 w-5 text-indigo-500" />,
//   },
// ]

// Reserved for future use
// const supportLinks = [
//   {
//     title: 'Chính sách cảnh báo nợ xấu',
//     description: 'Thiết lập ngưỡng cảnh báo, kịch bản khi vượt hạn mức.',
//     icon: <RiAlertLine className="h-5 w-5 text-rose-500" />,
//   },
//   {
//     title: 'Gói thành viên BoFin+',
//     description: 'Tăng giới hạn ngân sách, báo cáo chuyên sâu và AI gợi ý.',
//     icon: <RiTrophyLine className="h-5 w-5 text-amber-500" />,
//   },
// ]

const SettingsPage = () => {
  const navigate = useNavigate()
  const { showConfirm } = useDialog()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [supportModalType, setSupportModalType] = useState<'feedback' | 'bug'>('feedback')
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const [notificationToggles, setNotificationToggles] = useState<Record<string, boolean>>({
    push: true,
    dailyDigest: false,
    budgetAlert: true,
    reminder: true,
  })

  const [financeToggles, setFinanceToggles] = useState<Record<string, boolean>>({
    autoCategorize: false,
    budgetSuggestion: true,
    autoBackup: true,
  })

  const [selectedTheme, setSelectedTheme] = useState('classic')

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await getCurrentProfile()
        setProfile(profileData)
      } catch (error) {
        // Log detailed error information
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorDetails = error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
        
        console.error('Error loading profile:', {
          message: errorMessage,
          details: errorDetails,
          timestamp: new Date().toISOString()
        })
        
        // If it's a 406 error, it likely means the profiles table doesn't exist
        if (errorMessage.includes('406') || errorMessage.includes('Not Acceptable')) {
          console.warn('Profile table may not exist. Please run the migration: create_profiles_table.sql')
        }
      }
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    await showConfirm('Bạn có chắc chắn muốn đăng xuất?', async () => {
      const supabase = getSupabaseClient()
      // Clear welcome modal flag when logging out
      sessionStorage.removeItem('showWelcomeModal')
      await supabase.auth.signOut()
      navigate('/login')
    })
  }

  const handleOpenSupport = (type: 'feedback' | 'bug') => {
    setSupportModalType(type)
    setIsSupportModalOpen(true)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Cài đặt" />
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-8 md:max-w-4xl lg:max-w-6xl">
          <header className="rounded-3xl bg-white p-4 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:p-6">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Cài đặt & cá nhân hóa</h1>
          <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">
            Điều chỉnh trải nghiệm BoFin theo mục tiêu quản lý tài chính của bạn.
          </p>
        </header>

        {/* Account Info Section */}
        <section className="rounded-3xl bg-gradient-to-br from-white via-slate-50/50 to-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover ring-4 ring-slate-100 sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white ring-4 ring-slate-100 sm:h-20 sm:w-20">
                <RiUser3Line className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                {profile?.full_name || 'Người dùng'}
              </h3>
              <p className="text-xs text-slate-500 sm:text-sm">{profile?.email || ''}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border-2 border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <span className="flex items-center justify-center gap-1.5">
                  Đăng xuất
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Account Management */}
        <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">Quản lý tài khoản</h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <RiUser3Line className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Thông tin cá nhân</p>
                  <p className="text-xs text-slate-500">Cập nhật họ tên, số điện thoại, ngày sinh</p>
                </div>
              </div>
              <RiArrowRightSLine className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => setIsSecurityModalOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <RiLock2Line className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Bảo mật & xác thực</p>
                  <p className="text-xs text-slate-500">Đổi mật khẩu, bảo mật tài khoản</p>
                </div>
              </div>
              <RiArrowRightSLine className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <RiDownloadLine className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Xuất dữ liệu</p>
                  <p className="text-xs text-slate-500">Tải xuống dữ liệu tài chính của bạn</p>
                </div>
              </div>
              <RiArrowRightSLine className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">Thông báo & nhắc nhở</h2>
          <p className="mb-4 text-xs text-slate-500 sm:text-sm">
            Chủ động kiểm soát thông báo tài chính quan trọng
          </p>
          <div className="space-y-3">
            {notificationToggleSettings.map((item) => (
              <div
                  key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100"
                >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
                      {item.icon}
                    </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={notificationToggles[item.id]}
                    onChange={() =>
                      setNotificationToggles((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    className="peer sr-only"
                  />
                  <span className="absolute h-full w-full rounded-full bg-slate-200 transition peer-checked:bg-sky-500" />
                  <span className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-white transition peer-checked:left-[calc(100%-1.25rem)] peer-checked:-translate-x-0" />
                </label>
              </div>
            ))}
                    </div>
        </section>

        {/* Finance Settings */}
        <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">Cài đặt tài chính</h2>
          <p className="mb-4 text-xs text-slate-500 sm:text-sm">
            Tùy chỉnh cách quản lý thu chi và ngân sách
          </p>
          <div className="space-y-3">
            {financeToggleSettings.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                    checked={financeToggles[item.id]}
                      onChange={() =>
                      setFinanceToggles((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="peer sr-only"
                    />
                    <span className="absolute h-full w-full rounded-full bg-slate-200 transition peer-checked:bg-sky-500" />
                  <span className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-white transition peer-checked:left-[calc(100%-1.25rem)] peer-checked:-translate-x-0" />
                  </label>
              </div>
              ))}
          </div>
        </section>

        {/* System Settings */}
        <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">Giao diện</h2>
            <p className="mb-4 text-xs text-slate-500 sm:text-sm">
              Lựa chọn bảng màu và cảm hứng hiển thị
            </p>
            <div className="space-y-2">
              {themeOptions.map((theme) => {
                const isActive = selectedTheme === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                      isActive
                        ? 'bg-sky-50 ring-2 ring-sky-400 shadow-md'
                        : 'bg-slate-50 ring-1 ring-slate-100 hover:ring-sky-200'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-500">
                      {theme.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{theme.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{theme.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">Chế độ hiển thị</h2>
            <p className="mb-4 text-xs text-slate-500 sm:text-sm">
              Chọn chế độ sáng hoặc tối
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDarkMode(false)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl p-4 transition ${
                  !darkMode
                    ? 'bg-sky-50 ring-2 ring-sky-400 shadow-md'
                    : 'bg-slate-50 ring-1 ring-slate-100 hover:ring-sky-200'
                }`}
              >
                <RiSunLine className={`h-5 w-5 ${!darkMode ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${!darkMode ? 'text-sky-700' : 'text-slate-600'}`}>
                  Sáng
                </span>
              </button>
                <button
                  type="button"
                onClick={() => setDarkMode(true)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl p-4 transition ${
                  darkMode
                    ? 'bg-slate-800 ring-2 ring-slate-600 shadow-md'
                    : 'bg-slate-50 ring-1 ring-slate-100 hover:ring-slate-200'
                }`}
                >
                <RiMoonLine className={`h-5 w-5 ${darkMode ? 'text-slate-300' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                  Tối
                  </span>
                </button>
            </div>
          </div>
        </section>

        {/* Support & Upgrade */}
        <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-100 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">Hỗ trợ</h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOpenSupport('feedback')}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 hover:shadow-md ring-1 ring-slate-100"
                >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <RiFeedbackLine className="h-5 w-5" />
                  </span>
                  <div>
                  <p className="text-sm font-semibold text-slate-800">Gửi góp ý</p>
                  <p className="text-xs text-slate-500">Chia sẻ ý kiến của bạn</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleOpenSupport('bug')}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 hover:shadow-md ring-1 ring-slate-100"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <RiBugLine className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Báo lỗi</p>
                  <p className="text-xs text-slate-500">Báo cáo lỗi bạn gặp phải</p>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-amber-50/50 to-white p-5 shadow-lg ring-1 ring-amber-100 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <RiTrophyLine className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">Nâng cấp BoFin+</h2>
                <p className="text-xs text-slate-500 sm:text-sm">Trải nghiệm đầy đủ tính năng</p>
              </div>
            </div>
            <p className="mb-4 text-xs text-slate-600 sm:text-sm">
              Tăng giới hạn ngân sách, báo cáo chuyên sâu và AI gợi ý quản lý tài chính.
            </p>
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-amber-600 hover:to-orange-700"
            >
              Xem gói nâng cấp
            </button>
          </div>
        </section>

        </div>
      </main>

      <FooterNav />

      {/* Modals */}
      <AccountInfoModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onUpdate={() => {
          const loadProfile = async () => {
            try {
              const profileData = await getCurrentProfile()
              setProfile(profileData)
            } catch (error) {
              // Log detailed error information
              const errorMessage = error instanceof Error ? error.message : String(error)
              const errorDetails = error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
              } : error
              
              console.error('Error reloading profile:', {
                message: errorMessage,
                details: errorDetails,
                timestamp: new Date().toISOString()
              })
            }
          }
          loadProfile()
        }}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        type={supportModalType}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  )
}

export default SettingsPage

