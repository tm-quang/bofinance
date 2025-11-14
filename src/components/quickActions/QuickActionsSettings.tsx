import { useEffect, useState, useEffectEvent } from 'react'
import { RiCloseLine, RiDragMoveLine } from 'react-icons/ri'

type QuickAction = {
  id: string
  label: string
  enabled: boolean
}

type QuickActionsSettingsProps = {
  isOpen: boolean
  onClose: () => void
  actions: QuickAction[]
  onUpdate: (actions: QuickAction[]) => void
}

export const QuickActionsSettings = ({
  isOpen,
  onClose,
  actions,
  onUpdate,
}: QuickActionsSettingsProps) => {
  const [localActions, setLocalActions] = useState<QuickAction[]>(actions)
  const syncLocalActions = useEffectEvent((next: QuickAction[]) => {
    setLocalActions(next)
  })

  useEffect(() => {
    if (isOpen) {
      syncLocalActions(actions)
    }
  }, [isOpen, actions])

  const handleToggle = (id: string) => {
    setLocalActions((prev) =>
      prev.map((action) => (action.id === id ? { ...action, enabled: !action.enabled } : action))
    )
  }

  const handleSave = () => {
    onUpdate(localActions)
    onClose()
  }

  const handleReset = () => {
    const defaultActions = actions.map((action, index) => ({
      ...action,
      enabled: index < 4 || action.id === 'settings', // Mặc định 4 chức năng đầu tiên + cài đặt
    }))
    setLocalActions(defaultActions)
  }

  if (!isOpen) return null

  const enabledCount = localActions.filter((a) => a.enabled).length

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-md bg-slate-950/50">
      <div className="flex w-full max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Cài đặt chức năng nhanh</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Chọn các chức năng hiển thị trên Dashboard ({enabledCount} đã chọn)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <RiCloseLine className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-3">
            {localActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <RiDragMoveLine className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{action.label}</p>
                    <p className="text-xs text-slate-500">
                      {action.enabled ? 'Đang hiển thị' : 'Đã ẩn'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(action.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                    action.enabled ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      action.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {enabledCount === 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-medium text-amber-800">
                ⚠️ Bạn cần chọn ít nhất 1 chức năng để hiển thị
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:py-3 sm:text-base"
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={enabledCount === 0}
              className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed sm:py-3 sm:text-base"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

