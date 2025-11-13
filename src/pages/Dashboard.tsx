import {
  RiAddLine,
  RiCalendarLine,
  RiCoinLine,
  RiExchangeDollarLine,
  RiHandCoinLine,
  RiHandHeartLine,
  RiSendPlaneFill,
  RiShoppingBag3Line,
} from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const quickActions = [
  { label: 'Chi tiền', icon: RiSendPlaneFill },
  { label: 'Thêm thu/chi', icon: RiAddLine },
  { label: 'Chia khoản', icon: RiExchangeDollarLine },
  { label: 'Nhắc thu/chi', icon: RiHandHeartLine },
]

const transactions = [
  {
    id: 'tran-1',
    name: 'Ăn sáng cùng gia đình',
    category: 'Ăn uống',
    type: 'Chi',
    amount: 195000,
    date: '2025-11-12',
  },
  {
    id: 'tran-2',
    name: 'Lương tháng 11',
    category: 'Thu nhập cố định',
    type: 'Thu',
    amount: 24000000,
    date: '2025-11-05',
  },
  {
    id: 'tran-3',
    name: 'Grab đi làm',
    category: 'Di chuyển',
    type: 'Chi',
    amount: 85000,
    date: '2025-11-04',
  },
  {
    id: 'tran-4',
    name: 'Chia tiền sinh nhật',
    category: 'Bạn bè',
    type: 'Chi',
    amount: 350000,
    date: '2025-11-03',
  },
]

export const DashboardPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900">
      <HeaderBar userName="Minh Quang" badgeColor="bg-sky-500" />

      <main className="px-4 pb-44 pt-28">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <section className="rounded-3xl bg-gradient-to-b from-[#FFE29D] to-[#FFC861] p-5 shadow-[0_28px_80px_rgba(255,200,97,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-700/70">
            Chi tiêu hôm nay
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-800">
            {formatCurrency(256037)}
          </p>
          <button className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-[0_12px_30px_rgba(15,40,80,0.12)]">
            Số dư ví
          </button>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-[0_22px_65px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            <span>Tác vụ nhanh</span>
            <span>Xem tất cả</span>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50 p-3 text-center text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:shadow-[0_16px_40px_rgba(15,40,80,0.12)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg text-slate-600 shadow-[0_12px_25px_rgba(15,40,80,0.12)]">
                  <Icon />
                </span>
                <span className="leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Giao dịch gần đây
              </p>
              <p className="text-sm text-slate-500">Theo dõi lịch sử thu chi mới nhất.</p>
            </div>
            <button className="text-sm font-semibold text-sky-500">Xem thêm</button>
          </header>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-[0_20px_55px_rgba(15,40,80,0.1)] ring-1 ring-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-lg text-slate-600">
                    {transaction.type === 'Thu' ? <RiCoinLine /> : <RiShoppingBag3Line />}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{transaction.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <RiCalendarLine className="h-3.5 w-3.5" />
                      {new Date(transaction.date).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                      <span>• {transaction.category}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    transaction.type === 'Thu' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {transaction.type === 'Thu' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
        </div>
      </main>

      <section className="px-4">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_22px_60px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Kế hoạch hôm nay
              </p>
              <p className="text-sm text-slate-500">
                Đóng tiền bảo hiểm sức khoẻ và kiểm tra lại hạn mức ăn uống.
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-xl text-slate-600 shadow-[0_12px_28px_rgba(15,40,80,0.12)]">
              <RiHandCoinLine />
            </span>
          </div>
        </div>
      </section>

      <FooterNav onAddClick={() => navigate('/categories?mode=create')} />
    </div>
  )
}

export default DashboardPage

