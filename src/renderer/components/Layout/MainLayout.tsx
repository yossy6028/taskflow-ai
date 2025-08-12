import React, { useState, useEffect } from 'react'
import { 
  Home, 
  MessageSquare, 
  Calendar, 
  CheckSquare, 
  Settings, 
  Menu, 
  X,
  Moon,
  Sun,
  Sparkles,
  BarChart3,
  Users,
  FileText,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AIDialogue from '../Dialogue/AIDialogue'
import TaskList from '../TaskList'
import GanttChart from '../GanttChart'
import CalendarView from '../Calendar/CalendarView'
import Reports from '../Reports/Reports'
import Dashboard from '../Dashboard/Dashboard'
import ProjectSelector from '../Projects/ProjectSelector'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { setTasks, Task as ReduxTask } from '../../store/slices/tasksSlice'
import ProjectCreationModal from '../Projects/ProjectCreationModal'
import { addProject, setCurrentProject } from '../../store/slices/projectsSlice'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const dispatch = useDispatch()
  const [sidebarOpen, setSidebarOpen] = useState(false) // モバイルではデフォルトで閉じる
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [activeSection, setActiveSection] = useState('dialogue')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProjectCreate, setShowProjectCreate] = useState(false)
  
  const currentProjectId = useSelector((state: RootState) => state.projects.currentProjectId)
  const chatCount = useSelector((state: RootState) => state.chat.messages.length)
  const allTasks = useSelector((state: RootState) => state.tasks.tasks)
  // サイドバー表示: default 選択時は横断集計、それ以外は現在プロジェクト集計
  // default のときも 'default' プロジェクトのタスクは横断集計から除外
  const activeProjectIds = useSelector((state: RootState) => state.projects.projects.filter(p => p.id !== 'default' && (p as any).status !== 'archived').map(p => p.id))
  const tasksForSidebar = currentProjectId === 'default'
    ? allTasks.filter(t => activeProjectIds.includes(t.projectId || ''))
    : allTasks.filter(t => t.projectId === currentProjectId)
  const taskCount = tasksForSidebar.filter(t => t.status !== 'completed').length
  // 今日の進捗: 今日終了予定のタスクを対象に平均進捗を算出（なければ全体の平均）
  const today = new Date(); today.setHours(0,0,0,0)
  const endToday = new Date(today); endToday.setHours(23,59,59,999)
  const todays = tasksForSidebar.filter(t => t.endDate >= today && t.endDate <= endToday)
  const completionRate = (todays.length > 0
    ? Math.round(todays.reduce((sum, t) => sum + (t.progress || 0), 0) / todays.length)
    : (tasksForSidebar.length > 0
        ? Math.round(tasksForSidebar.reduce((sum, t) => sum + (t.progress || 0), 0) / tasksForSidebar.length)
        : 0))

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
    
    // モバイル判定とリサイズハンドラー
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // デスクトップではサイドバーを開く、モバイルでは閉じる
      setSidebarOpen(!mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 現在のプロジェクトのタスクをロード（初回とプロジェクト切替時）
  useEffect(() => {
    const loadTasks = async () => {
      try {
        // Electron環境チェック
        if (typeof window !== 'undefined' && window.electronAPI) {
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
        } else {
          // Web環境の場合は、Firebaseから読み込み（platform.ts経由）
          const { storage } = await import('../../utils/platform')
          const res = await storage.getTasks(currentProjectId || 'default')
          if (res.success && res.data) {
            const mapped: ReduxTask[] = res.data.map((row: any) => ({
              ...row,
              startDate: new Date(row.startDate),
              endDate: new Date(row.endDate),
            }))
            dispatch(setTasks(mapped))
          }
        }
      } catch (e) {
        console.error('Failed to load tasks for project', currentProjectId, e)
      }
    }
    void loadTasks()
  }, [currentProjectId, dispatch])

  const toggleTheme = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add('dark')
      if (typeof window !== 'undefined') window.localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      if (typeof window !== 'undefined') window.localStorage.setItem('theme', 'light')
    }
  }

  const fmt = (n: number) => (n > 0 ? (n > 99 ? '99+' : String(n)) : null)
  const menuItems = [
    { id: 'home', label: 'ホーム', icon: Home, badge: null as string | null },
    { id: 'dialogue', label: 'AI対話', icon: MessageSquare, badge: fmt(chatCount) },
    { id: 'tasks', label: 'タスク管理', icon: CheckSquare, badge: fmt(taskCount) },
    { id: 'gantt', label: 'ガントチャート', icon: BarChart3, badge: null as string | null },
    { id: 'calendar', label: 'カレンダー', icon: Calendar, badge: null as string | null },
    { id: 'team', label: 'チーム', icon: Users, badge: null as string | null },
    { id: 'reports', label: 'レポート', icon: FileText, badge: null as string | null },
    { id: 'settings', label: '設定', icon: Settings, badge: null as string | null },
  ]

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
    closed: { x: -280, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
        <div className="absolute inset-0 grid-pattern" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:block p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  TaskFlow AI
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Intelligent Task Management
                </p>
              </div>
            </div>
          </div>

          {/* Center Section - Project Selector & Search */}
          <div className="hidden md:flex flex-1 max-w-3xl mx-8 gap-4">
            <ProjectSelector compact showCreateButton={false} />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="タスクやプロジェクトを検索..."
                className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-neutral-900 transition-all duration-200 outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600">⌘</kbd>
                <kbd className="px-2 py-1 text-xs bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600">K</kbd>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notifications - Hidden on mobile */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="hidden sm:block relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full animate-pulse" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <AnimatePresence mode="wait">
                {darkMode ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun size={20} className="text-warning-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon size={20} className="text-primary-600" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Profile - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-3 ml-2 pl-2 border-l border-neutral-200 dark:border-neutral-800">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium">Yoshii Katsuhiko</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">プロジェクトマネージャー</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold shadow-md">
                YK
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className={`fixed left-0 top-16 bottom-0 w-72 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-r border-neutral-200 dark:border-neutral-800 overflow-hidden ${
              isMobile ? 'z-30' : 'z-20'
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto smooth-scroll">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id)
                      // モバイルではメニュー選択後にサイドバーを閉じる
                      if (isMobile) setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                      activeSection === item.id
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/25'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon 
                        size={20} 
                        className={activeSection === item.id ? 'text-white' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-primary-500'}
                      />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        activeSection === item.id
                          ? 'bg-white/20 text-white'
                          : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                ))}
              </nav>

              {/* Progress Overview */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">今日の進捗</span>
                      <span className="text-sm font-medium">{completionRate}%</span>
                    </div>
                    <div className="progress">
                      <div className="progress-bar" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">週間目標</span>
                        <span className="text-sm font-medium">—</span>
                    </div>
                    <div className="progress">
                        <div className="progress-bar bg-gradient-to-r from-warning-500 to-error-500" style={{ width: '0%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                <button 
                  className="w-full btn btn-gradient shadow-lg"
                  onClick={() => {
                    setActiveSection('dialogue')
                    if (isMobile) setSidebarOpen(false)
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  新しいタスクを作成
                </button>
                <button
                  className="w-full mt-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => {
                    setShowProjectCreate(true)
                    if (isMobile) setSidebarOpen(false)
                  }}
                >
                  新しいプロジェクト
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          sidebarOpen && !isMobile ? 'md:ml-72' : 'md:ml-0'
        }`}
      >
        <div className="h-[calc(100vh-4rem)] box-border overflow-y-auto p-4 lg:p-6">
          <motion.div className="h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === 'home' && <Dashboard onNavigate={setActiveSection} />}
            {activeSection === 'dialogue' && <AIDialogue />}
            {activeSection === 'tasks' && <TaskList />}
            {activeSection === 'gantt' && <GanttChart />}
            {activeSection === 'calendar' && <CalendarView />}
            {activeSection === 'team' && (
              <div className="card p-6">
                <p className="text-neutral-600 dark:text-neutral-300">チーム管理は準備中です。</p>
              </div>
            )}
            {activeSection === 'reports' && <Reports />}
            {activeSection === 'settings' && (
              <div className="card p-6">
                <p className="text-neutral-600 dark:text-neutral-300">設定画面は準備中です。</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-4 top-20 w-80 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-50"
          >
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold">通知</h3>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <p className="text-sm font-medium text-primary-900 dark:text-primary-100">新しいタスクが割り当てられました</p>
                <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">5分前</p>
              </div>
              <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
                <p className="text-sm font-medium text-success-900 dark:text-success-100">プロジェクトが完了しました</p>
                <p className="text-xs text-success-700 dark:text-success-300 mt-1">1時間前</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Creation Modal */}
      <ProjectCreationModal
        isOpen={showProjectCreate}
        onClose={() => setShowProjectCreate(false)}
        suggestedName="" // MainLayoutからは提案なし
        onCreate={(name: string) => {
          const id = `prj_${Date.now().toString(36)}`
          const project = {
            id,
            name,
            description: '',
            color: '#3B82F6',
            icon: '📁',
            startDate: new Date(),
            status: 'active' as const,
            owner: '自分',
            members: ['自分'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
          dispatch(addProject(project))
          dispatch(setCurrentProject(project.id))
          setShowProjectCreate(false)
          // プロジェクト切替直後は空で初期化し、DBから再取得
          dispatch(setTasks([]))
        }}
      />
    </div>
  )
}

export default MainLayout