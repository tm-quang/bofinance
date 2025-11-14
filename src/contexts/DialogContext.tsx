import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { DialogContext, type DialogOptions, type DialogType } from './dialogContext.helpers'

interface DialogProviderProps {
  children: ReactNode
}

export const DialogProvider = ({ children }: DialogProviderProps) => {
  const [dialog, setDialog] = useState<DialogOptions | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const showDialog = (options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        onConfirm: async () => {
          setIsLoading(true)
          try {
            if (options.onConfirm) {
              await options.onConfirm()
            }
            resolve(true)
          } catch (error) {
            console.error('Dialog confirm error:', error)
            resolve(false)
          } finally {
            setIsLoading(false)
            setIsOpen(false)
            setDialog(null)
          }
        },
        onCancel: () => {
          if (options.onCancel) {
            options.onCancel()
          }
          resolve(false)
          setIsOpen(false)
          setDialog(null)
        },
      })
      setIsOpen(true)
    })
  }

  const showConfirm = (message: string, onConfirm?: () => void | Promise<void>): Promise<boolean> => {
    return showDialog({
      message,
      type: 'confirm',
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      onConfirm,
      showCancel: true,
    })
  }

  const showAlert = (message: string, type: DialogType = 'info'): Promise<void> => {
    return new Promise((resolve) => {
      showDialog({
        message,
        type,
        confirmText: 'Đóng',
        showCancel: false,
        onConfirm: () => {
          resolve()
        },
      })
    })
  }

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false)
      if (dialog?.onCancel) {
        dialog.onCancel()
      }
      setTimeout(() => setDialog(null), 300)
    }
  }

  return (
    <DialogContext.Provider value={{ showDialog, showConfirm, showAlert }}>
      {children}
      {dialog && (
        <ConfirmDialog
          isOpen={isOpen}
          onClose={handleClose}
          title={dialog.title}
          message={dialog.message}
          type={dialog.type || 'confirm'}
          confirmText={dialog.confirmText || 'Xác nhận'}
          cancelText={dialog.cancelText || 'Hủy'}
          showCancel={dialog.showCancel !== false}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
          isLoading={isLoading}
        />
      )}
    </DialogContext.Provider>
  )
}

