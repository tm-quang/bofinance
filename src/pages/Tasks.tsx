import { useEffect, useState, useMemo } from 'react'
import { 
  FaEdit, 
  FaTrash, 
  FaCheck, 
  FaClock, 
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaCalendar
} from 'react-icons/fa'
import HeaderBar from '../components/layout/HeaderBar'
import FooterNav from '../components/layout/FooterNav'
import { TaskModal } from '../components/tasks/TaskModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  getTasksApproachingDeadline,
  getTasksForWeek,
  type TaskRecord,
  type TaskStatus,
  type TaskPriority,
} from '../lib/taskService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { formatDateUTC7, getNowUTC7, getDateComponentsUTC7, createDateUTC7 } from '../utils/dateUtils'

const TasksPage = () => {
  const { success, error: showError } = useNotification()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<TaskRecord | null>(null)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    // Get current week start (Monday)
    const now = getNowUTC7()
    const components = getDateComponentsUTC7(now)
    const dateObj = new Date(components.year, components.month - 1, components.day)
    const day = dateObj.getDay()
    const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(dateObj.setDate(diff))
    const mondayComponents = getDateComponentsUTC7(monday)
    return formatDateUTC7(createDateUTC7(mondayComponents.year, mondayComponents.month, mondayComponents.day, 0, 0, 0, 0))
  })
  const [viewMode, setViewMode] = useState<'week' | 'all' | 'deadline'>('week')

  useEffect(() => {
    loadData()
  }, [selectedWeekStart, viewMode])

  const loadData = async () => {
    setIsLoading(true)
    try {
      let tasksData: TaskRecord[] = []
      
      if (viewMode === 'week') {
        tasksData = await getTasksForWeek(selectedWeekStart)
      } else if (viewMode === 'deadline') {
        tasksData = await getTasksApproachingDeadline(3)
      } else {
        tasksData = await fetchTasks()
      }
      
      setTasks(tasksData)
    } catch (err) {
      console.error('Error loading tasks:', err)
      showError('Không thể tải danh sách công việc.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTask = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: TaskRecord) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleDeleteTask = (task: TaskRecord) => {
    setTaskToDelete(task)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!taskToDelete) return

    try {
      await deleteTask(taskToDelete.id)
      success('Đã xóa công việc thành công!')
      await loadData()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không thể xóa công việc.')
    } finally {
      setIsDeleteConfirmOpen(false)
      setTaskToDelete(null)
    }
  }

  const handleTaskSave = async (taskData: any) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData)
        success('Đã cập nhật công việc thành công!')
      } else {
        await createTask(taskData)
        success('Đã thêm công việc thành công!')
      }
      setIsModalOpen(false)
      setEditingTask(null)
      await loadData()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không thể lưu công việc.')
    }
  }

  const handleStatusChange = async (task: TaskRecord, newStatus: TaskStatus) => {
    try {
      await updateTask(task.id, { status: newStatus })
      await loadData()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.')
    }
  }

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const weekStart = new Date(selectedWeekStart + 'T00:00:00+07:00')
    weekStart.setDate(weekStart.getDate() - 7)
    const components = getDateComponentsUTC7(weekStart)
    setSelectedWeekStart(formatDateUTC7(createDateUTC7(components.year, components.month, components.day, 0, 0, 0, 0)))
  }

  // Navigate to next week
  const goToNextWeek = () => {
    const weekStart = new Date(selectedWeekStart + 'T00:00:00+07:00')
    weekStart.setDate(weekStart.getDate() + 7)
    const components = getDateComponentsUTC7(weekStart)
    setSelectedWeekStart(formatDateUTC7(createDateUTC7(components.year, components.month, components.day, 0, 0, 0, 0)))
  }

  // Get week range for display
  const getWeekRange = () => {
    try {
      const weekStart = new Date(selectedWeekStart + 'T00:00:00+07:00')
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const startComponents = getDateComponentsUTC7(weekStart)
      const endComponents = getDateComponentsUTC7(weekEnd)
      
      return `${startComponents.day}/${startComponents.month} - ${endComponents.day}/${endComponents.month}/${endComponents.year}`
    } catch {
      // Fallback: parse directly from string
      const [startYear, startMonth, startDay] = selectedWeekStart.split('-').map(Number)
      const weekStart = createDateUTC7(startYear, startMonth, startDay, 0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const endComponents = getDateComponentsUTC7(weekEnd)
      return `${startDay}/${startMonth} - ${endComponents.day}/${endComponents.month}/${endComponents.year}`
    }
  }

  // Check if deadline is approaching (within 3 days)
  const isDeadlineApproaching = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = getNowUTC7()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  }

  // Check if deadline is overdue
  const isDeadlineOverdue = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = getNowUTC7()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    return deadlineDate.getTime() < now.getTime() && deadlineDate.getDate() !== now.getDate()
  }

  // Get priority color
  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300'
    }
  }

  // Get status color
  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-300'
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-700 border-amber-300'
    }
  }

  // Group tasks by day of week
  const tasksByDay = useMemo(() => {
    if (viewMode !== 'week') return {}
    
    const weekStart = new Date(selectedWeekStart + 'T00:00:00+07:00')
    const grouped: Record<number, TaskRecord[]> = {}
    
    // Initialize all days
    for (let i = 0; i < 7; i++) {
      grouped[i] = []
    }
    
    tasks.forEach(task => {
      if (!task.deadline) {
        // Tasks without deadline go to Monday
        grouped[0].push(task)
        return
      }
      
      const taskDate = new Date(task.deadline + 'T00:00:00+07:00')
      const diffTime = taskDate.getTime() - weekStart.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays >= 0 && diffDays < 7) {
        grouped[diffDays].push(task)
      } else if (diffDays < 0) {
        // Past deadlines go to Monday
        grouped[0].push(task)
      } else {
        // Future deadlines go to Sunday
        grouped[6].push(task)
      }
    })
    
    return grouped
  }, [tasks, selectedWeekStart, viewMode])

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="CÔNG VIỆC" />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-6">
          {/* View Mode Tabs */}
          <div className="flex gap-2 rounded-2xl bg-white p-1 shadow-sm border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('deadline')}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === 'deadline'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Sắp đến hạn
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Week Navigation (only for week view) */}
          {viewMode === 'week' && (
            <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
              <button
                type="button"
                onClick={goToPreviousWeek}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <FaChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-slate-900">Tuần này</span>
                <span className="text-xs text-slate-500">{getWeekRange()}</span>
              </div>
              <button
                type="button"
                onClick={goToNextWeek}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <FaChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Tasks List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : viewMode === 'week' ? (
            /* Week View - Grid by Days */
            <div className="space-y-4">
              {weekDays.map((day, index) => (
                <div key={index} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">{day}</h3>
                  <div className="space-y-2">
                    {tasksByDay[index]?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">Không có công việc</p>
                    ) : (
                      tasksByDay[index]?.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                          isDeadlineApproaching={isDeadlineApproaching(task.deadline)}
                          isDeadlineOverdue={isDeadlineOverdue(task.deadline)}
                          getPriorityColor={getPriorityColor}
                          getStatusColor={getStatusColor}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* All/Deadline View - List */
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-white">
                  <FaCalendar className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">Chưa có công việc nào</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    isDeadlineApproaching={isDeadlineApproaching(task.deadline)}
                    isDeadlineOverdue={isDeadlineOverdue(task.deadline)}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>

      <FooterNav onAddClick={handleAddTask} />

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTask(null)
        }}
        onSave={handleTaskSave}
        task={editingTask}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
          setTaskToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Xóa công việc"
        message={`Bạn có chắc chắn muốn xóa công việc "${taskToDelete?.title}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  )
}

// Task Card Component
type TaskCardProps = {
  task: TaskRecord
  onEdit: (task: TaskRecord) => void
  onDelete: (task: TaskRecord) => void
  onStatusChange: (task: TaskRecord, status: TaskStatus) => void
  isDeadlineApproaching: boolean
  isDeadlineOverdue: boolean
  getPriorityColor: (priority: TaskPriority) => string
  getStatusColor: (status: TaskStatus) => string
}

const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isDeadlineApproaching,
  isDeadlineOverdue,
  getPriorityColor,
  getStatusColor,
}: TaskCardProps) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const formatDeadline = (deadline: string | null): string => {
    if (!deadline) return ''
    const [year, month, day] = deadline.split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div
      className="group relative rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer"
      onClick={() => setShowTooltip(!showTooltip)}
    >
      {/* Tooltip */}
      {showTooltip && task.description && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl">
          <p className="whitespace-pre-wrap">{task.description}</p>
          <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className={`text-sm font-semibold text-slate-900 ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
              {task.title}
            </h4>
            {task.description && (
              <span className="text-xs text-slate-400">ℹ️</span>
            )}
          </div>

          {/* Tags and Priority */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority === 'urgent' ? 'Khẩn cấp' : 
               task.priority === 'high' ? 'Cao' : 
               task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
              {task.status === 'completed' ? 'Hoàn thành' : 
               task.status === 'in_progress' ? 'Đang làm' : 
               task.status === 'cancelled' ? 'Đã hủy' : 'Chờ'}
            </span>
          </div>

          {/* Deadline */}
          {task.deadline && (
            <div className={`flex items-center gap-1.5 text-xs mb-2 ${
              isDeadlineOverdue ? 'text-red-600' : 
              isDeadlineApproaching ? 'text-orange-600' : 
              'text-slate-500'
            }`}>
              <FaClock className="h-3 w-3" />
              <span>{formatDeadline(task.deadline)}</span>
              {isDeadlineOverdue && <FaExclamationTriangle className="h-3 w-3" />}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Tiến độ</span>
              <span className="text-xs font-semibold text-slate-700">{task.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {task.status !== 'completed' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange(task, 'completed')
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition"
            >
              <FaCheck className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(task)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
          >
            <FaEdit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(task)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
          >
            <FaTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default TasksPage

