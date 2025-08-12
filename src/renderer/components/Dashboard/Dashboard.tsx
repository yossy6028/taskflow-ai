import React, { useEffect, useMemo, useState } from 'react'
import { geminiAPI } from '../../utils/platform'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  CheckSquare, 
  BarChart3, 
  Users, 
  TrendingUp,
  Clock,
  Star,
  Target
} from 'lucide-react'
import DependencyAnalysisPanel from '../Analysis/DependencyAnalysisPanel'
import TaskTextImportModal from '../Tasks/TaskTextImportModal'
import TaskDetailEditor, { TaskDetail } from '../Tasks/TaskDetailEditor'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { setTasks, Task as ReduxTask } from '../../store/slices/tasksSlice'
import { setTodos } from '../../store/slices/todosSlice'
import { updateProject, deleteProject, setCurrentProject } from '../../store/slices/projectsSlice'

type DashboardProps = {
  onNavigate?: (sectionId: string) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const tasks = useSelector((s: RootState) => s.tasks.tasks)
  const projects = useSelector((s: RootState) => s.projects.projects)
  const currentProjectId = useSelector((s: RootState) => s.projects.currentProjectId)
  const todos = useSelector((s: RootState) => s.todos.todos)
  const [viewMode, setViewMode] = useState<'tasks' | 'todos'>('tasks')
  const currentProject = useMemo(() => projects.find(p => p.id === currentProjectId) || projects[0], [projects, currentProjectId])
  const [projectName, setProjectName] = useState(currentProject?.name || '')
  useEffect(() => { setProjectName(currentProject?.name || '') }, [currentProjectId])

  const [editingTask, setEditingTask] = useState<TaskDetail | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [scope, setScope] = useState<'project' | 'all'>(() => {
    // ユーザー設定の復元。未保存ならプロジェクト単位をデフォルトにする
    try {
      const saved = localStorage.getItem('dashboard-scope') as 'project' | 'all' | null
      if (saved === 'project' || saved === 'all') return saved
    } catch {}
    return 'project'
  })
  const [allTasks, setAllTasks] = useState<ReduxTask[]>([])

  const refreshTasks = async () => {
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
    }
  }

  useEffect(() => { void refreshTasks() }, [currentProjectId])
  // プロジェクト切替時にスコープは維持（自動切替しない）
  // スコープの永続化
  useEffect(() => {
    try { localStorage.setItem('dashboard-scope', scope) } catch {}
  }, [scope])

  // 全プロジェクトのタスクを横断集計用に読み込む（Reduxには入れない）
  const refreshAllTasks = async () => {
    const res = await window.electronAPI.dbGetTasks()
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
      setAllTasks(mapped)
    }
  }

  useEffect(() => { void refreshAllTasks() }, [projects, currentProjectId])

  // 有効プロジェクトID一覧（'default'は除外）
  const activeProjectIds = useMemo(() => (
    projects.filter(p => p.id !== 'default' && (p as any).status !== 'archived').map(p => p.id)
  ), [projects])

  // 上部カードは default 選択時は「有効プロジェクト横断（'default'除外）」、それ以外は現在プロジェクト集計
  const projectTasksForTop = currentProjectId === 'default'
    ? allTasks.filter(t => activeProjectIds.includes(t.projectId || ''))
    : tasks
  const completionRateTop = projectTasksForTop.length > 0
    ? Math.round(projectTasksForTop.reduce((sum, t) => sum + (t.progress || 0), 0) / projectTasksForTop.length)
    : 0

  // クロスプロジェクト横断ビューはスコープで切替（横断時も 'default' は除外）
  const scopedTasks = scope === 'all'
    ? allTasks.filter(t => activeProjectIds.includes(t.projectId || ''))
    : tasks
  // TODO進捗（スコープ内のタスクに紐づくTODOのみ集計）
  const scopedTaskIds = new Set(scopedTasks.map(t => t.id))
  const scopedTodos = todos.filter(td => scopedTaskIds.has(td.taskId))
  const todoCompleted = scopedTodos.filter(td => td.completed).length
  const todoRate = scopedTodos.length > 0 ? Math.round((todoCompleted / scopedTodos.length) * 100) : 0
  const stats = [
    {
      title: '今日のタスク',
      value: `${projectTasksForTop.filter(t=>t.status!=='completed').length}/${projectTasksForTop.length}`,
      change: '',
      color: 'from-blue-500 to-blue-600',
      icon: CheckSquare,
    },
    {
      title: 'AI対話',
      value: '—',
      change: '+1',
      color: 'from-purple-500 to-purple-600',
      icon: MessageSquare,
    },
    {
      title: 'プロジェクト',
      value: String(projects.filter(p=> (p as any).status !== 'archived').length),
      change: '',
      color: 'from-green-500 to-green-600',
      icon: Target,
    },
    {
      title: '完了率',
      value: `${completionRateTop}%`,
      change: '',
      color: 'from-orange-500 to-orange-600',
      icon: TrendingUp,
    },
  ]

  const recentTasks = tasks
    .filter(t => t.projectId === currentProjectId && t.status !== 'completed')
    .sort((a,b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 10)

  const quickActions = [
    { title: '新しいタスク', icon: CheckSquare, color: 'bg-blue-500', to: 'tasks' },
    { title: 'AI対話開始', icon: MessageSquare, color: 'bg-purple-500', to: 'dialogue' },
    { title: '依存関係分析', icon: BarChart3, color: 'bg-green-500', to: 'analysis' },
    { title: 'テキスト取込', icon: Users, color: 'bg-orange-500', to: 'import' },
  ]

  const handleQuickAction = async (to: string) => {
    if (to === 'import') {
      setImportOpen(true)
      return
    }
    if (to !== 'analysis') return onNavigate?.(to)
    try {
      setOpen(true)
      setLoading(true)
      setError(null)
      const payload = tasks.map((t) => ({ id: t.id, title: t.title }))
      const res = await geminiAPI.analyzeDependencies(payload as any)
      if (res.success) {
        setAnalysis(res.data)
      } else {
        setError(res.message || '分析に失敗しました')
      }
    } catch {
      setError('分析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          おかえりなさい、Yoshiiさん
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          今日も素晴らしい一日にしましょう。
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm text-green-500 font-medium">{stat.change}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.title}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          クイックアクション
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction(action.to)}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-left transition-all duration-200 hover:shadow-xl"
            >
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{action.title}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <TaskTextImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />

      {/* Project Selector and Editor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">プロジェクト</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-3 py-1 rounded-lg text-sm ${viewMode==='tasks'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
            >タスク</button>
            <button
              onClick={() => setViewMode('todos')}
              className={`px-3 py-1 rounded-lg text-sm ${viewMode==='todos'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
            >TODO</button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">表示スコープ</div>
          <div className="flex gap-2">
            <button
              onClick={()=> setScope('project')}
              className={`px-3 py-1 rounded-lg text-xs ${scope==='project'?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-200'}`}
            >現在のプロジェクト</button>
            <button
              onClick={()=> setScope('all')}
              className={`px-3 py-1 rounded-lg text-xs ${scope==='all'?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-200'}`}
            >全プロジェクト</button>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">選択</label>
          <select
            value={currentProject?.id}
            onChange={(e)=> dispatch(setCurrentProject(e.target.value))}
            className="w-full sm:w-80 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            {projects.map(p=> (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">名称</label>
            <input
              value={projectName}
              onChange={e=>setProjectName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={()=> dispatch(updateProject({ id: currentProject.id, updates: { name: projectName } }))}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg"
            >保存</button>
            {currentProject.id !== 'default' && (
              <button
                onClick={()=> dispatch(deleteProject(currentProject.id))}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >削除</button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Cross-project overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.28 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">横断ビュー（{scope==='all' ? '全プロジェクト' : '現在のプロジェクト'}）</h2>
          <div className="text-sm text-gray-500">完了率 {completionRateTop}% ・ TODO完了率 {todoRate}%</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming deadlines */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">近い締切（タスク）</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(scopedTasks
                .filter(t => t.status !== 'completed')
                .sort((a,b) => a.endDate.getTime() - b.endDate.getTime())
                .slice(0, 6)
              ).map(t => {
                const pj = projects.find(p => p.id === t.projectId)
                return (
                  <div key={t.id} className="p-3 flex items-center justify-between bg-white dark:bg-gray-800">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{pj?.name || t.projectId}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>期限 {t.endDate.toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                    <div className="w-28">
                      <div className="text-right text-xs mb-1">{t.progress || 0}%</div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="h-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full" style={{ width: `${t.progress || 0}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
              {scopedTasks.filter(t => t.status !== 'completed').length === 0 && (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400">未完了のタスクはありません</div>
              )}
            </div>
          </div>
          {/* TODO summary */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TODO進捗サマリ</h3>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700 dark:text-gray-300">総TODO数</div>
                <div className="text-sm">{scopedTodos.length}</div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700 dark:text-gray-300">完了</div>
                <div className="text-sm">{todoCompleted}</div>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">TODO完了率</span>
                  <span className="font-medium">{todoRate}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: `${todoRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{viewMode==='tasks'?'締切が近いタスク（現在のプロジェクト）':'選択タスクのTODO'}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {viewMode==='tasks' ? recentTasks.map((task, index) => (
            <div
              key={task.id}
              className={`p-4 ${
                index !== recentTasks.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      task.status === 'completed'
                        ? 'bg-green-500'
                        : task.status === 'in-progress'
                        ? 'bg-blue-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {task.endDate.toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTaskId(task.id)
                      setEditingTask({
                        title: task.title,
                        description: task.description,
                        startDate: task.startDate.toISOString().slice(0,10),
                        endDate: task.endDate.toISOString().slice(0,10),
                        estimatedHours: task.estimatedHours,
                        actualHours: task.actualHours,
                        priority: task.priority,
                        status: task.status as any,
                        assignee: task.assignee,
                        tags: (task.tags || []).join(', '),
                      })
                    }}
                    className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >編集</button>
                  <button
                    onClick={async () => {
                      const res = await window.electronAPI.dbDeleteTask(task.id as any)
                      if (res.success) await refreshTasks()
                    }}
                    className="text-xs px-3 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  >削除</button>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-6 text-sm text-gray-600 dark:text-gray-300">TODO表示は次のステップで細分化データを紐付けます。</div>
          )}
        </div>
      </motion.div>

      {/* Task Editor Modal */}
      {editingTask && editingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-auto">
            <TaskDetailEditor
              task={editingTask}
              index={0}
              onSave={async (t) => {
                await window.electronAPI.dbUpdateTask(editingTaskId, {
                  title: t.title,
                  description: t.description,
                  start_date: new Date(t.startDate).toISOString(),
                  end_date: new Date(t.endDate).toISOString(),
                  estimated_hours: t.estimatedHours,
                  actual_hours: t.actualHours,
                  priority: t.priority,
                  status: t.status,
                  assignee: t.assignee,
                } as any)
                await refreshTasks()
                setEditingTask(null); setEditingTaskId(null)
              }}
              onDelete={async () => {
                if (editingTaskId) {
                  await window.electronAPI.dbDeleteTask(editingTaskId)
                  await refreshTasks()
                }
                setEditingTask(null); setEditingTaskId(null)
              }}
              onClose={() => { setEditingTask(null); setEditingTaskId(null) }}
              isExpanded
            />
          </div>
        </div>
      )}

      <DependencyAnalysisPanel
        isOpen={open}
        onClose={() => setOpen(false)}
        analysis={analysis}
        isLoading={loading}
        error={error}
      />
    </div>
  )
}

export default Dashboard