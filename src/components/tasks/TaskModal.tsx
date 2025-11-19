import { useEffect, useState } from 'react'
import { FaTimes, FaCalendar, FaChartLine } from 'react-icons/fa'
import { ModalFooterButtons } from '../ui/ModalFooterButtons'
import { DateTimePickerModal } from '../ui/DateTimePickerModal'
import type { TaskRecord, TaskStatus, TaskPriority } from '../../lib/taskService'

type TaskModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (taskData: {
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    deadline?: string | null
    progress?: number
    tags?: string[]
  }) => void
  task?: TaskRecord | null
}

export const TaskModal = ({ isOpen, onClose, onSave, task }: TaskModalProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('pending')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [deadline, setDeadline] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title)
        setDescription(task.description || '')
        setStatus(task.status)
        setPriority(task.priority)
        setDeadline(task.deadline)
        setProgress(task.progress)
        setTags(task.tags || [])
      } else {
        // Reset form for new task
        setTitle('')
        setDescription('')
        setStatus('pending')
        setPriority('medium')
        setDeadline(null)
        setProgress(0)
        setTags([])
        setTagInput('')
      }
      setError(null)
    }
  }, [isOpen, task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề công việc')
      return
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      deadline,
      progress,
      tags: tags.length > 0 ? tags : undefined,
    })
  }

  const handleTagAdd = () => {
    const value = tagInput.trim()
    if (value && !tags.includes(value)) {
      setTags([...tags, value])
      setTagInput('')
    }
  }

  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
        <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                {task ? 'Sửa công việc' : 'Thêm công việc'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {task ? 'Chỉnh sửa thông tin công việc' : 'Nhập thông tin công việc mới'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
            >
              <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {error && (
              <div className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 sm:text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} id="task-form" className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Tiêu đề <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề công việc..."
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập mô tả công việc..."
                  rows={4}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 resize-none"
                />
              </div>

              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                    Trạng thái
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  >
                    <option value="pending">Chờ</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                    Độ ưu tiên
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Deadline (tùy chọn)
                </label>
                <button
                  type="button"
                  onClick={() => setIsDateTimePickerOpen(true)}
                  className="relative flex w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-3.5 pl-12 text-left transition-all hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                >
                  <FaCalendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <span className="text-sm text-slate-900">
                    {deadline ? (() => {
                      const [year, month, day] = deadline.split('-')
                      return `${day}/${month}/${year}`
                    })() : 'Chọn deadline'}
                  </span>
                  {deadline && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeadline(null)
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <FaTimes className="h-4 w-4" />
                    </button>
                  )}
                </button>
              </div>

              {/* Progress */}
              <div>
                <label htmlFor="progress" className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Tiến độ: {progress}%
                </label>
                <div className="flex items-center gap-3">
                  <FaChartLine className="h-4 w-4 text-slate-400" />
                  <input
                    type="range"
                    id="progress"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="flex-1 h-2 rounded-full bg-slate-200 appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-semibold text-slate-700 w-12 text-right">{progress}%</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Tags (tùy chọn)
                </label>
                <div className="rounded-xl border-2 border-slate-200 bg-white p-3.5 transition-all focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 sm:p-4">
                  {tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleTagRemove(tag)}
                            className="hover:text-sky-900"
                          >
                            <FaTimes className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleTagAdd()
                        }
                      }}
                      placeholder="Nhập tag và nhấn Enter..."
                      className="flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTagAdd}
                      className="rounded-lg bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-200 transition"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <ModalFooterButtons
            onCancel={onClose}
            onConfirm={() => {}}
            confirmText={task ? 'Cập nhật' : 'Thêm'}
            isSubmitting={false}
            disabled={false}
            confirmButtonType="submit"
            formId="task-form"
          />
        </div>
      </div>

      {/* DateTime Picker Modal */}
      <DateTimePickerModal
        isOpen={isDateTimePickerOpen}
        onClose={() => setIsDateTimePickerOpen(false)}
        onConfirm={(date) => {
          setDeadline(date)
          setIsDateTimePickerOpen(false)
        }}
        initialDate={deadline || undefined}
        showTime={false}
      />
    </>
  )
}

