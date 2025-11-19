import { useEffect, useState, useMemo } from 'react'
import { FaCalendarCheck } from 'react-icons/fa'
import HeaderBar from '../components/layout/HeaderBar'
import FooterNav from '../components/layout/FooterNav'
import { TaskModal } from '../components/tasks/TaskModal'
import { TaskCalendar } from '../components/tasks/TaskCalendar'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { TaskDayModal } from '../components/tasks/TaskDayModal'
import { TaskCard } from '../components/tasks/TaskCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  type TaskRecord,
  type TaskUpdate,
  type TaskInsert
} from '../lib/taskService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { formatDateUTC7, getNowUTC7, createDateUTC7 } from '../utils/dateUtils'

const TasksPage = () => {
  const { success, error: showError } = useNotification()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<TaskRecord | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return formatDateUTC7(getNowUTC7())
  })
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [viewingTask, setViewingTask] = useState<TaskRecord | null>(null)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [dayModalDate, setDayModalDate] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all')
  const [disableRipple, setDisableRipple] = useState(false)

  const [activeTab, setActiveTab] = useState<'date' | 'recent' | 'urgent'>('date')

  // Load all tasks initially
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const allTasks = await fetchTasks()
      setTasks(allTasks)
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

  const handleTaskSave = async (taskData: TaskInsert) => {
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

  const handleTaskUpdate = async (taskId: string, updates: Partial<TaskRecord>) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
      if (viewingTask && viewingTask.id === taskId) {
        setViewingTask(prev => prev ? { ...prev, ...updates } : null)
      }

      // Clean updates for API
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, user_id, created_at, updated_at, completed_at, ...editableFields } = updates
      const apiUpdates: TaskUpdate = editableFields

      await updateTask(taskId, apiUpdates)
    } catch (err) {
      showError('Không thể cập nhật công việc.')
      loadData() // Revert on error
    }
  }

  // Filter tasks based on active tab
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks]

    if (activeTab === 'date') {
      filtered = filtered.filter(task => {
        if (!task.deadline) return false
        return task.deadline.startsWith(selectedDate)
      })
    } else if (activeTab === 'recent') {
      // Sort by deadline (upcoming first), exclude completed
      filtered = filtered
        .filter(t => t.status !== 'completed' && t.deadline)
        .sort((a, b) => {
          const dateA = new Date(a.deadline!).getTime()
          const dateB = new Date(b.deadline!).getTime()
          return dateA - dateB
        })
    } else if (activeTab === 'urgent') {
      // Filter urgent/high priority, exclude completed
      filtered = filtered
        .filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed')
        .sort((a, b) => {
          // Sort by deadline if available, else created_at
          const dateA = a.deadline ? new Date(a.deadline).getTime() : new Date(a.created_at).getTime()
          const dateB = b.deadline ? new Date(b.deadline).getTime() : new Date(b.created_at).getTime()
          return dateA - dateB
        })
    }

    // Apply status filter only for 'date' tab or if needed
    if (activeTab === 'date' && filterStatus !== 'all') {
      filtered = filtered.filter(task => {
        if (filterStatus === 'completed') return task.status === 'completed'
        return task.status !== 'completed'
      })
    }

    return filtered
  }, [tasks, selectedDate, filterStatus, activeTab])

  // Stats for the day
  const dayStats = useMemo(() => {
    const dayTasks = tasks.filter(t => t.deadline?.startsWith(selectedDate))
    const total = dayTasks.length
    const completed = dayTasks.filter(t => t.status === 'completed').length
    return { total, completed }
  }, [tasks, selectedDate])

  const isDeadlineApproaching = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = getNowUTC7()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  }

  const isDeadlineOverdue = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = getNowUTC7()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    return deadlineDate.getTime() < now.getTime() && deadlineDate.getDate() !== now.getDate()
  }

  const formatSelectedDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = createDateUTC7(y, m, d, 0, 0, 0, 0)
      const today = getNowUTC7()

      if (date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()) {
        return 'Hôm nay'
      }

      return `Ngày ${d}/${m}/${y}`
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="CÔNG VIỆC" />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-24">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-4 pb-6">
          {/* Calendar */}
          <TaskCalendar
            tasks={tasks}
            onDateClick={(date) => {
              setSelectedDate(date)
              setActiveTab('date')
            }}
            onDateWithTasksClick={(date) => {
              setDayModalDate(date)
              setIsDayModalOpen(true)
            }}
            disableRipple={disableRipple}
            selectedDate={selectedDate}
          />

          {/* Task List Section */}
          <div>
            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4 shadow-inner">
              <button
                onClick={() => setActiveTab('date')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'date' ? 'bg-white text-blue-600 shadow-lg border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Theo ngày
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'recent' ? 'bg-white text-blue-600 shadow-lg border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Gần nhất
              </button>
              <button
                onClick={() => setActiveTab('urgent')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'urgent' ? 'bg-white text-blue-600 shadow-lg border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Gấp
              </button>
            </div>

            {/* Header for Date Tab */}
            {activeTab === 'date' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{formatSelectedDate(selectedDate)}</h2>
                    <p className="text-sm text-slate-500">
                      {dayStats.total} công việc • {dayStats.completed} hoàn thành
                    </p>
                  </div>

                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-lg">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterStatus === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setFilterStatus('pending')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterStatus === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      Chưa xong
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-3xl bg-white shadow-lg border border-slate-100">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <FaCalendarCheck className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Không có công việc nào</p>
                <button
                  onClick={handleAddTask}
                  className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  + Thêm công việc mới
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setViewingTask(task)
                      setIsDetailModalOpen(true)
                    }}
                    isDeadlineApproaching={isDeadlineApproaching(task.deadline)}
                    isDeadlineOverdue={isDeadlineOverdue(task.deadline)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterNav onAddClick={handleAddTask} />

      {/* Modals */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTask(null)
        }}
        onSave={handleTaskSave}
        task={editingTask}
        defaultDate={selectedDate}
      />

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

      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setViewingTask(null)
        }}
        disableRipple={disableRipple}
        onToggleRipple={() => setDisableRipple(prev => !prev)}
        task={viewingTask}
        onEdit={(task) => {
          setEditingTask(task)
          setIsDetailModalOpen(false)
          setIsModalOpen(true)
        }}
        onUpdate={handleTaskUpdate}
        onDelete={(task) => {
          handleDeleteTask(task)
        }}
        onComplete={async (task) => {
          try {
            await updateTask(task.id, {
              status: 'completed',
              completed_at: formatDateUTC7(getNowUTC7())
            })
            success('Đã đánh dấu hoàn thành công việc!')
            await loadData()
          } catch (err) {
            showError('Không thể cập nhật công việc.')
          }
        }}
      />

      <TaskDayModal
        isOpen={isDayModalOpen}
        onClose={() => {
          setIsDayModalOpen(false)
          setDayModalDate(null)
        }}
        tasks={dayModalDate ? tasks.filter(t => t.deadline?.startsWith(dayModalDate) && t.status !== 'completed') : []}
        date={dayModalDate || ''}
        onTaskClick={(task) => {
          setViewingTask(task)
          setIsDayModalOpen(false)
          setIsDetailModalOpen(true)
        }}
      />
    </div>
  )
}



export default TasksPage
