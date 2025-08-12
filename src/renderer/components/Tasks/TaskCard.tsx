import React, { useState } from 'react'
import { 
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle2,
  Circle,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Tag,
  Timer,
  Edit3,
  Trash2,
  Copy,
  Archive,
  Star,
  ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TaskCardProps {
  task: {
    id: string
    title: string
    description: string
    status: 'todo' | 'in_progress' | 'review' | 'completed'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    progress: number
    dueDate: Date
    assignees: Array<{ id: string; name: string; avatar?: string }>
    tags: string[]
    attachments: number
    comments: number
    subtasks?: Array<{ id: string; title: string; completed: boolean }>
    estimatedHours?: number
    actualHours?: number
  }
  onStatusChange?: (status: string) => void
  onEdit?: () => void
  onDelete?: () => void
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const statusConfig = {
    todo: { 
      label: '未着手', 
      icon: Circle, 
      color: 'text-neutral-500',
      bgColor: 'bg-neutral-100 dark:bg-neutral-800',
      borderColor: 'border-neutral-300 dark:border-neutral-700'
    },
    in_progress: { 
      label: '進行中', 
      icon: Timer, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-300 dark:border-blue-700'
    },
    review: { 
      label: 'レビュー', 
      icon: AlertCircle, 
      color: 'text-warning-500',
      bgColor: 'bg-warning-50 dark:bg-warning-900/20',
      borderColor: 'border-warning-300 dark:border-warning-700'
    },
    completed: { 
      label: '完了', 
      icon: CheckCircle2, 
      color: 'text-success-500',
      bgColor: 'bg-success-50 dark:bg-success-900/20',
      borderColor: 'border-success-300 dark:border-success-700'
    }
  }

  const priorityConfig = {
    low: { 
      label: '低', 
      color: 'text-neutral-500', 
      bgColor: 'bg-neutral-100 dark:bg-neutral-800',
      icon: '🔵'
    },
    medium: { 
      label: '中', 
      color: 'text-blue-500', 
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      icon: '🟡'
    },
    high: { 
      label: '高', 
      color: 'text-warning-500', 
      bgColor: 'bg-warning-100 dark:bg-warning-900/30',
      icon: '🟠'
    },
    urgent: { 
      label: '緊急', 
      color: 'text-error-500', 
      bgColor: 'bg-error-100 dark:bg-error-900/30',
      icon: '🔴'
    }
  }

  const status = statusConfig[task.status]
  const priority = priorityConfig[task.priority]
  const StatusIcon = status.icon

  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0
  const totalSubtasks = task.subtasks?.length || 0

  const getDaysUntilDue = () => {
    const now = new Date()
    const due = new Date(task.dueDate)
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const daysUntilDue = getDaysUntilDue()
  const isOverdue = daysUntilDue < 0
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative bg-white dark:bg-neutral-900 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 ${status.borderColor}`}
    >
      {/* Priority Indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        task.priority === 'urgent' ? 'from-error-500 to-error-400' :
        task.priority === 'high' ? 'from-warning-500 to-warning-400' :
        task.priority === 'medium' ? 'from-blue-500 to-blue-400' :
        'from-neutral-400 to-neutral-300'
      }`} />

      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={() => onStatusChange?.(task.status === 'completed' ? 'todo' : 'completed')}
              className={`mt-1 transition-colors ${status.color} hover:scale-110 transition-transform`}
            >
              <StatusIcon size={20} />
            </button>
            
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1 line-clamp-2">
                {task.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                {task.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-1.5 rounded-lg transition-colors ${
                isFavorite 
                  ? 'text-warning-500 bg-warning-100 dark:bg-warning-900/30' 
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Star size={16} className={isFavorite ? 'fill-current' : ''} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-20"
                  >
                    <button
                      onClick={() => { onEdit?.(); setShowMenu(false) }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                    >
                      <Edit3 size={14} /> 編集
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                      <Copy size={14} /> 複製
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                      <Archive size={14} /> アーカイブ
                    </button>
                    <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
                    <button
                      onClick={() => { onDelete?.(); setShowMenu(false) }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600 dark:text-error-400 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> 削除
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {task.status === 'in_progress' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">進捗</span>
              <span className="text-xs font-medium">{task.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Subtasks */}
        {totalSubtasks > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500 transition-colors"
            >
              <ChevronRight 
                size={14} 
                className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
              <span>サブタスク {completedSubtasks}/{totalSubtasks}</span>
            </button>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 space-y-1 overflow-hidden"
                >
                  {task.subtasks?.map((subtask) => (
                    <div 
                      key={subtask.id}
                      className="flex items-center gap-2 pl-5 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-600"
                      />
                      <span className={`text-sm ${
                        subtask.completed 
                          ? 'line-through text-neutral-400 dark:text-neutral-600' 
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Meta Information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Due Date */}
            <div className={`flex items-center gap-1 text-xs ${
              isOverdue ? 'text-error-500' :
              isDueSoon ? 'text-warning-500' :
              'text-neutral-500 dark:text-neutral-400'
            }`}>
              <Calendar size={14} />
              <span>
                {isOverdue ? `${Math.abs(daysUntilDue)}日遅延` :
                 daysUntilDue === 0 ? '今日' :
                 daysUntilDue === 1 ? '明日' :
                 `${daysUntilDue}日後`}
              </span>
            </div>

            {/* Time Tracking */}
            {task.estimatedHours && (
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Clock size={14} />
                <span>{task.actualHours || 0}/{task.estimatedHours}h</span>
              </div>
            )}

            {/* Priority Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${priority.bgColor} ${priority.color}`}>
              <span>{priority.icon}</span>
              {priority.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Attachments */}
            {task.attachments > 0 && (
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Paperclip size={14} />
                <span>{task.attachments}</span>
              </div>
            )}

            {/* Comments */}
            {task.comments > 0 && (
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <MessageSquare size={14} />
                <span>{task.comments}</span>
              </div>
            )}

            {/* Assignees */}
            {task.assignees.length > 0 && (
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((assignee) => (
                  <div
                    key={assignee.id}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-neutral-900"
                    title={assignee.name}
                  >
                    {assignee.name.charAt(0)}
                  </div>
                ))}
                {task.assignees.length > 3 && (
                  <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-neutral-900">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-primary-500/5 to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TaskCard