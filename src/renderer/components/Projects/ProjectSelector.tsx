import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { setCurrentProject, addProject, deleteProject, archiveProject, updateProject, Project } from '../../store/slices/projectsSlice'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Plus,
  Folder,
  FolderOpen,
  Archive,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Settings
} from 'lucide-react'

interface ProjectSelectorProps {
  compact?: boolean
  showCreateButton?: boolean
  onProjectChange?: (projectId: string) => void
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  compact = false,
  showCreateButton = true,
  onProjectChange
}) => {
  const dispatch = useDispatch()
  const { projects, currentProjectId } = useSelector((state: RootState) => state.projects)
  const currentProject = projects.find(p => p.id === currentProjectId)
  
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📁'
  })

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning')
  const completedProjects = projects.filter(p => p.status === 'completed')
  const archivedProjects = projects.filter(p => p.status === 'archived')

  const handleSelectProject = (projectId: string) => {
    dispatch(setCurrentProject(projectId))
    setIsOpen(false)
    onProjectChange?.(projectId)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (projectId === 'default') return
    const ok = window.confirm('このプロジェクトを削除しますか？\n関連するタスクも削除されます。元に戻せません。')
    if (!ok) return
    try {
      const { storage } = await import('../../utils/platform')
      await storage.deleteProject(projectId)
    } catch (e) {
      console.error('Failed to delete project from storage', e)
    }
    dispatch(deleteProject(projectId))
  }

  const handleCreateProject = () => {
    if (!newProject.name.trim()) return

    const project: Project = {
      id: `project-${Date.now()}`,
      name: newProject.name,
      description: newProject.description,
      color: newProject.color,
      icon: newProject.icon,
      startDate: new Date(),
      status: 'planning',
      owner: '自分',
      members: ['自分'],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    dispatch(addProject(project))
    dispatch(setCurrentProject(project.id))
    setShowCreateModal(false)
    setNewProject({ name: '', description: '', color: '#3B82F6', icon: '📁' })
  }

  const handleArchiveProject = (projectId: string) => {
    if (projectId === 'default') return
    dispatch(archiveProject(projectId))
  }

  const handleRestoreProject = (projectId: string) => {
    dispatch(updateProject({ id: projectId, updates: { status: 'active' } as any }))
  }

  // 重複プロジェクトの自動統合
  const autoMergeDuplicates = async () => {
    try {
      // 正規化関数（AIDialogueと同じロジック）
      const normalizeProjectName = (s: string) => (s || '')
        .toLowerCase()
        .replace(/[\s\u3000]/g, '')
        .replace(/[、，。．・,\.\-_/\\()[\]{}【】]/g, '')
        .replace(/プロジェクト$/u, '')
        .trim()

      // 名前正規化ごとにグループ化
      const groups = new Map<string, Project[]>()
      for (const p of projects) {
        if (p.id === 'default') continue
        const key = normalizeProjectName(p.name)
        const arr = groups.get(key) || []
        arr.push(p)
        groups.set(key, arr)
      }

      // プラットフォームAPI
      const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electronAPI
      const { storage } = await import('../../utils/platform')
      const fb = await import('../../../services/firebase').catch(() => null as any)

      for (const [_, arr] of groups) {
        if (arr.length <= 1) continue
        // 最初のプロジェクトを正として、それ以外を統合
        const [primary, ...dups] = arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        for (const d of dups) {
          try {
            if (isElectronEnv) {
              const res = await window.electronAPI.dbGetTasks()
              if (res.success && res.data) {
                const list = res.data.filter((row: any) => (row.project_id || 'default') === d.id)
                for (const row of list) {
                  await window.electronAPI.dbUpdateTask(row.id, { project_id: primary.id } as any)
                }
              }
            } else if (fb && fb.firebaseAuth && fb.firebaseDB) {
              const user = fb.firebaseAuth.getCurrentUser?.()
              if (user) {
                const res = await storage.getTasks(d.id)
                if (res.success && Array.isArray(res.data)) {
                  for (const t of res.data) {
                    await fb.firebaseDB.saveTask(user.uid, { ...t, projectId: primary.id })
                  }
                }
              }
            }
          } catch (e) {
            console.error('Failed to move tasks during merge', e)
          }
          // 重複プロジェクトを削除
          try {
            await storage.deleteProject(d.id)
          } catch {}
          dispatch(deleteProject(d.id))
        }
      }
      alert('重複プロジェクトの自動統合が完了しました。')
    } catch (e) {
      console.error('autoMergeDuplicates failed', e)
      alert('重複統合でエラーが発生しました。')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <FolderOpen className="w-4 h-4" />
      case 'planning': return <Clock className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'archived': return <Archive className="w-4 h-4" />
      default: return <Folder className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400'
      case 'planning': return 'text-yellow-600 dark:text-yellow-400'
      case 'completed': return 'text-blue-600 dark:text-blue-400'
      case 'archived': return 'text-gray-500 dark:text-gray-400'
      default: return 'text-gray-600 dark:text-gray-300'
    }
  }

  const colorOptions = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'
  ]

  const iconOptions = [
    '📁', '🚀', '💼', '🎯', '📊', '🔧', '📚', '🎨',
    '🏢', '🌟', '💡', '🔬', '🎭', '🎮', '🏆', '🌈'
  ]

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <span className="text-2xl">{currentProject?.icon || '📁'}</span>
          <span className="font-medium">{currentProject?.name || 'プロジェクト未選択'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-72 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden"
            >
              <div className="max-h-96 overflow-y-auto">
                {/* アクティブなプロジェクト */}
                {activeProjects.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2 py-1">
                      アクティブ
                    </p>
                    {activeProjects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => handleSelectProject(project.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
                          currentProjectId === project.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                      >
                        <span className="text-xl">{project.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div className={getStatusColor(project.status)}>
                          {getStatusIcon(project.status)}
                        </div>
                        {project.id !== 'default' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void handleDeleteProject(project.id) }}
                            className="ml-2 p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* 新規プロジェクト作成 */}
                {showCreateButton && (
                  <div className="border-t border-neutral-200 dark:border-neutral-700 p-2">
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        setShowCreateModal(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">新規プロジェクト</span>
                    </button>
                  </div>
                )}
                {/* 管理モード */}
                <div className="border-t border-neutral-200 dark:border-neutral-700 p-2">
                  <button
                    onClick={() => { setIsOpen(false); setShowManageModal(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-medium">プロジェクト管理...</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">プロジェクト</h2>
          {showCreateButton && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              新規作成
            </button>
          )}
        </div>

        {/* プロジェクトリスト */}
        <div className="space-y-4">
          {/* アクティブなプロジェクト */}
          {activeProjects.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                アクティブ ({activeProjects.length})
              </h3>
              <div className="space-y-2">
                {activeProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      currentProjectId === project.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{project.icon}</span>
                        <div>
                          <h4 className="font-medium">{project.name}</h4>
                          {project.description && (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {project.members.length}人
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(project.startDate).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="text-xs">
                          {project.status === 'active' ? '進行中' : '計画中'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 完了済みプロジェクト */}
          {completedProjects.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                完了済み ({completedProjects.length})
              </h3>
              <div className="space-y-2 opacity-60">
                {completedProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-2">
                      <span>{project.icon}</span>
                      <span className="text-sm">{project.name}</span>
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* プロジェクト作成モーダル */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">新規プロジェクト作成</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    プロジェクト名
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary-500"
                    placeholder="例: Webサイトリニューアル"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    説明
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="プロジェクトの概要や目的"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    アイコン
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setNewProject(prev => ({ ...prev, icon }))}
                        className={`p-2 rounded-lg border text-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                          newProject.icon === icon
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    カラー
                  </label>
                  <div className="flex gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewProject(prev => ({ ...prev, color }))}
                        className={`w-10 h-10 rounded-lg border-2 ${
                          newProject.color === color
                            ? 'border-neutral-900 dark:border-white'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProject.name.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  作成
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 管理モーダル */}
      <AnimatePresence>
        {showManageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowManageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-3xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">プロジェクト管理</h3>
                <div className="flex gap-2">
                  <button onClick={() => void autoMergeDuplicates()} className="px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 rounded-lg">重複を自動統合</button>
                  <button onClick={() => setShowManageModal(false)} className="px-3 py-2 text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700">閉じる</button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-700">
                {projects.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <div className="font-medium">{p.name} {p.id === 'default' && <span className="text-xs text-neutral-500">(default)</span>}</div>
                        <div className="text-xs text-neutral-500">{new Date(p.createdAt).toLocaleString('ja-JP')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.id !== 'default' && (
                        <>
                          {p.status === 'archived' ? (
                            <button onClick={() => handleRestoreProject(p.id)} className="px-3 py-1.5 text-sm rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">復元</button>
                          ) : (
                            <button onClick={() => handleArchiveProject(p.id)} className="px-3 py-1.5 text-sm rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">アーカイブ</button>
                          )}
                          <button onClick={() => void handleDeleteProject(p.id)} className="px-3 py-1.5 text-sm rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">削除</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ProjectSelector
