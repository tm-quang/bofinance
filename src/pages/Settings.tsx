import { useState } from 'react'
import {
  RiAlertLine,
  RiArrowRightSLine,
  RiBellLine,
  RiCloudLine,
  RiColorFilterLine,
  RiDownloadLine,
  RiEmotionLine,
  RiLock2Line,
  RiLogoutCircleLine,
  RiPaletteLine,
  RiSmartphoneLine,
  RiTrophyLine,
  RiUser3Line,
} from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'

type ToggleSetting = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const preferenceToggles: ToggleSetting[] = [
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
    id: 'autoBackup',
    title: 'Tự động sao lưu lên Supabase Storage',
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

const accountShortcuts = [
  {
    title: 'Thông tin cá nhân',
    icon: <RiUser3Line className="h-5 w-5 text-sky-500" />,
  },
  {
    title: 'Bảo mật & xác thực',
    icon: <RiLock2Line className="h-5 w-5 text-emerald-500" />,
  },
  {
    title: 'Xuất dữ liệu',
    icon: <RiDownloadLine className="h-5 w-5 text-indigo-500" />,
  },
]

const supportLinks = [
  {
    title: 'Chính sách cảnh báo nợ xấu',
    description: 'Thiết lập ngưỡng cảnh báo, kịch bản khi vượt hạn mức.',
    icon: <RiAlertLine className="h-5 w-5 text-rose-500" />,
  },
  {
    title: 'Gói thành viên BoFin+',
    description: 'Tăng giới hạn ngân sách, báo cáo chuyên sâu và AI gợi ý.',
    icon: <RiTrophyLine className="h-5 w-5 text-amber-500" />,
  },
]

const SettingsPage = () => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    push: true,
    dailyDigest: false,
    autoBackup: true,
  })
  const [selectedTheme, setSelectedTheme] = useState('classic')

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Cài đặt" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-44 pt-28">
        <header className="rounded-3xl bg-white p-6 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100">
          <h1 className="text-3xl font-semibold text-slate-900">Cài đặt & cá nhân hóa</h1>
          <p className="mt-2 text-sm text-slate-500">
            Điều chỉnh trải nghiệm BoFin theo mục tiêu quản lý tài chính của bạn.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-[0_22px_60px_rgba(15,40,80,0.1)] ring-1 ring-slate-100 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Thông báo & sao lưu</h2>
            <p className="text-sm text-slate-500">
              Chủ động kiểm soát thông báo tài chính quan trọng và lịch sao lưu dữ liệu.
            </p>
            <ul className="mt-4 space-y-4">
              {preferenceToggles.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between rounded-2xl bg-slate-50 p-4 shadow-[0_12px_35px_rgba(15,40,80,0.08)] ring-1 ring-slate-100"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600">
                      {item.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex h-7 w-12 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={toggles[item.id]}
                      onChange={() =>
                        setToggles((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="peer sr-only"
                    />
                    <span className="absolute h-full w-full rounded-full bg-slate-200 transition peer-checked:bg-sky-500" />
                    <span className="absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-white transition peer-checked:left-[calc(100%-1.5rem)] peer-checked:-translate-x-0" />
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-slate-50 p-6 shadow-[0_22px_60px_rgba(15,40,80,0.08)] ring-1 ring-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Chế độ màu</h2>
            <p className="text-sm text-slate-500">
              Lựa chọn bảng màu và cảm hứng hiển thị cho dashboard.
            </p>
            <div className="mt-4 space-y-3">
              {themeOptions.map((theme) => {
                const isActive = selectedTheme === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left transition ${
                      isActive
                        ? 'bg-white shadow-[0_18px_45px_rgba(56,189,248,0.2)] ring-2 ring-sky-400'
                        : 'bg-white ring-1 ring-slate-100 hover:ring-sky-200'
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                      {theme.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{theme.label}</p>
                      <p className="text-sm text-slate-500">{theme.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-[0_22px_60px_rgba(15,40,80,0.08)] ring-1 ring-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Quản lý tài khoản</h2>
            <div className="mt-4 space-y-3">
              {accountShortcuts.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-4 text-left shadow-[0_12px_30px_rgba(15,40,80,0.08)] transition hover:bg-slate-100"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    {item.icon}
                    {item.title}
                  </span>
                  <RiArrowRightSLine className="h-5 w-5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-[0_22px_60px_rgba(15,40,80,0.08)] ring-1 ring-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Hỗ trợ & nâng cấp</h2>
            <div className="mt-4 space-y-4">
              {supportLinks.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 shadow-[0_12px_30px_rgba(15,40,80,0.08)] ring-1 ring-slate-100"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-700">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
              >
                <RiLogoutCircleLine />
                Đăng xuất khỏi BoFin
              </button>
            </div>
          </div>
        </section>
      </main>

      <FooterNav />
    </div>
  )
}

export default SettingsPage

