import { useEffect, useState } from 'react'
import { FaTimes, FaCalendar, FaChartLine, FaPlus, FaTrash, FaCheckSquare, FaSquare, FaArrowLeft } from 'react-icons/fa'
import { DateTimePickerModal } from '../ui/DateTimePickerModal'
import type { TaskRecord, TaskStatus, TaskPriority, Subtask } from '../../lib/taskService'

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
    color?: string | null
    subtasks?: Subtask[]
  }) => void
  task?: TaskRecord | null
  defaultDate?: string
}

export const TaskModal = ({ isOpen, onClose, onSave, task, defaultDate }: TaskModalProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('pending')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [deadline, setDeadline] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [color, setColor] = useState<string>('#3B82F6')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const PRESET_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ]

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
        setColor(task.color || '#3B82F6')
        setSubtasks(task.subtasks || [])
      } else {
        // Reset form for new task
        setTitle('')
        setDescription('')
        setStatus('pending')
        setPriority('medium')
        setDeadline(defaultDate || null)
        setProgress(0)
        setTags([])
        setTagInput('')
        setColor('#3B82F6')
        setSubtasks([])
        setSubtaskInput('')
      }
      setError(null)
    }
  }, [isOpen, task, defaultDate])

  // Auto-calculate progress if subtasks exist
  useEffect(() => {
    if (subtasks.length > 0) {
      const completedCount = subtasks.filter(s => s.completed).length
      const newProgress = Math.round((completedCount / subtasks.length) * 100)
      setProgress(newProgress)

      // Auto update status based on progress
      if (newProgress === 100) setStatus('completed')
      else if (newProgress > 0) setStatus('in_progress')
      else setStatus('pending')
    }
  }, [subtasks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề công việc')
      return
    }

    setIsSubmitting(true)
    try {
      onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        deadline,
        progress,
        tags: tags.length > 0 ? tags : undefined,
        color,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
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

  // Generate unique ID for subtasks
  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  const handleSubtaskAdd = () => {
    const value = subtaskInput.trim()
    if (value) {
      const newSubtask: Subtask = {
        id: generateId(),
        title: value,
        completed: false
      }
      setSubtasks([...subtasks, newSubtask])
      setSubtaskInput('')
    }
  }

  const handleSubtaskDelete = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id))
  }

  const handleSubtaskToggle = (id: string) => {
    setSubtasks(subtasks.map(s =>
      s.id === id ? { ...s, completed: !s.completed } : s
    ))
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] flex flex-col bg-[#F7F9FC]">
        {/* Header - Giống ReminderModal và NoteModal */}
        <header className="pointer-events-none relative z-10 flex-shrink-0 bg-[#F7F9FC]">
          <div className="relative px-1 py-1">
            <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100"
                aria-label="Đóng"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
                {task ? 'SỬA' : 'THÊM'} CÔNG VIỆC
              </p>
              <div className="flex h-11 w-11 items-center justify-center">
                <button
                  type="submit"
                  form="task-form"
                  disabled={isSubmitting}
                  className="text-sm font-semibold text-sky-600 disabled:text-slate-400"
                >
                  {isSubmitting ? 'Đang lưu...' : task ? 'Cập nhật' : 'Tạo'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-4 sm:pb-6">
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
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 resize-none"
                />
              </div>

              {/* Subtasks */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Công việc phụ
                </label>
                <div className="space-y-2">
                  {subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <button
                        type="button"
                        onClick={() => handleSubtaskToggle(subtask.id)}
                        className={`flex-shrink-0 ${subtask.completed ? 'text-blue-600' : 'text-slate-300'}`}
                      >
                        {subtask.completed ? <FaCheckSquare /> : <FaSquare />}
                      </button>
                      <span className={`flex-1 text-sm ${subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {subtask.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSubtaskDelete(subtask.id)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subtaskInput}
                      onChange={(e) => setSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSubtaskAdd()
                        }
                      }}
                      placeholder="Thêm công việc phụ..."
                      className="flex-1 rounded-xl border-2 border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleSubtaskAdd}
                      className="flex items-center justify-center rounded-xl bg-sky-100 px-3 text-sky-700 hover:bg-sky-200"
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Màu sắc hiển thị
                </label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                        }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
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
                    disabled={subtasks.length > 0}
                    className={`w-full rounded-xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 ${subtasks.length > 0 ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                      }`}
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDateTimePickerOpen(true)}
                    className="relative flex w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-3.5 pl-12 pr-12 text-left transition-all hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                  >
                    <FaCalendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <span className="text-sm text-slate-900">
                      {deadline ? (() => {
                        const [year, month, day] = deadline.split('-')
                        return `${day}/${month}/${year}`
                      })() : 'Chọn deadline'}
                    </span>
                  </button>
                  {deadline && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeadline(null)
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                    >
                      <FaTimes className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div>
                <label htmlFor="progress" className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                  Tiến độ: {progress}% {subtasks.length > 0 && '(Tự động tính theo công việc phụ)'}
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
                    disabled={subtasks.length > 0}
                    className={`flex-1 h-2 rounded-full appearance-none cursor-pointer accent-blue-600 ${subtasks.length > 0 ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-200'
                      }`}
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
        </main>

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
