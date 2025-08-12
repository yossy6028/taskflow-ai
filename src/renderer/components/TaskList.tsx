import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setSelectedTask, setTasks, Task as ReduxTask } from '../store/slices/tasksSlice';
import TaskBreakdown from './Tasks/TaskBreakdown';
import { motion, AnimatePresence } from 'framer-motion';

const TaskList: React.FC = () => {
  const dispatch = useDispatch();
  const { tasks, selectedTaskId } = useSelector((state: RootState) => state.tasks);
  const currentProjectId = useSelector((state: RootState) => state.projects.currentProjectId);
  const projects = useSelector((state: RootState) => state.projects.projects)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false)
  const currentProject = useMemo(() => projects.find(p => p.id === currentProjectId), [projects, currentProjectId])
  
  // 現在のプロジェクトのタスクのみフィルタリング
  const projectTasks = tasks.filter(task => task.projectId === currentProjectId);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'low':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in-progress':
        return '◉';
      default:
        return '○';
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      {/* Task List Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">タスク一覧 <span className="ml-2 text-sm text-neutral-500">{currentProject?.name || ''}</span></h2>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            新規タスク
          </button>
        </div>
      </div>

      {/* Task List Content */}
      <div className="p-6">
        {projectTasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              タスクがありません
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              AI対話でタスクを生成するか、新規タスクを作成してください
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectTasks.map((task) => (
              <div key={task.id} className="space-y-2">
                <div
                  onClick={() => {
                    dispatch(setSelectedTask(task.id))
                    setExpandedTaskId(expandedTaskId === task.id ? null : task.id)
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedTaskId === task.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-xl mt-1">{getStatusIcon(task.status)}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}優先度
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            期限: {new Date(task.endDate).toLocaleDateString('ja-JP')}
                          </span>
                          {task.estimatedHours && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              予定: {task.estimatedHours}時間
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {task.progress}%
                      </div>
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* TODO細分化セクション */}
                <AnimatePresence>
                  {expandedTaskId === task.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-8"
                    >
                      <TaskBreakdown 
                        taskId={task.id} 
                        taskTitle={task.title}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新規タスク作成モーダル */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">新規タスク（{currentProject?.name || ''}）</h3>
              <TaskCreateForm
                projectId={currentProjectId}
                onCancel={() => setShowCreateModal(false)}
                onCreated={async (createdId) => {
                  // 最新を再取得して一覧反映
                  const res = await window.electronAPI.dbGetTasks({ projectId: currentProjectId || 'default' })
                  if (res.success && res.data) {
                    const mapped: ReduxTask[] = res.data.map((row: any) => ({
                      id: row.id,
                      projectId: (row.project_id as string) || 'default',
                      title: row.title,
                      description: row.description ?? '',
                      startDate: new Date(row.start_date),
                      endDate: new Date(row.end_date),
                      progress: row.progress,
                      priority: row.priority,
                      dependencies: row.dependencies ?? [],
                      status: row.status,
                      estimatedHours: row.estimated_hours ?? 0,
                      actualHours: row.actual_hours ?? undefined,
                      assignee: row.assignee ?? undefined,
                      tags: row.tags ?? [],
                    }))
                    dispatch(setTasks(mapped))
                    setExpandedTaskId(createdId) // 自動展開→TODO自動生成が走る
                    dispatch(setSelectedTask(createdId))
                  }
                  setShowCreateModal(false)
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskList;

// 簡易タスク作成フォーム（同ファイル内）
const TaskCreateForm: React.FC<{ projectId: string | null; onCancel: () => void; onCreated: (id: string) => void }>
  = ({ projectId, onCancel, onCreated }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const today = new Date()
  const tomorrow = new Date(Date.now() + 24*60*60*1000)
  const [startDate, setStartDate] = useState<string>(today.toISOString().slice(0,10))
  const [endDate, setEndDate] = useState<string>(tomorrow.toISOString().slice(0,10))
  const [estimatedHours, setEstimatedHours] = useState<number>(2)
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium')
  const [assignee, setAssignee] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !projectId) return
    setSaving(true)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    await window.electronAPI.dbCreateTask({
      id,
      projectId,
      title: title.trim(),
      description,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      estimatedHours,
      priority,
      status: 'pending',
      progress: 0,
      assignee: assignee || undefined,
      dependencies: [],
      tags: []
    })
    setSaving(false)
    onCreated(id)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm mb-1">タイトル</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
      </div>
      <div>
        <label className="block text-sm mb-1">説明</label>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">開始日</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
        </div>
        <div>
          <label className="block text-sm mb-1">終了日</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">予定工数(時間)</label>
          <input type="number" min={0} value={estimatedHours} onChange={e=>setEstimatedHours(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
        </div>
        <div>
          <label className="block text-sm mb-1">優先度</label>
          <select value={priority} onChange={e=>setPriority(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">担当者</label>
          <input value={assignee} onChange={e=>setAssignee(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700">キャンセル</button>
        <button onClick={handleCreate} disabled={saving || !title.trim()} className="px-5 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-50">{saving?'作成中...':'作成してTODO自動生成'}</button>
      </div>
    </div>
  )
}