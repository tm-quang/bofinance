export type TimeRange = 'week' | 'month' | 'quarter' | 'year'

export type TrendPoint = {
  label: string
  income: number
  expense: number
}

export type CategorySummary = {
  id: string
  name: string
  iconId: string
  income: number
  expense: number
  percentage: number
}

export type TransactionHistoryItem = {
  id: string
  name: string
  category: string
  type: 'Thu' | 'Chi'
  amount: number
  date: string
  note?: string
}

export const MOCK_TREND_DATA: Record<TimeRange, TrendPoint[]> = {
  week: [
    { label: 'T2', income: 1500000, expense: 900000 },
    { label: 'T3', income: 1200000, expense: 1100000 },
    { label: 'T4', income: 1750000, expense: 950000 },
    { label: 'T5', income: 1450000, expense: 1000000 },
    { label: 'T6', income: 2100000, expense: 1200000 },
    { label: 'T7', income: 900000, expense: 1500000 },
    { label: 'CN', income: 700000, expense: 800000 },
  ],
  month: [
    { label: 'Tuần 1', income: 6800000, expense: 4300000 },
    { label: 'Tuần 2', income: 7200000, expense: 5100000 },
    { label: 'Tuần 3', income: 7050000, expense: 4800000 },
    { label: 'Tuần 4', income: 8100000, expense: 5200000 },
  ],
  quarter: [
    { label: 'Tháng 1', income: 18000000, expense: 12500000 },
    { label: 'Tháng 2', income: 19500000, expense: 13800000 },
    { label: 'Tháng 3', income: 20500000, expense: 14000000 },
  ],
  year: [
    { label: 'Q1', income: 58000000, expense: 39000000 },
    { label: 'Q2', income: 62000000, expense: 42000000 },
    { label: 'Q3', income: 64000000, expense: 45000000 },
    { label: 'Q4', income: 66000000, expense: 47000000 },
  ],
}

export const MOCK_CATEGORY_SUMMARY: CategorySummary[] = [
  { id: 'food', name: 'Ăn uống', iconId: 'food', income: 0, expense: 5200000, percentage: 28 },
  { id: 'transport', name: 'Đi lại', iconId: 'transport', income: 0, expense: 2100000, percentage: 11 },
  { id: 'health', name: 'Sức khỏe', iconId: 'health', income: 0, expense: 1800000, percentage: 9 },
  { id: 'salary', name: 'Lương cố định', iconId: 'salary', income: 24000000, expense: 0, percentage: 54 },
  { id: 'bonus', name: 'Thưởng', iconId: 'bonus', income: 5000000, expense: 0, percentage: 11 },
]

export const MOCK_TRANSACTION_HISTORY: TransactionHistoryItem[] = [
  {
    id: 'tx1',
    name: 'Đi chợ cuối tuần',
    category: 'Ăn uống',
    type: 'Chi',
    amount: 780000,
    date: '2025-11-08',
    note: 'Mua đồ cho cả tuần',
  },
  {
    id: 'tx2',
    name: 'Lương tháng 11',
    category: 'Lương cố định',
    type: 'Thu',
    amount: 24000000,
    date: '2025-11-05',
  },
  {
    id: 'tx3',
    name: 'Grab đi làm',
    category: 'Đi lại',
    type: 'Chi',
    amount: 120000,
    date: '2025-11-07',
  },
  {
    id: 'tx4',
    name: 'Khám sức khỏe định kỳ',
    category: 'Sức khỏe',
    type: 'Chi',
    amount: 1500000,
    date: '2025-11-03',
  },
  {
    id: 'tx5',
    name: 'Bonus dự án',
    category: 'Thưởng',
    type: 'Thu',
    amount: 5000000,
    date: '2025-10-28',
    note: 'Hoàn thành milestone quý 4',
  },
  {
    id: 'tx6',
    name: 'Thanh toán điện nước',
    category: 'Hóa đơn',
    type: 'Chi',
    amount: 950000,
    date: '2025-10-30',
  },
]

