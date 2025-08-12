import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { motion } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isWithinInterval
} from 'date-fns'
import { ja } from 'date-fns/locale'

const CalendarView: React.FC = () => {
  const tasks = useSelector((state: RootState) => state.tasks.tasks)
  const currentProjectId = useSelector((state: RootState) => state.projects.currentProjectId)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // 現在のプロジェクトのタスクのみフィルタリング
  const projectTasks = tasks.filter(task => 
    !currentProjectId || currentProjectId === 'default' || task.projectId === currentProjectId
  )

  // カレンダーの日付配列を生成
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const days = []
    let day = startDate

    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days
  }, [currentMonth])

  // 特定の日付のタスクを取得（重複を除去）
  const getTasksForDate = (date: Date) => {
    const uniqueTasks = new Map<string, typeof projectTasks[0]>()
    
    projectTasks.forEach(task => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      if (isWithinInterval(date, { start: taskStart, end: taskEnd })) {
        // タイトルで重複を除去（同じタイトルのタスクは1つだけ表示）
        if (!uniqueTasks.has(task.title)) {
          uniqueTasks.set(task.title, task)
        }
      }
    })
    
    return Array.from(uniqueTasks.values())
  }

  // 選択された日付のタスクを取得
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return []
    return getTasksForDate(selectedDate)
  }, [selectedDate, projectTasks])

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400'
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              カレンダー
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-medium min-w-[120px] text-center">
                {format(currentMonth, 'yyyy年 M月', { locale: ja })}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            今日
          </button>
        </div>
      </div>

      {/* カレンダー本体 */}
      <div className="flex-1 flex overflow-hidden">
        {/* カレンダーグリッド */}
        <div className="flex-1 p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                <div
                  key={day}
                  className={`py-3 text-center text-sm font-medium ${
                    index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7 flex-1">
              {calendarDays.map((day, index) => {
                const dayTasks = getTasksForDate(day)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isCurrentDay = isToday(day)

                return (
                  <motion.div
                    key={day.toISOString()}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className={`
                      border-r border-b border-gray-200 dark:border-gray-700 p-2 min-h-[100px] cursor-pointer
                      ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : ''}
                      ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                      ${isCurrentDay ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                      hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`
                          text-sm font-medium
                          ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}
                          ${isCurrentDay ? 'bg-primary-600 text-white px-2 py-0.5 rounded-full' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* タスク表示（最大3件） */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="group"
                        >
                          <div
                            className={`
                              text-xs px-1 py-0.5 rounded truncate cursor-pointer
                              ${getPriorityColor(task.priority)} text-white
                              hover:opacity-80 transition-opacity
                            `}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                          +{dayTasks.length - 3} 件
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* サイドバー（選択された日付の詳細） */}
        {selectedDate && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                {format(selectedDate, 'yyyy年M月d日 (E)', { locale: ja })}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                タスク: {selectedDateTasks.length}件
              </p>
            </div>

            {/* 選択された日付のタスク一覧 */}
            <div className="space-y-4">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>この日のタスクはありません</p>
                </div>
              ) : (
                selectedDateTasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {task.title}
                      </h4>
                      <span
                        className={`
                          w-2 h-2 rounded-full mt-1
                          ${task.status === 'completed' ? 'bg-green-500' : 
                            task.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'}
                        `}
                      />
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs">
                      <span className={`flex items-center gap-1 ${getStatusColor(task.status)}`}>
                        <Clock className="w-3 h-3" />
                        {task.status === 'completed' ? '完了' : 
                         task.status === 'in-progress' ? '進行中' : '未着手'}
                      </span>
                      
                      <span className={`
                        px-2 py-0.5 rounded-full
                        ${task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}
                      `}>
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}優先度
                      </span>

                      {task.assignee && (
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <User className="w-3 h-3" />
                          {task.assignee}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        期間: {format(new Date(task.startDate), 'M/d')} - {format(new Date(task.endDate), 'M/d')}
                      </span>
                      <span>
                        進捗: {task.progress}%
                      </span>
                    </div>

                    {/* 進捗バー */}
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CalendarView