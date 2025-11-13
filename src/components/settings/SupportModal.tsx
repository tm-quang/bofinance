import { useState } from 'react'
import { RiCloseLine, RiBugLine, RiFeedbackLine } from 'react-icons/ri'

type SupportModalProps = {
  isOpen: boolean
  onClose: () => void
  type: 'feedback' | 'bug'
}

export const SupportModal = ({ isOpen, onClose, type }: SupportModalProps) => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!formData.subject || !formData.message) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    setIsSubmitting(true)
    try {
      // TODO: Implement API call to send feedback/bug report
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess(true)
      setFormData({ subject: '', message: '' })
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi phản hồi')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isFeedback = type === 'feedback'
  const title = isFeedback ? 'Gửi góp ý' : 'Báo lỗi'
  const description = isFeedback
    ? 'Chia sẻ ý kiến của bạn để chúng tôi cải thiện ứng dụng'
    : 'Mô tả lỗi bạn gặp phải để chúng tôi khắc phục'

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-md bg-slate-950/50">
      <div className="flex w-full max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{description}</p>
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
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-600">
              Gửi thành công! Cảm ơn bạn đã phản hồi.
            </div>
          )}

          <form onSubmit={handleSubmit} id="support-form" className="space-y-4">
            {/* Subject */}
            <div>
              <label htmlFor="subject" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                {isFeedback ? 'Tiêu đề góp ý' : 'Tiêu đề lỗi'}
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder={isFeedback ? 'Ví dụ: Tính năng mới mong muốn' : 'Ví dụ: Ứng dụng bị crash khi...'}
                className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                {isFeedback ? 'Nội dung góp ý' : 'Mô tả chi tiết'}
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                placeholder={isFeedback ? 'Mô tả chi tiết góp ý của bạn...' : 'Mô tả chi tiết lỗi bạn gặp phải, các bước để tái hiện lỗi...'}
                rows={6}
                className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none sm:p-4"
                required
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:py-3 sm:text-base"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="support-form"
              className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 sm:py-3 sm:text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

