import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCalendar, FaCheck, FaTimes, FaEdit, FaTrash, FaPlus, FaBell, FaBellSlash } from 'react-icons/fa'
import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { ReminderModal } from '../components/reminders/ReminderModal'
import { ReminderCalendar } from '../components/reminders/ReminderCalendar'
import { NoteModal } from '../components/reminders/NoteModal'
import { CalendarActionSheet } from '../components/reminders/CalendarActionSheet'
import { NotificationSettings } from '../components/reminders/NotificationSettings'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  fetchReminders,
  completeReminder,
  skipReminder,
  deleteReminder,
  updateReminder,
  type ReminderRecord,
} from '../lib/reminderService'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNode } from '../utils/iconLoader'
import { formatVNDDisplay } from '../utils/currencyInput'
import { requestNotificationPermission } from '../lib/notificationService'
import { startPeriodicReminderCheck, checkRemindersAndNotify } from '../lib/serviceWorkerManager'


const RemindersPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ReminderRecord | null>(null)
  // const [selectedReminder, setSelectedReminder] = useState<ReminderRecord | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [reminderToDelete, setReminderToDelete] = useState<ReminderRecord | null>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | undefined>(undefined)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)

  useEffect(() => {
    loadData()
    
    // Request notification permission on mount
    requestNotificationPermission()
  }, [])

  // Start periodic reminder checking via Service Worker (works in background)
  useEffect(() => {
    if (reminders.length === 0) return

    // Start Service Worker periodic checking (works even when browser is closed)
    startPeriodicReminderCheck()
    
    // Also check immediately when reminders change
    checkRemindersAndNotify().catch(console.error)

    return () => {
      // Service Worker continues running in background
    }
  }, [reminders.length])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [remindersData, categoriesData, walletsData] = await Promise.all([
        fetchReminders({ is_active: true }),
        fetchCategories(),
        fetchWallets(false),
      ])

      // Load icons for all categories
      const iconsMap: Record<string, React.ReactNode> = {}
      await Promise.all(
        categoriesData.map(async (category) => {
          try {
            const iconNode = await getIconNode(category.icon_id)
            if (iconNode) {
              iconsMap[category.id] = <span className="h-5 w-5">{iconNode}</span>
            } else {
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-5 w-5" />
              }
            }
          } catch (error) {
            console.error('Error loading icon for category:', category.id, error)
            const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
            if (hardcodedIcon?.icon) {
              const IconComponent = hardcodedIcon.icon
              iconsMap[category.id] = <IconComponent className="h-5 w-5" />
            }
          }
        })
      )
      setCategoryIcons(iconsMap)

      // Sort reminders by date
      const sortedReminders = [...remindersData].sort((a, b) => {
        const dateA = new Date(`${a.reminder_date} ${a.reminder_time || '00:00'}`).getTime()
        const dateB = new Date(`${b.reminder_date} ${b.reminder_time || '00:00'}`).getTime()
        return dateA - dateB
      })

      setReminders(sortedReminders)
      setCategories(categoriesData)
      setWallets(walletsData)
    } catch (error) {
      showError('Không thể tải danh sách nhắc nhở.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClick = () => {
    setEditingReminder(null)
    setSelectedCalendarDate(undefined)
    setIsModalOpen(true)
  }

  const handleCalendarDateClick = (date: string) => {
    setSelectedCalendarDate(date)
    setIsActionSheetOpen(true)
  }

  const handleSelectNote = () => {
    setIsActionSheetOpen(false)
    // Don't reset selectedCalendarDate here, let modal use it
    setIsNoteModalOpen(true)
    setEditingReminder(null)
  }

  const handleSelectReminder = () => {
    setIsActionSheetOpen(false)
    // Don't reset selectedCalendarDate here, let modal use it
    setIsModalOpen(true)
    setEditingReminder(null)
  }

  const handleEdit = (reminder: ReminderRecord) => {
    // Check if it's a note (no amount, category, wallet) or reminder
    const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
    
    if (isNote) {
      setEditingReminder(reminder)
      setIsNoteModalOpen(true)
    } else {
      setEditingReminder(reminder)
      setIsModalOpen(true)
    }
  }

  const handleDelete = (reminder: ReminderRecord) => {
    setReminderToDelete(reminder)
    setIsDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reminderToDelete) return

    try {
      await deleteReminder(reminderToDelete.id)
      success('Đã xóa nhắc nhở thành công!')
      loadData()
    } catch (error) {
      showError('Không thể xóa nhắc nhở.')
    } finally {
      setIsDeleteConfirmOpen(false)
      setReminderToDelete(null)
    }
  }

  const handleComplete = async (reminder: ReminderRecord) => {
    try {
      await completeReminder(reminder.id)
      success('Đã đánh dấu hoàn thành!')
      loadData()
    } catch (error) {
      showError('Không thể cập nhật nhắc nhở.')
    }
  }

  const handleSkip = async (reminder: ReminderRecord) => {
    try {
      await skipReminder(reminder.id)
      success('Đã bỏ qua nhắc nhở!')
      loadData()
    } catch (error) {
      showError('Không thể cập nhật nhắc nhở.')
    }
  }

  const handleCreateTransaction = (reminder: ReminderRecord) => {
    // Navigate to add transaction page with reminder data
    navigate(`/add-transaction?type=${reminder.type}&reminderId=${reminder.id}`)
  }

  const getCategoryInfo = (categoryId: string | null) => {
    if (!categoryId) return { name: 'Khác', icon: null }
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category) return { name: 'Khác', icon: null }
    return {
      name: category.name,
      icon: categoryIcons[category.id] || null,
    }
  }

  const getWalletName = (walletId: string | null) => {
    if (!walletId) return null
    const wallet = wallets.find((w) => w.id === walletId)
    return wallet?.name || null
  }

  // Group reminders by date
  const today = new Date().toISOString().split('T')[0]
  const todayReminders = reminders.filter((r) => r.reminder_date === today && r.status === 'pending')
  const upcomingReminders = reminders.filter(
    (r) => r.reminder_date > today && r.status === 'pending'
  )
  const pastReminders = reminders.filter((r) => r.reminder_date < today && r.status === 'pending')

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)

    if (dateOnly.getTime() === today.getTime()) {
      return 'Hôm nay'
    }

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateOnly.getTime() === tomorrow.getTime()) {
      return 'Ngày mai'
    }

    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    return `${hours}:${minutes}`
  }

  const getReminderColor = (reminder: ReminderRecord) => {
    if (reminder.color) return reminder.color
    
    // Default colors based on type
    const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
    if (isNote) return 'amber'
    return reminder.type === 'Thu' ? 'emerald' : 'rose'
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
      amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-500', dot: 'bg-amber-500' },
      emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-500', dot: 'bg-emerald-500' },
      rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-500', dot: 'bg-rose-500' },
      sky: { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'bg-sky-500', dot: 'bg-sky-500' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-500', dot: 'bg-blue-500' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-500', dot: 'bg-purple-500' },
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-500', dot: 'bg-indigo-500' },
      pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'bg-pink-500', dot: 'bg-pink-500' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-500', dot: 'bg-orange-500' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-500', dot: 'bg-teal-500' },
    }
    return colorMap[color] || colorMap.amber
  }

  const handleToggleNotification = async (reminder: ReminderRecord) => {
    try {
      await updateReminder(reminder.id, {
        enable_notification: !reminder.enable_notification,
      })
      await loadData()
      success(`Đã ${reminder.enable_notification ? 'tắt' : 'bật'} thông báo cho nhắc nhở`)
    } catch (error) {
      showError('Không thể cập nhật thông báo')
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Kế hoạch nhắc nhở" />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
          {/* Notification Settings */}
          <NotificationSettings />

          {/* Calendar */}
          <ReminderCalendar
            reminders={reminders}
            onDateClick={handleCalendarDateClick}
            selectedDate={selectedCalendarDate}
          />

          {/* Header with Add Button */}
          {reminders.length > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Kế hoạch nhắc nhở</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {reminders.filter((r) => r.status === 'pending').length} nhắc nhở đang chờ
                </p>
              </div>
              <button
                onClick={handleAddClick}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 active:scale-95"
              >
                <FaPlus className="h-4 w-4" />
                Thêm mới
              </button>
            </div>
          )}

          {/* Today's Reminders */}
          {todayReminders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Kế hoạch hôm nay
              </h2>
              <div className="space-y-2">
                {todayReminders.map((reminder) => {
                  const categoryInfo = getCategoryInfo(reminder.category_id)
                  const walletName = getWalletName(reminder.wallet_id)
                  const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
                  const reminderColor = getReminderColor(reminder)
                  const colorClasses = getColorClasses(reminderColor)

                  return (
                    <div
                      key={reminder.id}
                      className={`rounded-2xl p-4 shadow-lg ring-1 ${colorClasses.bg} ${colorClasses.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClasses.icon} text-white`}
                        >
                          {categoryInfo.icon ? (
                            <span className="text-white">{categoryInfo.icon}</span>
                          ) : (
                            <FaCalendar className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900">{reminder.title}</h3>
                          {reminder.amount && (
                            <p className="mt-1 text-lg font-bold text-slate-900">
                              {formatVNDDisplay(reminder.amount)}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            {categoryInfo.name && (
                              <span className="rounded-full bg-white/80 px-2 py-1">
                                {categoryInfo.name}
                              </span>
                            )}
                            {walletName && (
                              <span className="rounded-full bg-white/80 px-2 py-1">{walletName}</span>
                            )}
                            {reminder.reminder_time && (
                              <span className="rounded-full bg-white/80 px-2 py-1">
                                {formatTime(reminder.reminder_time)}
                              </span>
                            )}
                          </div>
                          {reminder.notes && (
                            <p className="mt-2 text-sm text-slate-600">{reminder.notes}</p>
                          )}
                          {isNote && (
                            <span className="mt-2 inline-block rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-600">
                              Ghi chú
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleNotification(reminder)}
                          className="shrink-0 text-slate-400 hover:text-slate-600 transition"
                          title={reminder.enable_notification ? 'Tắt thông báo' : 'Bật thông báo'}
                        >
                          {reminder.enable_notification ? (
                            <FaBell className="h-4 w-4" />
                          ) : (
                            <FaBellSlash className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {!isNote && (
                          <button
                            onClick={() => handleCreateTransaction(reminder)}
                            className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Tạo giao dịch
                          </button>
                        )}
                        <button
                          onClick={() => handleComplete(reminder)}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                        >
                          <FaCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSkip(reminder)}
                          className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300"
                        >
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Sắp tới
              </h2>
              <div className="space-y-2">
                {upcomingReminders.map((reminder) => {
                  const categoryInfo = getCategoryInfo(reminder.category_id)
                  const walletName = getWalletName(reminder.wallet_id)
                  const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
                  const reminderColor = getReminderColor(reminder)
                  const colorClasses = getColorClasses(reminderColor)

                  return (
                    <div
                      key={reminder.id}
                      className={`rounded-2xl p-4 shadow-sm ring-1 ${colorClasses.bg} ${colorClasses.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClasses.icon} text-white`}
                        >
                          {categoryInfo.icon ? (
                            <span className="text-white">{categoryInfo.icon}</span>
                          ) : (
                            <FaCalendar className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900">{reminder.title}</h3>
                              {reminder.amount && (
                                <p className="mt-1 text-base font-bold text-slate-900">
                                  {formatVNDDisplay(reminder.amount)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">
                                {formatDate(reminder.reminder_date)}
                              </p>
                              {reminder.reminder_time && (
                                <p className="text-xs text-slate-500">
                                  {formatTime(reminder.reminder_time)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            {categoryInfo.name && (
                              <span className="rounded-full bg-slate-100 px-2 py-1">
                                {categoryInfo.name}
                              </span>
                            )}
                            {walletName && (
                              <span className="rounded-full bg-white/80 px-2 py-1">{walletName}</span>
                            )}
                            {isNote && (
                              <span className="rounded-full bg-white/80 px-2 py-1">Ghi chú</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleNotification(reminder)}
                          className="shrink-0 text-slate-400 hover:text-slate-600 transition"
                          title={reminder.enable_notification ? 'Tắt thông báo' : 'Bật thông báo'}
                        >
                          {reminder.enable_notification ? (
                            <FaBell className="h-4 w-4" />
                          ) : (
                            <FaBellSlash className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleEdit(reminder)}
                          className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                        >
                          <FaEdit className="mr-2 inline h-4 w-4" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(reminder)}
                          className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Past Reminders */}
          {pastReminders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Đã qua
              </h2>
              <div className="space-y-2">
                {pastReminders.map((reminder) => {
                  const categoryInfo = getCategoryInfo(reminder.category_id)
                  const isIncome = reminder.type === 'Thu'

                  return (
                    <div
                      key={reminder.id}
                      className="rounded-2xl bg-slate-50 p-4 opacity-60 ring-1 ring-slate-200"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {categoryInfo.icon ? (
                            categoryInfo.icon
                          ) : (
                            <FaCalendar className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-700">{reminder.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(reminder.reminder_date)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(reminder)}
                          className="rounded-xl bg-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-300"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Empty State */}
          {!isLoading && reminders.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 shadow-lg ring-1 ring-slate-100">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <FaCalendar className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Chưa có kế hoạch nhắc nhở nào
              </h3>
              <p className="mb-6 text-center text-sm text-slate-500">
                Tạo nhắc nhở mới để không bỏ lỡ các khoản thu chi quan trọng
              </p>
              <button
                onClick={handleAddClick}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-white font-semibold shadow-lg hover:from-sky-600 hover:to-blue-700 transition-all"
              >
                <FaPlus className="h-5 w-5" />
                Tạo nhắc nhở đầu tiên
              </button>
            </div>
          )}
        </div>
      </main>

      <FooterNav onAddClick={handleAddClick} />

      {/* Calendar Action Sheet */}
      <CalendarActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => {
          setIsActionSheetOpen(false)
          // Only reset selectedCalendarDate if user cancels, not when selecting an action
        }}
        onSelectNote={handleSelectNote}
        onSelectReminder={handleSelectReminder}
        date={selectedCalendarDate || new Date().toISOString().split('T')[0]}
      />

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingReminder(null)
          setSelectedCalendarDate(undefined)
        }}
        onSuccess={() => {
          loadData()
          setIsModalOpen(false)
          setEditingReminder(null)
          setSelectedCalendarDate(undefined)
        }}
        reminder={editingReminder}
        defaultDate={selectedCalendarDate}
      />

      {/* Note Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false)
          setEditingReminder(null)
          setSelectedCalendarDate(undefined)
        }}
        onSuccess={() => {
          loadData()
          setIsNoteModalOpen(false)
          setEditingReminder(null)
          setSelectedCalendarDate(undefined)
        }}
        note={editingReminder}
        defaultDate={selectedCalendarDate}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
          setReminderToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Xóa nhắc nhở"
        message="Bạn có chắc chắn muốn xóa nhắc nhở này?"
        confirmText="Xóa"
        cancelText="Hủy"
        type="error"
      />
    </div>
  )
}

export default RemindersPage

