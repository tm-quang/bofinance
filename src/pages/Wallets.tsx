import { useEffect, useState } from 'react'
import { RiAddLine, RiEdit2Line, RiDeleteBin6Line, RiWallet3Line } from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { WalletListSkeleton } from '../components/skeletons'
import {
  fetchWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  type WalletRecord,
  type WalletType,
} from '../lib/walletService'
import { useNotification } from '../contexts/NotificationContext'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const WALLET_TYPES: WalletType[] = ['Tiền mặt', 'Ngân hàng', 'Tiết kiệm', 'Tín dụng', 'Đầu tư', 'Khác']

export const WalletsPage = () => {
  const { success, error: showError } = useNotification()
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<WalletRecord | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Tiền mặt' as WalletType,
    balance: '',
    currency: 'VND',
    description: '',
  })

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    setIsLoading(true)
    try {
      const data = await fetchWallets(true) // Include inactive
      setWallets(data)
    } catch (error) {
      console.error('Error loading wallets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenForm = (wallet?: WalletRecord) => {
    if (wallet) {
      setEditingWallet(wallet)
      setFormData({
        name: wallet.name,
        type: wallet.type,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        description: wallet.description || '',
      })
    } else {
      setEditingWallet(null)
      setFormData({
        name: '',
        type: 'Tiền mặt',
        balance: '',
        currency: 'VND',
        description: '',
      })
    }
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingWallet(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const balance = parseFloat(formData.balance) || 0
      if (editingWallet) {
        await updateWallet(editingWallet.id, {
          name: formData.name,
          balance,
          currency: formData.currency,
          description: formData.description || undefined,
        })
        success('Đã cập nhật ví thành công!')
      } else {
        await createWallet({
          name: formData.name,
          type: formData.type,
          balance,
          currency: formData.currency,
          description: formData.description || undefined,
        })
        success('Đã tạo ví mới thành công!')
      }
      await loadWallets()
      handleCloseForm()
    } catch (error) {
      console.error('Error saving wallet:', error)
      showError('Không thể lưu ví. Vui lòng thử lại.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa ví này?')) return
    try {
      await deleteWallet(id, false) // Soft delete
      success('Đã xóa ví thành công!')
      await loadWallets()
    } catch (error) {
      console.error('Error deleting wallet:', error)
      showError('Không thể xóa ví. Vui lòng thử lại.')
    }
  }

  const handleToggleActive = async (wallet: WalletRecord) => {
    try {
      await updateWallet(wallet.id, { is_active: !wallet.is_active })
      success(wallet.is_active ? 'Đã vô hiệu hóa ví' : 'Đã kích hoạt ví')
      await loadWallets()
    } catch (error) {
      console.error('Error toggling wallet:', error)
      showError('Không thể thay đổi trạng thái ví')
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Quản lý Ví" />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 sm:py-8">
          {/* Add button */}
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700"
          >
            <RiAddLine className="h-5 w-5" />
            Thêm ví mới
          </button>

          {/* Wallets list */}
          {isLoading ? (
            <WalletListSkeleton count={5} />
          ) : wallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-sm">
              <RiWallet3Line className="mb-4 h-16 w-16 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Chưa có ví nào</p>
              <p className="mt-1 text-xs text-slate-500">Tạo ví đầu tiên để bắt đầu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ${
                    wallet.is_active ? 'ring-slate-200' : 'ring-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{wallet.name}</h3>
                        {!wallet.is_active && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            Đã ẩn
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{wallet.type}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatCurrency(wallet.balance)}
                      </p>
                      {wallet.description && (
                        <p className="mt-2 text-xs text-slate-500">{wallet.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenForm(wallet)}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-sky-500"
                      >
                        <RiEdit2Line className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(wallet.id)}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <RiDeleteBin6Line className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                      onClick={() => handleToggleActive(wallet)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        wallet.is_active
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                      }`}
                    >
                      {wallet.is_active ? 'Ẩn ví' : 'Hiện ví'}
                    </button>
                    <span className="text-xs text-slate-400">{wallet.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <FooterNav />

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end backdrop-blur-md bg-slate-950/50">
          <div className="flex w-full max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingWallet ? 'Chỉnh sửa ví' : 'Thêm ví mới'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Tên ví</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-900 focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
                {!editingWallet && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Loại ví</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as WalletType })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-900 focus:border-sky-500 focus:outline-none"
                    >
                      {WALLET_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Số dư ban đầu</label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-900 focus:border-sky-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-900 focus:border-sky-500 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700"
                  >
                    {editingWallet ? 'Cập nhật' : 'Tạo ví'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletsPage

