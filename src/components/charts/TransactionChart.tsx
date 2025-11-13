import { useEffect, useMemo, useState } from 'react'
import { fetchTransactions, type TransactionRecord } from '../../lib/transactionService'
import { fetchCategories, type CategoryRecord } from '../../lib/categoryService'
import { DonutChart } from './DonutChart'

type TransactionChartProps = {
  date?: string // YYYY-MM-DD format, defaults to today
  walletId?: string // Filter by wallet
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const TransactionChart = ({ date, walletId }: TransactionChartProps) => {
  const [selectedType, setSelectedType] = useState<'Thu' | 'Chi'>('Chi')
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const targetDate = date || new Date().toISOString().split('T')[0]

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [transactionsData, categoriesData] = await Promise.all([
          fetchTransactions({
            start_date: targetDate,
            end_date: targetDate,
            type: selectedType,
            wallet_id: walletId,
          }),
          fetchCategories(),
        ])

        // Only update state if component is still mounted
        if (isMounted) {
          setCategories(categoriesData) // Set categories first
          setTransactions(transactionsData) // Then set transactions
        }
      } catch (error) {
        console.error('Error loading chart data:', error)
        if (isMounted) {
          setTransactions([])
          setCategories([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [targetDate, selectedType, walletId])

  const totalAmount = useMemo(() => {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === selectedType)
  }, [transactions, selectedType])

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_22px_65px_rgba(15,40,80,0.1)] ring-1 ring-slate-100">
      {/* Header with Toggle - Always visible */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            {selectedType === 'Thu' ? 'THU NHẬP' : 'CHI TIÊU'} HÔM NAY
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
            {isLoading ? '...' : formatCurrency(totalAmount)}
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSelectedType('Thu')}
            disabled={isLoading}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5 sm:py-2.5 sm:text-sm ${
              selectedType === 'Thu'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Thu
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('Chi')}
            disabled={isLoading}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5 sm:py-2.5 sm:text-sm ${
              selectedType === 'Chi'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Chi
          </button>
        </div>
      </div>

      {/* Chart */}
      <DonutChart
        transactions={filteredTransactions}
        categories={categories}
        type={selectedType}
        totalAmount={totalAmount}
      />
    </section>
  )
}

