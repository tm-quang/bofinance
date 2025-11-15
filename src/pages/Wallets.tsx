import { useEffect, useState } from 'react'
import { FaPlus, FaEdit, FaTrash, FaWallet, FaCheck, FaStar } from 'react-icons/fa'
import { useDataPreloader } from '../hooks/useDataPreloader'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { NumberPadModal } from '../components/ui/NumberPadModal'
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Component logo mờ để tái sử dụng
const WalletLogo = ({ className = 'h-32 w-32' }: { className?: string }) => (
  <div className="absolute right-2 top-16 -translate-y-16 z-0 opacity-15">
    <img 
      src="/logo-nontext.png" 
      alt="BO.fin Logo" 
      className={className}
    />
  </div>
)

const WALLET_TYPES: WalletType[] = ['Tiền mặt', 'Ngân hàng', 'Tiết kiệm', 'Tín dụng', 'Đầu tư', 'Khác']

const DEFAULT_WALLET_KEY = 'bofin_default_wallet_id'

// Màu sắc theo loại ví - Nâng cấp với gradient đẹp hơn, hiện đại hơn, màu đậm hơn
const getWalletTypeColors = (type: WalletType, isDefault: boolean) => {
  const colors = {
    'Tiền mặt': {
      bg: 'from-slate-900 via-slate-800 to-slate-950', // Gradient 3 màu đậm hơn nữa
      border: isDefault ? 'border-emerald-300' : 'border-slate-400/50',
      text: 'text-white',
      badge: 'bg-emerald-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(16,185,129,0.5)]' : 'shadow-xl shadow-black/20',
      glow: isDefault ? 'shadow-[0_0_40px_rgba(16,185,129,0.3)]' : '',
    },
    'Ngân hàng': {
      bg: 'from-blue-700 via-blue-800 to-indigo-900', // Gradient xanh dương đậm hơn nữa
      border: isDefault ? 'border-blue-300' : 'border-blue-400/50',
      text: 'text-white',
      badge: 'bg-blue-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(59,130,246,0.5)]' : 'shadow-xl shadow-black/20',
      glow: isDefault ? 'shadow-[0_0_40px_rgba(59,130,246,0.3)]' : '',
    },
    'Tiết kiệm': {
      bg: 'from-emerald-700 via-teal-800 to-cyan-900', // Gradient xanh lá đậm hơn nữa
      border: isDefault ? 'border-emerald-300' : 'border-emerald-400/50',
      text: 'text-white',
      badge: 'bg-emerald-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(16,185,129,0.5)]' : 'shadow-xl shadow-black/20',
      glow: isDefault ? 'shadow-[0_0_40px_rgba(16,185,129,0.3)]' : '',
    },
    'Tín dụng': {
      bg: 'from-purple-700 via-violet-800 to-fuchsia-900', // Gradient tím đậm hơn nữa
      border: isDefault ? 'border-purple-300' : 'border-purple-400/50',
      text: 'text-white',
      badge: 'bg-purple-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(168,85,247,0.5)]' : 'shadow-xl shadow-black/20',
      glow: isDefault ? 'shadow-[0_0_40px_rgba(168,85,247,0.3)]' : '',
    },
    'Đầu tư': {
      bg: 'from-amber-700 via-orange-800 to-rose-900', // Gradient vàng cam đậm hơn nữa
      border: isDefault ? 'border-amber-300' : 'border-amber-400/50',
      text: 'text-white',
      badge: 'bg-amber-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(245,158,11,0.5)]' : 'shadow-xl shadow-black/20',
      glow: isDefault ? 'shadow-[0_0_40px_rgba(245,158,11,0.3)]' : '',
    },
    'Khác': {
      bg: 'from-slate-800 via-gray-900 to-slate-950', // Gradient xám đậm hơn nữa
      border: isDefault ? 'border-slate-300' : 'border-slate-400/50',
      text: 'text-white',
      badge: 'bg-slate-500',
      shadow: isDefault ? 'shadow-[0_8px_30px_rgba(100,116,139,0.5)]' : 'shadow-xl shadow-black/20',
      glow: isDefault ? 'shadow-[0_0_40px_rgba(100,116,139,0.3)]' : '',
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
  useDataPreloader() // Preload data khi vào trang
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingInactive, setIsLoadingInactive] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<WalletRecord | null>(null)
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
  const [showCheckAnimation, setShowCheckAnimation] = useState<string | null>(null)
  const [showHiddenWallets, setShowHiddenWallets] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Tiền mặt' as WalletType,
    balance: '',
    currency: 'VND',
    description: '',
  })

  useEffect(() => {
    // Chỉ load một lần khi mount, cache sẽ được sử dụng
    // Nếu đã preload, dữ liệu sẽ lấy từ cache ngay lập tức
    loadWallets()
  }, []) // Chỉ load một lần, cache sẽ được sử dụng cho các lần sau

  const loadWallets = async () => {
    setIsLoading(true)
    try {
      // Tối ưu: Load song song các operations không phụ thuộc
      // Load active wallets trước để hiển thị nhanh, sau đó load inactive
      const [activeWallets, defaultWalletIdResult] = await Promise.all([
        fetchWallets(false), // Load active wallets trước (nhanh hơn)
        getDefaultWallet().catch(() => null), // Load default wallet song song
      ])
      
      // Hiển thị active wallets ngay lập tức (progressive loading)
      setWallets(activeWallets)
      setIsLoading(false) // Cho phép hiển thị ngay
      
      // Xử lý default wallet
      if (defaultWalletIdResult) {
        setDefaultWalletId(defaultWalletIdResult)
        saveDefaultWalletId(defaultWalletIdResult)
      } else {
        const localDefaultWalletId = getDefaultWalletId()
        if (localDefaultWalletId) {
        setDefaultWalletId(localDefaultWalletId)
      }
      }
      
      // Load inactive wallets trong background (không block UI)
      setIsLoadingInactive(true)
      fetchWallets(true)
        .then((allWallets) => {
          // Chỉ cập nhật nếu có thay đổi (có inactive wallets)
          if (allWallets.length !== activeWallets.length) {
            setWallets(allWallets)
          }
        })
        .catch((error) => {
          console.error('Error loading inactive wallets:', error)
          // Không ảnh hưởng đến UI, vì active wallets đã hiển thị
        })
        .finally(() => {
          setIsLoadingInactive(false)
        })
    } catch (error) {
      console.error('Error loading wallets:', error)
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
    setIsNumberPadOpen(false)
  }

  // Lock body scroll when form modal is open
  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isFormOpen])

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
    // Kiểm tra xem ví có giao dịch không để hiển thị cảnh báo chính xác
    try {
      const { fetchTransactions } = await import('../lib/transactionService')
      const transactions = await fetchTransactions({ wallet_id: id })
      const transactionCount = transactions.length

      const wallet = wallets.find((w) => w.id === id)
      const walletName = wallet?.name || 'ví này'

      await showDialog({
        message: transactionCount > 0
          ? `Xóa ví "${walletName}" và ${transactionCount} giao dịch liên quan?\n\n` +
            `⚠️ Xóa vĩnh viễn, không thể phục hồi`
          : `Xóa ví "${walletName}"?\n\n` +
            `⚠️ Xóa vĩnh viễn, không thể phục hồi`,
        type: 'error',
        title: 'Xóa ví',
        confirmText: 'Đồng ý xóa',
        cancelText: 'Hủy bỏ',
        middleText: 'Ẩn ví',
        onConfirm: async () => {
          try {
            // Hard delete: xóa ví và tất cả giao dịch (do ON DELETE CASCADE)
            await deleteWallet(id, true)
            if (transactionCount > 0) {
              success(`Đã xóa ví "${walletName}" và ${transactionCount} giao dịch liên quan!`)
            } else {
              success(`Đã xóa ví "${walletName}"!`)
            }
            await loadWallets()
          } catch (error) {
            console.error('Error deleting wallet:', error)
            showError('Không thể xóa ví. Vui lòng thử lại.')
          }
        },
        onMiddle: async () => {
          // Soft delete: chỉ ẩn ví, giữ lại giao dịch
          try {
            await deleteWallet(id, false)
            success(`Đã ẩn ví "${walletName}"!`)
            await loadWallets()
          } catch (error) {
            console.error('Error hiding wallet:', error)
            showError('Không thể ẩn ví. Vui lòng thử lại.')
          }
        },
      })
    } catch (error) {
      console.error('Error checking transactions:', error)
      // Fallback: vẫn cho phép xóa với cảnh báo
      await showDialog({
        message: `Xóa ví?\n\n⚠️ Xóa vĩnh viễn, không thể phục hồi`,
        type: 'error',
        title: 'Xóa ví',
        confirmText: 'Đồng ý xóa',
        cancelText: 'Hủy bỏ',
        middleText: 'Ẩn ví',
        onConfirm: async () => {
          try {
            await deleteWallet(id, true)
            success('Đã xóa ví!')
            await loadWallets()
          } catch (error) {
            console.error('Error deleting wallet:', error)
            showError('Không thể xóa ví. Vui lòng thử lại.')
          }
        },
        onMiddle: async () => {
          try {
            await deleteWallet(id, false)
            success('Đã ẩn ví!')
            await loadWallets()
          } catch (error) {
            console.error('Error hiding wallet:', error)
            showError('Không thể ẩn ví. Vui lòng thử lại.')
          }
        },
      })
    }
  }

  const handleToggleActive = async (wallet: WalletRecord) => {
    try {
      await updateWallet(wallet.id, { is_active: !wallet.is_active })
      if (wallet.is_active) {
        success(`Đã ẩn ví "${wallet.name}". Ví này sẽ không hiển thị và không được tính vào số dư.`)
      } else {
        success(`Đã khôi phục ví "${wallet.name}". Ví này đã có thể sử dụng lại.`)
      }
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
            <FaPlus className="h-5 w-5" />
            Thêm ví mới
          </button>

          {/* Wallets list */}
          {isLoading ? (
            <WalletListSkeleton count={5} />
          ) : wallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-sm">
              <FaWallet className="mb-4 h-16 w-16 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Chưa có ví nào</p>
              <p className="mt-1 text-xs text-slate-500">Tạo ví đầu tiên để bắt đầu</p>
            </div>
          ) : (
            <>
              {/* Active Wallets */}
              {(() => {
                const activeWallets = wallets.filter((w) => w.is_active)
                return activeWallets.length > 0 ? (
                  <div className="space-y-4">
                    {activeWallets.map((wallet) => {
                const isDefault = defaultWalletId === wallet.id
                const colors = getWalletTypeColors(wallet.type, isDefault)
                const isNegative = wallet.balance < 0
                
                return (
                  <div key={wallet.id} className="relative">
                    <div
                      className={`relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${colors.bg} p-5 ring-2 transition-all duration-300 ${
                        isDefault 
                          ? `${colors.border} ${colors.shadow} ${colors.glow} ring-4` 
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
                            <FaCheck className="h-10 w-10 text-emerald-500" />
                          </div>
                        </div>
                      )}

                      {/* Decorative patterns - Kiểu ATM card hiện đại */}
                      <div className="absolute inset-0 overflow-hidden rounded-3xl">
                        {/* Geometric patterns - Blur circles */}
                        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl"></div>
                        <div className="absolute -right-8 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-xl"></div>
                        <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-lg"></div>
                        <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-white/5 blur-2xl"></div>
                        
                        {/* Wave patterns - Đường viền mờ dưới nền */}
                        <svg className="absolute bottom-0 left-0 w-full opacity-15" viewBox="0 0 400 180" preserveAspectRatio="none">
                          <path
                            d="M0,120 Q100,60 200,120 T400,120 L400,180 L0,180 Z"
                            fill="white"
                          />
                          <path
                            d="M0,150 Q150,90 300,150 T400,150 L400,180 L0,180 Z"
                            fill="white"
                            opacity="0.6"
                          />
                        </svg>
                        
                        {/* Thêm đường viền mờ thứ 2 */}
                        <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 400 180" preserveAspectRatio="none">
                          <path
                            d="M0,100 Q120,40 240,100 T400,100 L400,180 L0,180 Z"
                            fill="white"
                            opacity="0.5"
                          />
                        </svg>
                        
                        {/* Thêm đường viền mờ thứ 3 */}
                        <svg className="absolute bottom-0 left-0 w-full opacity-8" viewBox="0 0 400 180" preserveAspectRatio="none">
                          <path
                            d="M0,130 Q80,70 160,130 T400,130 L400,180 L0,180 Z"
                            fill="white"
                            opacity="0.4"
                          />
                        </svg>

                        {/* Logo mờ ở giữa 1/3 bên phải */}
                        <WalletLogo className="h-32 w-32 object-contain" />
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
                            <FaEdit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(wallet.id)}
                            className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-rose-300"
                          >
                            <FaTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Description section - luôn có không gian */}
                      <div className="mt-3 min-h-[2.5rem]">
                        <div className="flex items-start justify-between gap-2">
                          {wallet.description ? (
                            <p className={`flex-1 line-clamp-2 text-xs leading-relaxed ${colors.text} opacity-60`}>
                              {wallet.description}
                            </p>
                          ) : (
                            <div className="flex-1 h-10"></div>
                          )}
                          <span className={`shrink-0 text-[10px] font-medium ${colors.text} opacity-60`}>
                            Ngày tạo ví: {formatDate(wallet.created_at)}
                          </span>
                        </div>
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
                                  <FaStar className="h-4 w-4" />
                                  <span>Ví mặc định</span>
                                </>
                              ) : (
                                <>
                                  <FaStar className="h-4 w-4" />
                                  <span>Đặt làm ví mặc định</span>
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
                ) : null
              })()}

              {/* Hidden Wallets Section */}
              {(() => {
                const hiddenWallets = wallets.filter((w) => !w.is_active)
                return hiddenWallets.length > 0 ? (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-600">
                        Ví đã ẩn ({hiddenWallets.length})
                        {isLoadingInactive && (
                          <span className="ml-2 text-xs text-slate-400">(Đang tải...)</span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowHiddenWallets(!showHiddenWallets)}
                        className="text-xs font-medium text-sky-600 hover:text-sky-700"
                      >
                        {showHiddenWallets ? 'Ẩn' : 'Hiển thị'}
                      </button>
                    </div>
                    {showHiddenWallets && (
                      <div className="space-y-4">
                        {hiddenWallets.map((wallet) => {
                          const colors = getWalletTypeColors(wallet.type, false)
                          const isNegative = wallet.balance < 0
                          
                          return (
                            <div key={wallet.id} className="relative">
                              <div
                                className={`relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${colors.bg} p-5 ring-2 ring-slate-300 opacity-70 transition-all duration-300 ${colors.shadow}`}
                              >
                                {/* Decorative patterns - Kiểu ATM card hiện đại */}
                                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                                  {/* Geometric patterns - Blur circles */}
                                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl"></div>
                                  <div className="absolute -right-8 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-xl"></div>
                                  <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-lg"></div>
                                  <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-white/5 blur-2xl"></div>
                                  
                                  {/* Wave patterns - Đường viền mờ dưới nền */}
                                  <svg className="absolute bottom-0 left-0 w-full opacity-15" viewBox="0 0 400 180" preserveAspectRatio="none">
                                    <path
                                      d="M0,120 Q100,60 200,120 T400,120 L400,180 L0,180 Z"
                                      fill="white"
                                    />
                                    <path
                                      d="M0,150 Q150,90 300,150 T400,150 L400,180 L0,180 Z"
                                      fill="white"
                                      opacity="0.6"
                                    />
                                  </svg>
                                  
                                  {/* Thêm đường viền mờ thứ 2 */}
                                  <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 400 180" preserveAspectRatio="none">
                                    <path
                                      d="M0,100 Q120,40 240,100 T400,100 L400,180 L0,180 Z"
                                      fill="white"
                                      opacity="0.5"
                                    />
                                  </svg>
                                  
                                  {/* Thêm đường viền mờ thứ 3 */}
                                  <svg className="absolute bottom-0 left-0 w-full opacity-8" viewBox="0 0 400 180" preserveAspectRatio="none">
                                    <path
                                      d="M0,130 Q80,70 160,130 T400,130 L400,180 L0,180 Z"
                                      fill="white"
                                      opacity="0.4"
                                    />
                                  </svg>

                                  {/* Logo mờ ở giữa 1/3 bên phải */}
                                  <WalletLogo className="h-32 w-32 object-contain" />
                                </div>
                              
                                <div className="relative z-10 flex h-full flex-col justify-between">
                                  {/* Top section */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className={`truncate text-lg font-bold ${colors.text}`}>{wallet.name}</h3>
                                        <span className="shrink-0 rounded-full bg-white/30 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                                          Đã ẩn
                                        </span>
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
                                        <FaEdit className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(wallet.id)}
                                        className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-rose-300"
                                      >
                                        <FaTrash className="h-5 w-5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div className="mt-3 min-h-[2.5rem]">
                                    <div className="flex items-start justify-between gap-2">
                                      {wallet.description ? (
                                        <p className={`flex-1 line-clamp-2 text-xs leading-relaxed ${colors.text} opacity-60`}>
                                          {wallet.description}
                                        </p>
                                      ) : (
                                        <div className="flex-1 h-10"></div>
                                      )}
                                      <span className={`shrink-0 text-[10px] font-medium ${colors.text} opacity-60`}>
                                        Ngày tạo ví: {formatDate(wallet.created_at)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Bottom section */}
                                  <div className={`mt-auto flex items-center justify-between border-t ${colors.text} border-opacity-20 pt-4`}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleActive(wallet)
                                      }}
                                      className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 shadow-sm"
                                    >
                                      Khôi phục
                                    </button>
                                    <span className={`text-xs font-medium ${colors.text} opacity-70`}>{wallet.currency}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </>
          )}
        </div>
      </main>

      <FooterNav onAddClick={() => setIsTransactionModalOpen(true)} />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={() => {
          // Reload wallets to reflect transaction changes
          loadWallets()
        }}
      />

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
          <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
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
                      onFocus={() => setIsNumberPadOpen(true)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                      placeholder="Nhập số dư ban đầu (ví dụ: 1.000.000)"
                      required
                      readOnly
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

      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={isNumberPadOpen && isFormOpen}
        onClose={() => setIsNumberPadOpen(false)}
        value={formData.balance}
        onChange={(value) => setFormData({ ...formData, balance: value })}
        onConfirm={() => setIsNumberPadOpen(false)}
      />
    </div>
  )
}

export default WalletsPage



