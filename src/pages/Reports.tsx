import { useMemo, useState } from 'react'
import { RiBarChartFill, RiCalendarLine, RiDownloadLine, RiFilter3Line, RiSearchLine } from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import {
  MOCK_CATEGORY_SUMMARY,
  MOCK_TRANSACTION_HISTORY,
  MOCK_TREND_DATA,
  type TimeRange,
} from '../constants/reportData'

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
]

const ReportPage = () => {
  const [range, setRange] = useState<TimeRange>('month')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'Tất cả' | 'Thu' | 'Chi'>('Tất cả')
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)

  const trendData = MOCK_TREND_DATA[range]

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return MOCK_TRANSACTION_HISTORY.filter((item) => {
      const matchesType = typeFilter === 'Tất cả' ? true : item.type === typeFilter
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.category.toLowerCase().includes(normalizedSearch) ||
        item.date.includes(normalizedSearch)
      return matchesType && matchesSearch
    })
  }, [searchTerm, typeFilter])

  const topIncome = MOCK_CATEGORY_SUMMARY.filter((category) => category.income > 0)
    .sort((a, b) => b.income - a.income)
    .slice(0, 3)
  const topExpense = MOCK_CATEGORY_SUMMARY.filter((category) => category.expense > 0)
    .sort((a, b) => b.expense - a.expense)
    .slice(0, 3)

  const totalIncome = MOCK_CATEGORY_SUMMARY.reduce((acc, item) => acc + item.income, 0)
  const totalExpense = MOCK_CATEGORY_SUMMARY.reduce((acc, item) => acc + item.expense, 0)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Báo cáo thống kê" />
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-8 md:max-w-4xl lg:max-w-6xl">
          <header className="rounded-3xl bg-white p-4 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:p-6">
          <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 sm:text-sm">Báo cáo</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Tổng quan thu & chi</h1>
              <p className="mt-1 text-xs text-slate-500 sm:mt-0 sm:text-sm">
                Theo dõi hiệu quả tài chính của bạn theo thời gian, danh mục và mức độ chi tiêu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIME_RANGE_OPTIONS.map(({ value, label }) => {
                const isActive = range === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-[0_18px_40px_rgba(56,189,248,0.35)]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl bg-white p-4 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Diễn biến thu & chi</h2>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Thống kê theo {TIME_RANGE_OPTIONS.find((opt) => opt.value === range)?.label.toLowerCase()}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 sm:px-4 sm:py-2 sm:text-sm"
              >
                <RiDownloadLine className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất báo cáo</span>
                <span className="sm:hidden">Xuất</span>
              </button>
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <SummaryCard
                title="Tổng thu nhập"
                amount={totalIncome}
                trend="+12.5%"
                description="So với kỳ trước"
                gradient="from-emerald-400 to-emerald-600"
              />
              <SummaryCard
                title="Tổng chi tiêu"
                amount={totalExpense}
                trend="-6.8%"
                description="So với kỳ trước"
                gradient="from-rose-400 to-rose-600"
              />
            </div>

            <TrendChart data={trendData} />
          </div>

          <div className="space-y-4 sm:space-y-6">
            <TopCategoryCard title="Danh mục thu nổi bật" data={topIncome} type="income" />
            <TopCategoryCard title="Danh mục chi nổi bật" data={topExpense} type="expense" />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Lịch sử thu chi</h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                Lọc và tìm kiếm theo loại giao dịch, danh mục hoặc ghi chú.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center">
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm kiếm giao dịch..."
                  className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-200 sm:text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['Tất cả', 'Thu', 'Chi'] as const).map((type) => {
                  const isActive = typeFilter === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeFilter(type)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${
                        isActive
                          ? 'bg-sky-500 text-white shadow-[0_18px_40px_rgba(56,189,248,0.35)]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {type === 'Thu' && <RiBarChartFill className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {type === 'Chi' && <RiFilter3Line className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {type}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {filteredTransactions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.category}</p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      item.type === 'Thu' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {item.type === 'Thu' ? '+' : '-'}
                    {Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(item.amount)}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <RiCalendarLine className="h-3.5 w-3.5" />
                  {new Date(item.date).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  {item.note && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="truncate">{item.note}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!filteredTransactions.length && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                Không có giao dịch phù hợp với bộ lọc hiện tại.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 sm:block">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                    <th className="px-3 py-2 text-left font-semibold sm:px-4 sm:py-3">Thời gian</th>
                    <th className="px-3 py-2 text-left font-semibold sm:px-4 sm:py-3">Giao dịch</th>
                    <th className="px-3 py-2 text-left font-semibold sm:px-4 sm:py-3">Danh mục</th>
                    <th className="px-3 py-2 text-right font-semibold sm:px-4 sm:py-3">Số tiền</th>
                    <th className="px-3 py-2 text-left font-semibold sm:px-4 sm:py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTransactions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500 sm:px-4 sm:py-3">
                      <span className="flex items-center gap-2">
                        <RiCalendarLine className="h-4 w-4 text-slate-400" />
                        {new Date(item.date).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                      <td className="px-3 py-2 font-medium text-slate-800 sm:px-4 sm:py-3">{item.name}</td>
                      <td className="px-3 py-2 text-slate-500 sm:px-4 sm:py-3">{item.category}</td>
                    <td
                        className={`px-3 py-2 text-right font-semibold sm:px-4 sm:py-3 ${
                        item.type === 'Thu' ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {item.type === 'Thu' ? '+' : '-'}
                      {Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      }).format(item.amount)}
                    </td>
                      <td className="px-3 py-2 text-slate-500 sm:px-4 sm:py-3">{item.note ?? '—'}</td>
                  </tr>
                ))}
                {!filteredTransactions.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Không có giao dịch phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </section>
        </div>
      </main>

      <FooterNav onAddClick={() => setIsTransactionModalOpen(true)} />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={() => {
          // Có thể reload hoặc show notification
        }}
      />
    </div>
  )
}

type SummaryCardProps = {
  title: string
  amount: number
  trend: string
  description: string
  gradient: string
}

const SummaryCard = ({ title, amount, trend, description, gradient }: SummaryCardProps) => {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-[0_22px_65px_rgba(15,40,80,0.12)] ring-1 ring-slate-100 sm:rounded-3xl sm:p-4">
      <p className="text-xs text-slate-500 sm:text-sm">{title}</p>
      <p className="mt-1.5 text-xl font-semibold text-slate-900 sm:mt-2 sm:text-2xl">
        {Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
          maximumFractionDigits: 0,
        }).format(amount)}
      </p>
      <p className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 sm:mt-2 sm:gap-2">
        <span className={`rounded-full bg-gradient-to-r ${gradient} px-2 py-0.5 text-[10px] text-white sm:text-xs`}>{trend}</span>
        <span className="text-[10px] sm:text-xs">{description}</span>
      </p>
    </div>
  )
}

type TrendChartProps = {
  data: {
    label: string
    income: number
    expense: number
  }[]
}

const TrendChart = ({ data }: TrendChartProps) => {
  const maxValue = Math.max(...data.flatMap((item) => [item.income, item.expense]))

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-3 shadow-[0_18px_45px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:mt-6 sm:rounded-3xl sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-700 sm:text-sm">Biểu đồ cột so sánh</h3>
          <p className="text-[10px] text-slate-500 sm:text-xs">Các cột thể hiện thu nhập và chi tiêu theo mốc.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium sm:gap-4 sm:text-xs">
          <span className="flex items-center gap-1.5 text-emerald-500 sm:gap-2">
            <span className="h-1.5 w-6 rounded-full bg-emerald-500 sm:h-2 sm:w-8" /> Thu nhập
          </span>
          <span className="flex items-center gap-1.5 text-rose-500 sm:gap-2">
            <span className="h-1.5 w-6 rounded-full bg-rose-500 sm:h-2 sm:w-8" /> Chi tiêu
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {data.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-[0_12px_30px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:gap-3 sm:rounded-2xl sm:p-4">
            <p className="text-xs font-semibold text-slate-700 sm:text-sm">{item.label}</p>
            <div className="flex w-full items-end gap-2 sm:gap-3">
              <div className="flex-1 rounded-full bg-slate-200">
                <div
                  className="flex min-h-[60px] items-end justify-center rounded-full bg-emerald-400 sm:h-24"
                  style={{ height: `${Math.max((item.income / maxValue) * 96, 60)}px` }}
                />
              </div>
              <div className="flex-1 rounded-full bg-slate-200">
                <div
                  className="flex min-h-[60px] items-end justify-center rounded-full bg-rose-400 sm:h-24"
                  style={{ height: `${Math.max((item.expense / maxValue) * 96, 60)}px` }}
                />
              </div>
            </div>
            <div className="w-full text-[10px] text-slate-600 sm:text-xs">
              <div>Thu: {Intl.NumberFormat('vi-VN').format(item.income)}đ</div>
              <div>Chi: {Intl.NumberFormat('vi-VN').format(item.expense)}đ</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type TopCategoryCardProps = {
  title: string
  data: typeof MOCK_CATEGORY_SUMMARY
  type: 'income' | 'expense'
}

const TopCategoryCard = ({ title, data, type }: TopCategoryCardProps) => {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_25px_80px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:rounded-3xl sm:p-6">
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
      <p className="text-xs text-slate-500 sm:text-sm">Sắp xếp theo giá trị {type === 'income' ? 'thu' : 'chi'}.</p>
      <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
        {data.map((item) => {
          const Icon = CATEGORY_ICON_MAP[item.iconId]?.icon
          const value = type === 'income' ? item.income : item.expense
          const formatValue = Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
          }).format(value)
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 shadow-[0_12px_30px_rgba(15,40,80,0.08)] ring-1 ring-slate-100 sm:rounded-2xl sm:p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base text-slate-600 sm:h-10 sm:w-10 sm:rounded-xl sm:text-lg">
                  {Icon ? <Icon /> : item.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700 sm:text-base">{item.name}</p>
                  <p className="text-[10px] text-slate-500 sm:text-xs">{item.percentage}% tổng {type === 'income' ? 'thu' : 'chi'}</p>
                </div>
              </div>
              <span className={`shrink-0 text-xs font-semibold sm:text-sm ${type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {type === 'income' ? '+' : '-'}
                {formatValue}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ReportPage

