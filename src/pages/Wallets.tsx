import { useEffect, useState } from 'react'
import { RiAddLine, RiEdit2Line, RiDeleteBin6Line, RiWallet3Line, RiCheckLine, RiStarLine, RiStarFill } from 'react-icons/ri'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { WalletListSkeleton } from '../components/skeletons'
import {
  fetchWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  setDefaultWallet,
  getDefaultWallet,
  type WalletRecord,
  type WalletType,
} from '../lib/walletService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import { formatVNDInput, parseVNDInput } from '../utils/currencyInput'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const WALLET_TYPES: WalletType[] = ['Tiền mặt', 'Ngân hàng', 'Tiết kiệm', 'Tín dụng', 'Đầu tư', 'Khác']

const DEFAULT_WALLET_KEY = 'bofin_default_wallet_id'

// Màu sắc theo loại ví - đồng bộ với WalletCard trong Dashboard
const getWalletTypeColors = (type: WalletType, isDefault: boolean) => {
  const colors = {
    'Tiền mặt': {
      bg: 'from-slate-600 to-slate-800', // Giống WalletCard default
      border: isDefault ? 'border-emerald-400' : 'border-slate-500',
      text: 'text-white',
      badge: 'bg-emerald-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(16,185,129,0.4)]' : 'shadow-lg',
    },
    'Ngân hàng': {
      bg: 'from-blue-600 to-blue-800', // Giống WalletCard
      border: isDefault ? 'border-blue-400' : 'border-blue-500',
      text: 'text-white',
      badge: 'bg-blue-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(59,130,246,0.4)]' : 'shadow-lg',
    },
    'Tiết kiệm': {
      bg: 'from-emerald-600 to-emerald-800', // Giống WalletCard
      border: isDefault ? 'border-emerald-400' : 'border-emerald-500',
      text: 'text-white',
      badge: 'bg-emerald-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(16,185,129,0.4)]' : 'shadow-lg',
    },
    'Tín dụng': {
      bg: 'from-purple-600 to-purple-800', // Giống WalletCard
      border: isDefault ? 'border-purple-400' : 'border-purple-500',
      text: 'text-white',
      badge: 'bg-purple-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(168,85,247,0.4)]' : 'shadow-lg',
    },
    'Đầu tư': {
      bg: 'from-amber-600 to-amber-800', // Giống WalletCard
      border: isDefault ? 'border-amber-400' : 'border-amber-500',
      text: 'text-white',
      badge: 'bg-amber-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(245,158,11,0.4)]' : 'shadow-lg',
    },
    'Khác': {
      bg: 'from-slate-600 to-slate-800', // Giống WalletCard
      border: isDefault ? 'border-slate-400' : 'border-slate-500',
      text: 'text-white',
      badge: 'bg-slate-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(100,116,139,0.4)]' : 'shadow-lg',
    },
  }
  return colors[type] || colors['Khác']
}

const getDefaultWalletId = (): string | null => {
  try {
    return localStorage.getItem(DEFAULT_WALLET_KEY)
  } catch {
    return null
  }
}

const saveDefaultWalletId = (walletId: string): void => {
  try {
    localStorage.setItem(DEFAULT_WALLET_KEY, walletId)
  } catch (error) {
    console.error('Error saving default wallet:', error)
  }
}

export const WalletsPage = () => {
  const { success, error: showError } = useNotification()
  const { showDialog } = useDialog()
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<WalletRecord | null>(null)
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
  const [showCheckAnimation, setShowCheckAnimation] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Tiền mặt' as WalletType,
    balance: '',
    currency: 'VND',
    description: '',
  })

  useEffect(() => {
    loadWallets()
    // Load default wallet ID from database
    const loadDefaultWallet = async () => {
      try {
        const savedDefaultWalletId = await getDefaultWallet()
        if (savedDefaultWalletId) {
          setDefaultWalletId(savedDefaultWalletId)
          saveDefaultWalletId(savedDefaultWalletId)
        } else {
          const localDefaultWalletId = getDefaultWalletId()
          if (localDefaultWalletId) {
            setDefaultWalletId(localDefaultWalletId)
          }
        }
      } catch (error) {
        console.error('Error loading default wallet:', error)
        const localDefaultWalletId = getDefaultWalletId()
        if (localDefaultWalletId) {
          setDefaultWalletId(localDefaultWalletId)
        }
      }
    }
    loadDefaultWallet()
  }, [])

  const loadWallets = async () => {
    setIsLoading(true)
    try {
      const data = await fetchWallets(true)
      setWallets(data)
      const savedDefaultWalletId = await getDefaultWallet()
      if (savedDefaultWalletId) {
        setDefaultWalletId(savedDefaultWalletId)
        saveDefaultWalletId(savedDefaultWalletId)
      } else {
        const localDefaultWalletId = getDefaultWalletId()
        setDefaultWalletId(localDefaultWalletId)
      }
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
    
    // Validation: Kiểm tra tất cả các trường bắt buộc
    if (!formData.name.trim()) {
      showError('Vui lòng nhập tên ví')
      return
    }
    
    if (!editingWallet && !formData.type) {
      showError('Vui lòng chọn loại ví')
      return
    }
    
    const balance = parseVNDInput(formData.balance)
    if (balance <= 0) {
      showError('Vui lòng nhập số dư ban đầu hợp lệ (lớn hơn 0)')
      return
    }
    
    if (!formData.description.trim()) {
      showError('Vui lòng nhập mô tả cho ví')
      return
    }
    
    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, {
          name: formData.name.trim(),
          balance,
          currency: formData.currency,
          description: formData.description.trim() || undefined,
        })
        success('Đã cập nhật ví thành công!')
      } else {
        await createWallet({
          name: formData.name.trim(),
          type: formData.type,
          balance,
          currency: formData.currency,
          description: formData.description.trim() || undefined,
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
    await showDialog({
      message: 'Bạn có chắc muốn xóa ví này?',
      type: 'warning',
      title: 'Xóa ví',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteWallet(id, false) // Soft delete
          success('Đã xóa ví thành công!')
          await loadWallets()
        } catch (error) {
          console.error('Error deleting wallet:', error)
          showError('Không thể xóa ví. Vui lòng thử lại.')
        }
      },
    })
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

  const handleSetDefault = async (wallet: WalletRecord) => {
    if (!wallet.is_active) {
      showError('Vui lòng kích hoạt ví trước khi đặt làm mặc định')
      return
    }

    // Nếu đã là ví mặc định thì không cần xác nhận lại
    if (defaultWalletId === wallet.id) {
      return
    }

    // Hiển thị thông báo xác nhận
    const confirmed = await showDialog({
      message: `Bạn có muốn đặt "${wallet.name}" làm ví mặc định? Ví này sẽ được sử dụng để tính toán thu nhập và chi tiêu.`,
      type: 'confirm',
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
    })

    if (confirmed) {
      try {
        await setDefaultWallet(wallet.id)
        setDefaultWalletId(wallet.id)
        saveDefaultWalletId(wallet.id)
        success(`Đã đặt "${wallet.name}" làm ví mặc định`)
      } catch (error) {
        console.error('Error setting default wallet:', error)
        // Fallback: lưu local để người dùng vẫn có thể sử dụng
        setDefaultWalletId(wallet.id)
        saveDefaultWalletId(wallet.id)
        success(`Đã đặt "${wallet.name}" làm ví mặc định trên thiết bị này`)
      }

      setShowCheckAnimation(wallet.id)
      setTimeout(() => {
        setShowCheckAnimation(null)
      }, 2000)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="VÍ CỦA BẠN" />

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
            <div className="space-y-4">
              {wallets.map((wallet) => {
                const isDefault = defaultWalletId === wallet.id
                const colors = getWalletTypeColors(wallet.type, isDefault)
                const isNegative = wallet.balance < 0
                
                return (
                  <div key={wallet.id} className="relative">
                    {/* Badge ví mặc định - đặt bên ngoài container để nổi bật */}
                    {isDefault && (
                      <div className={`absolute -top-3 -right-3 z-[100] flex items-center gap-1 rounded-full ${colors.badge} px-3 py-1.5 text-xs font-semibold text-white shadow-xl ring-2 ring-white/50`}>
                        <RiCheckLine className="h-3.5 w-3.5" />
                        <span>Mặc định</span>
                      </div>
                    )}
                    
                    <div
                      className={`relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${colors.bg} p-5 ring-2 transition-all duration-300 ${
                        isDefault 
                          ? `${colors.border} ${colors.shadow} ring-4` 
                          : `${colors.border} ${colors.shadow} ring-1`
                      } ${!wallet.is_active ? 'opacity-60' : ''}`}
                    >
                      {/* Animation check icon ở giữa thẻ */}
                      {showCheckAnimation === wallet.id && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center">
                          <div 
                            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-2xl"
                            style={{
                              animation: 'scaleIn 0.3s ease-out, scaleOut 0.3s ease-out 1.7s'
                            }}
                          >
                            <RiCheckLine className="h-10 w-10 text-emerald-500" />
                          </div>
                        </div>
                      )}

                      {/* Decorative waves - giống WalletCard */}
                      <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-20">
                        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                          <path
                            d="M0,50 Q100,30 200,50 T400,50 L400,100 L0,100 Z"
                            fill="white"
                          />
                          <path
                            d="M0,70 Q150,50 300,70 T400,70 L400,100 L0,100 Z"
                            fill="white"
                            opacity="0.5"
                          />
                        </svg>
                      </div>
                    
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      {/* Top section */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`truncate text-lg font-bold ${colors.text}`}>{wallet.name}</h3>
                            {!wallet.is_active && (
                              <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/80 backdrop-blur-sm">
                                Đã ẩn
                              </span>
                            )}
                          </div>
                          <p className={`mt-1 text-sm font-medium ${colors.text} opacity-70`}>{wallet.type}</p>
                          <p className={`mt-2 text-2xl font-bold ${isNegative ? 'text-rose-300' : colors.text}`}>
                            {formatCurrency(wallet.balance)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenForm(wallet)}
                            className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                          >
                            <RiEdit2Line className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(wallet.id)}
                            className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-rose-300"
                          >
                            <RiDeleteBin6Line className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Description section - luôn có không gian */}
                      <div className="mt-3 min-h-[2.5rem]">
                        {wallet.description ? (
                          <p className={`line-clamp-2 text-xs leading-relaxed ${colors.text} opacity-60`}>
                            {wallet.description}
                          </p>
                        ) : (
                          <div className="h-10"></div>
                        )}
                      </div>

                      {/* Bottom section */}
                      <div className={`mt-auto flex items-center justify-between border-t ${colors.text} border-opacity-20 pt-4`}>
                        <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(wallet)
                        }}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          wallet.is_active
                            ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                            : 'bg-sky-500/50 text-white hover:bg-sky-500/70 backdrop-blur-sm'
                        }`}
                      >
                          {wallet.is_active ? 'Ẩn ví' : 'Hiện ví'}
                        </button>
                        <div className="flex items-center gap-3">
                          {/* Icon chọn ví mặc định */}
                          {wallet.is_active && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSetDefault(wallet)
                              }}
                              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                isDefault
                                  ? 'bg-amber-400/90 text-white shadow-lg hover:bg-amber-400'
                                  : 'bg-white/20 text-white/80 hover:bg-white/30 hover:text-white backdrop-blur-sm'
                              }`}
                              title={isDefault ? 'Ví mặc định' : 'Đặt làm ví mặc định'}
                            >
                              {isDefault ? (
                                <>
                                  <RiStarFill className="h-4 w-4" />
                                  <span>Mặc định</span>
                                </>
                              ) : (
                                <>
                                  <RiStarLine className="h-4 w-4" />
                                  <span>Đặt mặc định</span>
                                </>
                              )}
                            </button>
                          )}
                          <span className={`text-xs font-medium ${colors.text} opacity-70`}>{wallet.currency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <FooterNav />

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end backdrop-blur-md bg-slate-950/50">
          <div className="flex w-full max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 rounded-t-3xl">
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
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">
                    Tên ví <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="Nhập tên ví (ví dụ: Ví chính, Ví tiết kiệm...)"
                    required
                  />
                </div>
                {!editingWallet && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-900">
                      Loại ví <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as WalletType })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      required
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
                  <label className="mb-2 block text-sm font-bold text-slate-900">
                    Số dư ban đầu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.balance}
                      onChange={(e) => {
                        const formatted = formatVNDInput(e.target.value)
                        setFormData({ ...formData, balance: formatted })
                      }}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Nhập số dư ban đầu (ví dụ: 1.000.000)"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                      ₫
                    </span>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">
                    Mô tả <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                    rows={4}
                    placeholder="Nhập mô tả cho ví (ví dụ: Ví dùng cho chi tiêu hàng ngày, Ví tiết kiệm dài hạn...)"
                    required
                  />
                </div>
                <div className="flex gap-3">
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

