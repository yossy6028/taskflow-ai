import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { TrendingUp, CheckCircle2, ClipboardList, Clock } from 'lucide-react'

const Reports: React.FC = () => {
  const tasks = useSelector((s: RootState) => s.tasks.tasks)
  const projects = useSelector((s: RootState) => s.projects.projects)
  const currentProjectId = useSelector((s: RootState) => s.projects.currentProjectId)

  const [scope, setScope] = useState<'project' | 'all'>('project')
  const [allTasks, setAllTasks] = useState(tasks)

  useEffect(() => { setAllTasks(tasks) }, [tasks])

  useEffect(() => {
    const loadAll = async () => {
      const res = await window.electronAPI.dbGetTasks()
      if (res?.success && res.data) {
        const mapped = res.data.map((row: any) => ({
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
        setAllTasks(mapped as any)
      }
    }
    void loadAll()
  }, [projects, currentProjectId])

  const activeProjectIds = useMemo(() => (
    projects.filter(p => p.id !== 'default' && (p as any).status !== 'archived').map(p => p.id)
  ), [projects])

  const scopedTasks = useMemo(() => {
    if (scope === 'project') return tasks
    return allTasks.filter(t => activeProjectIds.includes(t.projectId || ''))
  }, [scope, tasks, allTasks, activeProjectIds])

  const total = scopedTasks.length
  const completed = scopedTasks.filter(t => t.status === 'completed').length
  const avgProgress = total > 0 ? Math.round(scopedTasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0
  const inProgress = scopedTasks.filter(t => t.status === 'in-progress').length

  const upcoming = [...scopedTasks]
    .filter(t => t.status !== 'completed')
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">レポート</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setScope('project')}
            className={`px-3 py-1 rounded-lg text-sm ${scope==='project'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
          >現在のプロジェクト</button>
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-1 rounded-lg text-sm ${scope==='all'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
          >全プロジェクト</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500">総タスク</span>
            <ClipboardList className="w-5 h-5 text-primary-500" />
          </div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500">完了</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold">{completed}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500">進行中</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{inProgress}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500">平均進捗</span>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold">{avgProgress}%</div>
          <div className="progress mt-2"><div className="progress-bar" style={{ width: `${avgProgress}%` }} /></div>
        </div>
      </div>

      {/* Upcoming deadlines table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">締切が近いタスク</h3>
          <div className="text-xs text-neutral-500">上位 {upcoming.length} 件</div>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {upcoming.map(t => {
            const pj = projects.find(p => p.id === t.projectId)
            return (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate max-w-[40vw]">{t.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">{pj?.name || t.projectId}</span>
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>期限 {t.endDate.toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
                <div className="w-28">
                  <div className="text-right text-xs mb-1">{t.progress || 0}%</div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full">
                    <div className="h-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full" style={{ width: `${t.progress || 0}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
          {upcoming.length === 0 && (
            <div className="py-6 text-sm text-neutral-500">対象タスクがありません</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports


