import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaChartPie } from 'react-icons/fa'
import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { BudgetCard } from '../components/budgets/BudgetCard'
import { BudgetListSkeleton } from '../components/budgets/BudgetSkeleton'
import {
  fetchBudgets,
  getBudgetWithSpending,
  deleteBudget,
  type BudgetRecord,
  type BudgetWithSpending,
} from '../lib/budgetService'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNode } from '../utils/iconLoader'

export const BudgetsPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const { showConfirm } = useDialog()
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [budgetsData, categoriesData, walletsData] = await Promise.all([
        fetchBudgets({ is_active: true }),
        fetchCategories(),
        fetchWallets(false),
      ])

      const budgetsWithSpending = await Promise.allSettled(
        budgetsData.map((b) => getBudgetWithSpending(b.id))
      )

      // Filter out failed budgets and log errors
      const successfulBudgets = budgetsWithSpending
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            console.error(`Failed to load budget ${budgetsData[index].id}:`, result.reason)
            return null
          }
        })
        .filter((budget): budget is BudgetWithSpending => budget !== null)

      // Load icons for all categories
      const iconsMap: Record<string, React.ReactNode> = {}
      await Promise.all(
        categoriesData.map(async (category) => {
          try {
            const iconNode = await getIconNode(category.icon_id)
            if (iconNode) {
              iconsMap[category.id] = <span className="h-5 w-5">{iconNode}</span>
            } else {
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-5 w-5" />
              }
            }
          } catch (error) {
            console.error('Error loading icon for category:', category.id, error)
            // Fallback to hardcoded icon
            const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
            if (hardcodedIcon?.icon) {
              const IconComponent = hardcodedIcon.icon
              iconsMap[category.id] = <IconComponent className="h-5 w-5" />
            }
          }
        })
      )
      setCategoryIcons(iconsMap)

      // Sort by usage percentage (highest first) to show critical budgets first
      successfulBudgets.sort((a, b) => b.usage_percentage - a.usage_percentage)

      setBudgets(successfulBudgets)
      setCategories(categoriesData)
      setWallets(walletsData)
    } catch (error) {
      console.error('Error loading budgets:', error)
      showError('Không thể tải danh sách ngân sách.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    navigate('/add-budget')
  }

  const handleEdit = (budget: BudgetWithSpending) => {
    navigate(`/add-budget?id=${budget.id}`)
  }

  const handleDelete = async (budget: BudgetRecord) => {
    const confirmed = await showConfirm(
      'Bạn có chắc muốn xóa ngân sách này? Hành động này không thể hoàn tác.'
    )

    if (!confirmed) return

    try {
      await deleteBudget(budget.id)
      success('Đã xóa ngân sách thành công!')
      loadData()
    } catch (error) {
      showError('Không thể xóa ngân sách.')
    }
  }

  // Removed unused handleModalClose function

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Ngân sách" />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Ngân sách của tôi</h1>
              <p className="mt-1 text-sm text-slate-500">
                Theo dõi và quản lý ngân sách chi tiêu
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-white font-semibold shadow-lg hover:from-sky-600 hover:to-blue-700 transition-all active:scale-95"
            >
              <FaPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Tạo ngân sách</span>
              <span className="sm:hidden">Tạo</span>
            </button>
          </div>

          {isLoading ? (
            <BudgetListSkeleton count={3} />
          ) : budgets.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <FaChartPie className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Chưa có ngân sách nào</h3>
              <p className="mb-6 text-slate-500">
                Tạo ngân sách để theo dõi và quản lý chi tiêu của bạn
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-white font-semibold shadow-lg hover:from-sky-600 hover:to-blue-700 transition-all"
              >
                <FaPlus className="h-5 w-5" />
                Tạo ngân sách đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((budget) => {
                const category = categories.find((c) => c.id === budget.category_id)
                const wallet = budget.wallet_id
                  ? wallets.find((w) => w.id === budget.wallet_id)
                  : null

                // Get icon component
                const categoryIcon = category && categoryIcons[category.id] ? categoryIcons[category.id] : '💰'

                return (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    categoryName={category?.name || 'Hạng mục đã xóa'}
                    categoryIcon={categoryIcon}
                    walletName={wallet?.name}
                    onEdit={() => handleEdit(budget)}
                    onDelete={() => handleDelete(budget)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>

      <FooterNav onAddClick={() => navigate('/add-transaction')} />
    </div>
  )
}

export default BudgetsPage

