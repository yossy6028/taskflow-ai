import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { geminiAPI, storage, isElectron, isWeb } from '../../utils/platform'
import { setTasks, Task as ReduxTask } from '../../store/slices/tasksSlice'
import { addProject, setCurrentProject } from '../../store/slices/projectsSlice'
import { setTeamMembers } from '../../store/slices/teamSlice'
import type { GeneratedTask, DBTaskRow } from '../../../shared/types'
import type { RootState } from '../../store'
import TaskPlanningDialog from './TaskPlanningDialog'
import TaskDetailEditor, { TaskDetail } from '../Tasks/TaskDetailEditor'
import TeamMemberManager, { TeamMember } from '../Settings/TeamMemberManager'
import ProjectCreationModal from '../Projects/ProjectCreationModal'
import { TaskScheduler, TaskRequirement, ScheduleEvent } from '../../utils/taskScheduler'
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Loader2, 
  Paperclip, 
  Mic, 
  Image,
  Hash,
  Smile,
  MoreVertical,
  PlusCircle,
  RefreshCw,
  Download,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Brain,
  Target,
  TrendingUp,
  Edit3,
  Trash2,
  Users
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
  reactions?: string[]
  attachments?: unknown[]
}

interface DialogueSession {
  id: string
  title: string
  stage: number
  maxStages: number
  progress: number
  insights: string[]
}

const AIDialogue: React.FC = () => {
  const currentProjectId = useSelector((state: RootState) => state.projects.currentProjectId)
  const projects = useSelector((state: RootState) => state.projects.projects)
  const currentProject = useSelector((state: RootState) => {
    const id = state.projects.currentProjectId
    return state.projects.projects.find(p => p.id === id)
  })
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'こんにちは！TaskFlow AIへようこそ 🎯\n\nあなたのアイデアを具体的なタスクに変換するお手伝いをします。\n\nまず、どのようなプロジェクトやタスクについて考えていますか？',
      timestamp: new Date(),
      reactions: []
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showPlanningDialog, setShowPlanningDialog] = useState(false)
  const [showProjectCreate, setShowProjectCreate] = useState(false)
  const [suggestedProjectName, setSuggestedProjectName] = useState<string>('') // AIが提案するプロジェクト名
  const [currentUserInput, setCurrentUserInput] = useState('')
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null)
  const [showTeamManager, setShowTeamManager] = useState(false)
  const teamMembers = useSelector((state: RootState) => state.team.members)
  type PendingTask = TaskDetail & {
    tags?: string // comma separated in UI
  }
  const today = () => new Date().toISOString().slice(0,10)
  const tomorrow = () => new Date(Date.now() + 24*60*60*1000).toISOString().slice(0,10)
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [showReview, setShowReview] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const dispatch = useDispatch()
  const [currentSession, setCurrentSession] = useState<DialogueSession>({
    id: '1',
    title: '新規プロジェクト',
    stage: 1,
    maxStages: 10,
    progress: 10,
    insights: []
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const suggestions = [
    { icon: Zap, text: '新しいWebサービスを開発したい', color: 'from-yellow-400 to-orange-500' },
    { icon: Brain, text: 'マーケティング戦略を立てたい', color: 'from-purple-400 to-pink-500' },
    { icon: Target, text: 'イベントを企画・運営したい', color: 'from-blue-400 to-cyan-500' },
    { icon: TrendingUp, text: 'ビジネスプロセスを改善したい', color: 'from-green-400 to-emerald-500' }
  ]

  // ユーザーの入力からプロジェクト名を生成
  const generateProjectName = async (userInput: string): Promise<string> => {
    if (!userInput) return ''
    
    try {
      const prompt = `
以下のユーザーの要望から、適切なプロジェクト名を生成してください。
プロジェクト名は具体的で分かりやすく、20文字以内にしてください。

ユーザーの要望: ${userInput}

プロジェクト名のみを返してください（説明は不要）。
`
      const response = await geminiAPI.chat(prompt)
      if (response.success && response.data) {
        // レスポンスから余分な記号や改行を削除
        const cleanName = response.data
          .replace(/[「」『』【】]/g, '')
          .replace(/\n/g, '')
          .trim()
          .slice(0, 30) // 最大30文字に制限
        return cleanName || userInput.slice(0, 20) + 'プロジェクト'
      }
    } catch (error) {
      console.error('Failed to generate project name:', error)
    }
    
    // フォールバック: 入力の最初の20文字を使用
    return userInput.slice(0, 20) + 'プロジェクト'
  }

  const mapGeneratedToPending = (items: GeneratedTask[]): PendingTask[] =>
    (items || []).map((t: GeneratedTask) => ({
      title: t.title,
      description: t.description,
      startDate: (t.startDate || today()),
      endDate: (t.endDate || tomorrow()),
      estimatedHours: t.estimatedHours,
      priority: t.priority ?? 'medium',
      assignee: t.assignee ?? '',
      tags: ''
    }))

  // 文字列正規化とゆるい重複判定（日本語向けに単純化）。
  const normalizeText = (s: string): string =>
    (s || '')
      .toLowerCase()
      .replace(/[\s\u3000]/g, '') // 空白除去（半角/全角）
      .replace(/[、，。．・,\.\-_/\\()[\]{}【】]/g, '') // 句読点や記号除去
      .replace(/ターゲット|対象/gu, '対象')
      .replace(/受講者|受講生|生徒/gu, '生徒')
      .replace(/追加受講|追加/gu, '追加')
      .replace(/作成/gu, '作成')
      .replace(/検討/gu, '検討')
      .replace(/提案/gu, '提案')
      .replace(/資料/gu, '資料')

  const ngrams = (s: string, n = 2): Set<string> => {
    const g = new Set<string>()
    for (let i = 0; i <= s.length - n; i++) g.add(s.slice(i, i + n))
    return g
  }

  const jaccard = (a: Set<string>, b: Set<string>): number => {
    const inter = new Set([...a].filter(x => b.has(x)))
    const uni = new Set([...a, ...b])
    return uni.size === 0 ? 1 : inter.size / uni.size
  }

  const isSimilarTitle = (a: string, b: string): boolean => {
    const na = normalizeText(a)
    const nb = normalizeText(b)
    if (!na || !nb) return false
    if (na === nb) return true
    if (na.includes(nb) || nb.includes(na)) return true
    return jaccard(ngrams(na, 2), ngrams(nb, 2)) >= 0.85
  }

  // 重複排除（類似タイトルかつ担当者が同一（または空同士）で統合）
  const dedupePendingTasks = (tasks: PendingTask[]): PendingTask[] => {
    const rank: Record<PendingTask['priority'], number> = { high: 3, medium: 2, low: 1 }
    const result: PendingTask[] = []
    outer: for (const t of tasks) {
      for (let i = 0; i < result.length; i++) {
        const ex = result[i]
        const sameAssignee = (ex.assignee || '') === (t.assignee || '')
        if (sameAssignee && isSimilarTitle(ex.title || '', t.title || '')) {
          result[i] = {
            ...ex,
            title: ex.title.length >= (t.title || '').length ? ex.title : t.title,
            description: [ex.description, t.description].filter(Boolean).join('\n\n'),
            startDate: ex.startDate < t.startDate ? ex.startDate : t.startDate,
            endDate: ex.endDate > t.endDate ? ex.endDate : t.endDate,
            estimatedHours: Math.max(ex.estimatedHours || 0, t.estimatedHours || 0),
            priority: rank[ex.priority] >= rank[t.priority] ? ex.priority : t.priority,
            assignee: ex.assignee || t.assignee,
            tags: [ex.tags, t.tags].filter(Boolean).join(',')
          }
          continue outer
        }
      }
      result.push({ ...t })
    }
    return result
  }

  // 会話から要約入力を生成して、AIの構造化タスクへ変換
  const handleGenerateFromConversation = async () => {
    if (isTyping) {
      console.warn('Generation already in progress, ignoring duplicate request')
      return
    }

    console.log('Starting task generation from conversation')
    setShowSuggestions(false)
    setIsTyping(true)

    try {
      const combined = messages
        .map(m => `${m.type === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
        .join('\n')
        .slice(-8000) // 安全のため制限

      console.log(`Processing conversation with ${combined.length} characters`)

      // プラットフォームに応じたタイムアウト付きでAPI呼び出し
      const apiTimeoutMs = isElectron() ? 30000 : 45000 // PC: 30秒, スマホ: 45秒
      const withTimeout = async <T,>(p: Promise<T>): Promise<T> => {
        return Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`API request timeout after ${apiTimeoutMs}ms on ${isWeb() ? 'mobile' : 'desktop'}`)), apiTimeoutMs)
          )
        ])
      }

      const res = await withTimeout(
        geminiAPI.breakdownEnriched(combined, { priority: 'medium' })
      )

      if (res.success && res.data) {
        const tasks = dedupePendingTasks(mapGeneratedToPending(res.data.tasks || []))
        console.log(`Generated ${tasks.length} tasks from conversation`)
        if (tasks.length > 0) {
          setPendingTasks(tasks)
          setShowReview(true)
          return
        }
      } else if (res.message) {
        // APIエラーメッセージを表示
        console.error('Enriched breakdown failed:', res.message)
        setMessages(prev => [...prev, {
          id: (Date.now() + 0.1).toString(),
          type: 'ai',
          content: `エラーが発生しました: ${res.message}

API設定を確認するか、しばらく待ってから再度お試しください。`,
          timestamp: new Date(),
        }])
        return
      }

      // フォールバック: 通常の分解を試行
      console.log('Trying fallback breakdown method')
      const fb = await withTimeout(
        geminiAPI.breakdown(combined, { priority: 'medium' })
      )

      if (fb.success && fb.data) {
        const tasks = dedupePendingTasks(mapGeneratedToPending(fb.data.tasks || []))
        console.log(`Fallback generated ${tasks.length} tasks from conversation`)
        if (tasks.length > 0) {
          setPendingTasks(tasks)
          setShowReview(true)
          return
        }
      } else if (fb.message) {
        console.error('Fallback breakdown failed:', fb.message)
        setMessages(prev => [...prev, {
          id: (Date.now() + 0.2).toString(),
          type: 'ai',
          content: `タスク生成に失敗しました: ${fb.message}`,
          timestamp: new Date(),
        }])
        return
      }

      // 両方失敗した場合
      console.error('Both breakdown methods failed')
      setMessages(prev => [...prev, {
        id: (Date.now() + 0.3).toString(),
        type: 'ai',
        content: 'タスク生成に失敗しました。入力内容を見直すか、API設定を確認してください。',
        timestamp: new Date(),
      }])
    } catch (e: any) {
      const errorMsg = e.message || 'Unknown error'
      console.error('Generate from conversation failed:', e)
      setMessages(prev => [...prev, {
        id: (Date.now() + 0.4).toString(),
        type: 'ai',
        content: `予期しないエラーが発生しました: ${errorMsg}`,
        timestamp: new Date(),
      }])
    } finally {
      console.log('Task generation from conversation completed')
      setIsTyping(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
    // 新規スタート時（メッセージが初期状態）にプロジェクト未確定ならモーダルを出す
    if ((!currentProjectId || currentProjectId === 'default') && messages.length <= 1) {
      setShowProjectCreate(true)
    }
  }, [messages])

  const handleSend = async () => {
    // 会話開始一発目の送信は必ず新規プロジェクト名ヒアリングを実施（既存プロジェクトがあっても）
    if (messages.length <= 1) {
      // 入力内容からプロジェクト名を生成
      const suggestedName = await generateProjectName(inputValue.trim())
      setSuggestedProjectName(suggestedName)
      setShowProjectCreate(true)
      return
    }
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      status: 'sending'
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = inputValue
    setInputValue('')
    setIsTyping(true)
    setShowSuggestions(false)

    // AIからの最初の応答: タスク計画の詳細を聞く
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'プロジェクトの内容を理解しました。\n\n最適なタスクを生成するため、いくつか詳細をお聞かせください。',
        timestamp: new Date(),
      }])
      setIsTyping(false)
      setCurrentUserInput(userInput)
      setShowPlanningDialog(true)
      
      // セッション進捗更新
      setCurrentSession(prev => ({
        ...prev,
        stage: Math.min(prev.stage + 1, prev.maxStages),
        progress: Math.min(((prev.stage + 1) / prev.maxStages) * 100, 100),
        insights: [...prev.insights, userInput]
      }))
    }, 600)
  }

  const onCreateProject = (name: string) => {
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
    // 直前の会話文脈や生成ドラフトを完全リセット（前プロジェクトの影響を排除）
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: `新しいプロジェクト「${name}」を作成しました。\n\nこのプロジェクトのゴールや前提を教えてください。` ,
        timestamp: new Date(),
        reactions: []
      }
    ])
    setCurrentUserInput('')
    setPendingTasks([])
    setShowReview(false)
    // state反映を待ってからダイアログを開く
    setTimeout(() => {
      setShowProjectCreate(false)
      setShowPlanningDialog(true)
    }, 0)
  }

  const handlePlanningConfirm = async (requirements: any) => {
    if (isTyping) {
      console.warn('Planning confirmation already in progress, ignoring duplicate request')
      return
    }

    console.log('Starting planning confirmation with requirements:', requirements)
    setShowPlanningDialog(false)
    setIsTyping(true)

    // 要件をメッセージとして追加
    const requirementsSummary = `
タスク計画の詳細:
- 目標: ${requirements.mainGoal}
- タスク数: ${requirements.taskCount || '自動設定'}
- 担当者数: ${requirements.assigneeCount || '自動設定'}
- 期間: ${requirements.projectDuration || '自動設定'}
- ゴール日: ${requirements.goalDate || '自動設定'}
- 優先度: ${requirements.priority}
- 複雑度: ${requirements.complexity}
${requirements.constraints?.length > 0 ? `- 制約: ${requirements.constraints.join(', ')}` : ''}
${requirements.teamMembers?.length > 0 ? `- チーム: ${requirements.teamMembers.join(', ')}` : ''}
${requirements.checkCalendar ? '- Googleカレンダー連携: 有効' : ''}
    `.trim()

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: requirementsSummary,
      timestamp: new Date(),
    }])

    // 要件を含めてタスク生成
    const projectContext = `プロジェクト名: ${currentProject?.name || '（未設定）'}\nこのプロジェクト名に直接関係するタスクのみを生成してください。無関係な一般タスクは除外してください。`
    const enrichedInput = `
${projectContext}

ユーザーからの入力:
${currentUserInput}

要件:
${requirementsSummary}
    `.trim()

    // プラットフォームに応じたタイムアウト付きで処理を実行
    const apiTimeoutMs = isElectron() ? 30000 : 45000 // PC: 30秒, スマホ: 45秒
    const withTimeout = async <T,>(p: Promise<T>, operation: string): Promise<T> => {
      try {
        console.log(`Starting ${operation} with ${apiTimeoutMs}ms timeout on ${isWeb() ? 'mobile' : 'desktop'}`)
        return await Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timeout after ${apiTimeoutMs}ms on ${isWeb() ? 'mobile' : 'desktop'}`)), apiTimeoutMs)
          )
        ])
      } catch (error) {
        console.error(`${operation} failed:`, error)
        throw error
      }
    }

    setTimeout(async () => {
      try {
        console.log('Starting enriched breakdown for planning confirmation')

        // 詳細補完込みでドラフト生成
        const result = await withTimeout(
          geminiAPI.breakdownEnriched(enrichedInput, {
            priority: requirements.priority || 'medium' as const,
            projectName: currentProject?.name || undefined
          }),
          'enriched breakdown'
        )

        if (result.success && result.data && Array.isArray(result.data.tasks) && result.data.tasks.length > 0) {
          let tasks: PendingTask[] = dedupePendingTasks(mapGeneratedToPending(result.data.tasks || []))
          console.log(`Generated ${tasks.length} tasks from planning requirements`)

          // Googleカレンダー連携とスケジューリング
          if (requirements.checkCalendar && requirements.goalDate && tasks.length > 0) {
            try {
              console.log('Processing calendar integration and scheduling')
              // TODO: 実際のカレンダーイベントを取得する処理を追加
              const mockEvents: ScheduleEvent[] = []

              // TaskSchedulerを使用してスケジューリング
              const scheduler = new TaskScheduler(mockEvents)
              const taskRequirements: TaskRequirement[] = tasks.map(t => ({
                title: t.title,
                estimatedHours: t.estimatedHours || 8,
                priority: t.priority,
                dependencies: []
              }))

              const goalDate = new Date(requirements.goalDate)
              const scheduledTasks = scheduler.scheduleTasksFromGoal(
                goalDate,
                taskRequirements,
                new Date()
              )

              // スケジュール結果をタスクに反映
              tasks = tasks.map((task, index) => {
                const scheduled = scheduledTasks[index]
                if (scheduled) {
                  return {
                    ...task,
                    startDate: scheduled.startDate.toISOString().split('T')[0],
                    endDate: scheduled.endDate.toISOString().split('T')[0]
                  }
                }
                return task
              })

              // スケジュールサマリーを生成
              const summary = scheduler.generateScheduleSummary(scheduledTasks)

              setMessages(prev => [...prev, {
                id: (Date.now() + 0.5).toString(),
                type: 'ai',
                content: `カレンダーを確認し、ゴール日程から逆算してスケジュールを作成しました。\n\n${summary}`,
                timestamp: new Date(),
              }])
            } catch (error) {
              console.error('Scheduling failed:', error)
              // スケジューリング失敗時は続行
            }
          }

          // 担当者の割り当て
          if (requirements.teamMembers?.length > 0 && tasks.length > 0) {
            console.log(`Assigning team members to ${tasks.length} tasks`)
            tasks.forEach((task, index) => {
              if (!task.assignee && requirements.teamMembers.length > 0) {
                task.assignee = requirements.teamMembers[index % requirements.teamMembers.length]
              }
            })
          }

          if (tasks.length > 0) {
            setPendingTasks(tasks)
            setShowReview(true)
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              content: `ご要望に基づいて${tasks.length}個のタスク案を作成しました。\n\n下部のパネルで詳細を確認・調整して、承認してください。`,
              timestamp: new Date(),
            }])
            return
          }
        }

        // フォールバック（上で1件も出なかった場合のみ）
        console.log('Trying fallback breakdown method')
        const fb = await withTimeout(
          geminiAPI.breakdown(enrichedInput, {
            priority: requirements.priority || 'medium' as const,
            projectName: currentProject?.name || undefined
          }),
          'fallback breakdown'
        )

        if (fb.success && fb.data && (!result.data || !Array.isArray(result.data.tasks) || result.data.tasks.length === 0)) {
          const tasks: PendingTask[] = dedupePendingTasks(mapGeneratedToPending(fb.data.tasks || []))

          // 担当者の割り当て
          if (requirements.teamMembers?.length > 0 && tasks.length > 0) {
            tasks.forEach((task, index) => {
              if (!task.assignee && requirements.teamMembers.length > 0) {
                task.assignee = requirements.teamMembers[index % requirements.teamMembers.length]
              }
            })
          }

          if (tasks.length > 0) {
            console.log(`Fallback generated ${tasks.length} tasks`)
            setPendingTasks(tasks)
            setShowReview(true)
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              content: `${tasks.length}個のタスク案を作成しました。下部パネルで調整して承認してください。`,
              timestamp: new Date(),
            }])
            return
          }
        }

        // 生成失敗時のエラーメッセージ改善
        const errorMsg = result.message || fb.message || '不明なエラー'
        console.error('Both breakdown methods failed:', errorMsg)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `タスク案の生成に失敗しました: ${errorMsg}

以下を確認してください:
• API設定が正しいか
• ネットワーク接続が安定しているか
• 入力内容が明確で具体的か`,
          timestamp: new Date(),
        }])
      } catch (err: any) {
        const errorMsg = err.message || 'Unknown error'
        console.error('Task generation failed:', err)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `システムエラーが発生しました: ${errorMsg}

しばらく待ってから再度お試しください。問題が続く場合はサポートにお問い合わせください。`,
          timestamp: new Date(),
        }])
      } finally {
        console.log('Planning confirmation process completed')
        setIsTyping(false)
      }
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    inputRef.current?.focus()
  }

  const acceptTasks = async () => {
    console.log('🔄 === TASK ACCEPTANCE START ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Platform:', isElectron() ? 'Electron' : 'Web')
    console.log('Pending tasks count:', pendingTasks.length)

    if (isApproving) {
      console.warn('⚠️ Task acceptance already in progress, ignoring duplicate request')
      console.log('🔄 === TASK ACCEPTANCE END (DUPLICATE) ===')
      return
    }

    console.log('✅ Starting task acceptance process')
    console.log('Setting isApproving to true')
    setIsApproving(true)
    console.log('isApproving state set successfully')

    // 状態管理用の変数
    let timeoutId: NodeJS.Timeout | null = null
    let isCompleted = false

    // 確実に状態をリセットするヘルパー関数
    const resetState = (success: boolean = false, error?: string) => {
      console.log('🔄 === RESET STATE CALLED ===')
      console.log('Success:', success)
      console.log('Error:', error)
      console.log('isCompleted before:', isCompleted)

      if (isCompleted) {
        console.log('⚠️ Already completed, skipping resetState')
        return // 既に完了済みなら何もしない
      }

      isCompleted = true
      console.log(`✅ Task acceptance ${success ? 'completed successfully' : 'failed'}`)

      // タイムアウトをクリア
      if (timeoutId) {
        console.log('Clearing timeout')
        clearTimeout(timeoutId)
        timeoutId = null
      } else {
        console.log('No timeout to clear')
      }

      console.log('Resetting UI state...')
      setShowReview(false)
      setPendingTasks([])
      setIsApproving(false)
      // 念のため強制的にボタン文言を戻すために微小遅延後に再評価
      setTimeout(() => {
        console.log('🔁 Ensuring isApproving=false after reset')
        setIsApproving(false)
      }, 0)
      console.log('UI state reset completed')

      // エラーがあった場合の処理
      if (error) {
        console.error('📝 Adding error message to chat')
        console.error('Task acceptance error:', error)
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'ai',
          content: `❌ タスクの作成中にエラーが発生しました: ${error}`,
          timestamp: new Date(),
          reactions: []
        }])
        console.log('Error message added to chat')
      }

      console.log('🔄 === RESET STATE END ===')
    }

    // プラットフォームに応じたタイムアウト処理を設定
    const timeoutMs = isElectron() ? 15000 : 30000; // PC: 15秒, スマホ: 30秒
    timeoutId = setTimeout(() => {
      console.error(`Task acceptance timed out after ${timeoutMs}ms on ${isElectron() ? 'desktop' : 'mobile'}`)
      resetState(false, '処理がタイムアウトしました。ネットワーク接続を確認して、もう一度お試しください。')
    }, timeoutMs)

    // プラットフォームに応じたタイムアウト処理のヘルパー
    const getOperationTimeout = (operation: string): number => {
      const isWebPlatform = isWeb()
      switch (operation) {
        case 'get existing tasks':
          return isWebPlatform ? 10000 : 5000 // Firebaseは少し時間がかかる
        case 'save task':
          return isWebPlatform ? 15000 : 10000 // Firebaseの書き込みは遅い場合がある
        case 'fetch updated tasks':
          return isWebPlatform ? 12000 : 5000
        default:
          return isWebPlatform ? 12000 : 8000
      }
    }

    // 個々の非同期処理を確実にタイムアウトさせるヘルパー
    const withTimeout = async <T,>(p: Promise<T>, operation: string): Promise<T> => {
      const timeoutMs = getOperationTimeout(operation)
      try {
        console.log(`Starting ${operation} with ${timeoutMs}ms timeout`)
        return await Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms on ${isWeb() ? 'mobile' : 'desktop'}`)), timeoutMs)
          )
        ])
      } catch (error) {
        console.error(`${operation} failed:`, error)
        throw error
      }
    }

    try {
      // プラットフォーム統一APIを使用
      const { storage } = await import('../../utils/platform')

      // 既存タスクを取得して重複を事前にスキップ（ゆるい類似判定）
      let existingList: Array<{ titleNorm: string; assignee: string; startDay: string; endDay: string }> = []

      try {
        console.log('📋 Fetching existing tasks for duplicate check')
        console.log('Project ID:', currentProjectId || 'default')

        const existing = await withTimeout(
          storage.getTasks(currentProjectId || 'default'),
          'get existing tasks'
        )

        console.log('Existing tasks result:', existing)

        if (existing.success && existing.data) {
          console.log(`Processing ${existing.data.length} existing tasks`)
          for (let i = 0; i < existing.data.length; i++) {
            const row = existing.data[i];
            console.log(`Processing existing task ${i + 1}:`, row.title)

            const startDay = new Date(row.startDate || row.start_date).toISOString().slice(0,10)
            const endDay = new Date(row.endDate || row.end_date).toISOString().slice(0,10)
            existingList.push({
              titleNorm: normalizeText(row.title || ''),
              assignee: (row.assignee || '').trim(),
              startDay,
              endDay
            })
          }
          console.log(`✅ Found ${existingList.length} existing tasks for duplicate check`)
        } else {
          console.log('❌ No existing tasks found or failed to fetch')
        }
      } catch (err) {
        console.warn('⚠️ Failed to get existing tasks, continuing anyway:', err)
        // このエラーでは処理を中断しない
      }

      const createdKeys = new Set<string>()
      const toCreate = pendingTasks
        .filter(pt => pt.title && pt.startDate && pt.endDate)
        .map(pt => ({ ...pt }))

      console.log(`📝 Processing ${toCreate.length} tasks for creation`)
      console.log('Tasks to create:', toCreate.map(t => t.title))

      // タスクの作成を一つずつ処理
      let createdCount = 0
      const errors: string[] = []

      for (let i = 0; i < toCreate.length; i++) {
        const t = toCreate[i]
        console.log(`🔄 === PROCESSING TASK ${i + 1}/${toCreate.length} ===`)
        console.log('Task title:', t.title)

        try {
          // 入力検証（簡易）
          if (!t.title.trim()) {
            console.warn(`⚠️ Skipping task ${i + 1}: empty title`)
            continue
          }

          const start = new Date(t.startDate)
          const end = new Date(t.endDate)
          console.log('Task dates:', { start: t.startDate, end: t.endDate, startParsed: start, endParsed: end })

          if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            console.warn(`⚠️ Skipping task ${i + 1}: invalid dates`, { start: t.startDate, end: t.endDate })
            continue
          }

          const tagsArr = (t.tags || '')
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
          console.log('Task tags:', tagsArr)

          // 拡張データをdescriptionに含める（暫定的な実装）
          const extendedDescription = [
            t.description,
            t.content ? `\n【詳細内容】\n${t.content}` : '',
            t.technologies?.length ? `\n【使用技術】${t.technologies.join(', ')}` : '',
            t.deliverables?.length ? `\n【成果物】\n${t.deliverables.map(d => `- ${d}`).join('\n')}` : '',
            t.risks?.length ? `\n【リスク】\n${t.risks.map(r => `- ${r}`).join('\n')}` : '',
            t.notes ? `\n【備考】\n${t.notes}` : ''
          ].filter(s => s).join('')

          console.log('Extended description length:', extendedDescription.length)

          // 既存・同バッチ重複のスキップ（類似タイトル/担当/日付で判定）
          const startDay = start.toISOString().slice(0,10)
          const endDay = end.toISOString().slice(0,10)
          const assignee = (t.assignee || '').trim()
          const titleNorm = normalizeText(t.title)
          console.log('Duplicate check data:', { startDay, endDay, assignee, titleNorm })

          const dupInExisting = existingList.some(ex =>
            ex.assignee === assignee && ex.startDay === startDay && ex.endDay === endDay &&
            (ex.titleNorm === titleNorm || isSimilarTitle(ex.titleNorm, titleNorm))
          )
          const batchKey = `${titleNorm}__${assignee}__${startDay}__${endDay}`

          console.log('Duplicate check results:', { dupInExisting, batchKey, hasBatchKey: createdKeys.has(batchKey) })

          if (dupInExisting) {
            console.log(`⏭️ Skipping task ${i + 1}: duplicate found in existing tasks`)
            continue
          }

          if (createdKeys.has(batchKey)) {
            console.log(`⏭️ Skipping task ${i + 1}: duplicate in current batch`)
            continue
          }

          const taskData = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
            projectId: currentProjectId || 'default',
            title: t.title,
            description: extendedDescription || t.description,
            estimatedHours: t.estimatedHours ?? 1,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            priority: t.priority,
            progress: 0,
            dependencies: t.dependencies || [],
            tags: tagsArr,
            // 承認後は「進行中」に遷移させる
            status: t.status || 'in-progress',
            assignee: t.assignee,
            actualHours: t.actualHours,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          console.log('📦 Final task data:', JSON.stringify(taskData, null, 2))
          console.log(`💾 Creating task ${i + 1}/${toCreate.length}: ${t.title}`)

          await withTimeout(storage.saveTask(taskData), `save task "${t.title}"`)

          createdCount++
          createdKeys.add(batchKey)
          console.log(`✅ Task ${i + 1} created successfully`)

        } catch (saveErr) {
          const errorMsg = `Failed to save task "${t.title}": ${saveErr instanceof Error ? saveErr.message : 'Unknown error'}`
          console.error(`❌ Task ${i + 1} creation failed:`, errorMsg)
          console.error('Error details:', saveErr)
          errors.push(errorMsg)
        }
      }

      console.log(`Successfully created ${createdCount} out of ${toCreate.length} tasks`)

      // 承認後にDBから最新のタスクを取得してReduxへ反映
      console.log('🔄 === UPDATING REDUX STATE ===')
      try {
        console.log('⏳ Waiting 200ms for DB write completion')
        await new Promise(resolve => setTimeout(resolve, 200))

        console.log('📥 Fetching updated tasks from database')
        const res = await withTimeout(
          storage.getTasks(currentProjectId || 'default'),
          'fetch updated tasks'
        )

        console.log('Fetch result:', res)

        if (res.success && res.data) {
          console.log(`📊 Mapping ${res.data.length} tasks for Redux`)
          const mapped: ReduxTask[] = res.data.map((row: any, index: number) => {
            console.log(`Mapping task ${index + 1}:`, row.title)
            return {
              id: row.id,
              projectId: row.projectId || (row as any).project_id || 'default',
              title: row.title,
              description: row.description ?? '',
              startDate: new Date(row.startDate || row.start_date),
              endDate: new Date(row.endDate || row.end_date),
              progress: row.progress,
              priority: row.priority,
              dependencies: row.dependencies ?? [],
              status: row.status,
              estimatedHours: row.estimatedHours ?? row.estimated_hours ?? 0,
              actualHours: row.actualHours ?? row.actual_hours ?? undefined,
              assignee: row.assignee ?? undefined,
              tags: row.tags ?? [],
            }
          })

          console.log(`🚀 Dispatching setTasks with ${mapped.length} tasks`)
          console.log('Mapped tasks:', mapped.map(t => ({ id: t.id, title: t.title })))
          dispatch(setTasks(mapped))
          console.log('✅ Redux state updated successfully')
        } else {
          console.log('❌ No tasks to update or fetch failed')
        }
      } catch (fetchErr) {
        console.error('❌ Failed to fetch updated tasks:', fetchErr)
        // このエラーでは処理を中断しない
      }
      console.log('🔄 === REDUX UPDATE END ===')

      // 成功メッセージ
      console.log('📝 === FINALIZING TASK ACCEPTANCE ===')
      console.log('Created count:', createdCount)
      console.log('Errors count:', errors.length)
      console.log('Total to create:', toCreate.length)

      if (createdCount > 0) {
        let successMessage = `✅ ${createdCount}個のタスクを正常に作成しました。`
        if (errors.length > 0) {
          successMessage += ` (${errors.length}個のタスクでエラーが発生しました)`
        }
        console.log('Adding success message to chat:', successMessage)
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          type: 'ai',
          content: successMessage,
          timestamp: new Date(),
          reactions: []
        }])
      } else if (toCreate.length === 0) {
        console.log('No tasks to create - adding warning message')
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          type: 'ai',
          content: '⚠️ 作成可能なタスクが見つかりませんでした。タスクの情報が正しいか確認してください。',
          timestamp: new Date(),
          reactions: []
        }])
      }

      // エラーがあった場合の追加メッセージ
      if (errors.length > 0) {
        console.log('Adding error details to chat')
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'ai',
          content: `⚠️ 以下のタスクでエラーが発生しました:\n${errors.slice(0, 3).map(e => `• ${e}`).join('\n')}${errors.length > 3 ? `\n...他${errors.length - 3}件` : ''}`,
          timestamp: new Date(),
          reactions: []
        }])
      }

      console.log('✅ Calling resetState with success=true')
      // 正常完了
      resetState(true)

      console.log('🔄 === TASK ACCEPTANCE END (SUCCESS) ===')

    } catch (e) {
      console.log('🔄 === TASK ACCEPTANCE END (ERROR) ===')
      const errorMsg = e instanceof Error ? e.message : '不明なエラー'
      console.error('❌ Task acceptance failed with error:', e)
      console.error('Error type:', typeof e)
      console.error('Error constructor:', e?.constructor?.name)
      console.error('Error stack:', e instanceof Error ? e.stack : 'No stack trace')
      resetState(false, errorMsg)
    }
  }

  const rejectTasks = () => {
    console.log('Rejecting tasks and clearing state')
    setShowReview(false)
    setPendingTasks([])
    // isApproving状態もリセット（念のため）
    if (isApproving) {
      console.warn('Resetting isApproving state during task rejection')
      setIsApproving(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI対話セッション</h2>
              <p className="text-white/80 text-sm">Gemini 2.5 Flash による分析</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <RefreshCw size={20} />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <Download size={20} />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>対話ステージ {currentSession.stage}/{currentSession.maxStages}</span>
            <span>{Math.round(currentSession.progress)}% 完了</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${currentSession.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {currentSession.insights.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-white/70">収集した情報:</span>
              <div className="flex gap-1">
                {currentSession.insights.slice(-3).map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-white/60 rounded-full" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 smooth-scroll">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              
              <div className={`max-w-2xl ${message.type === 'user' ? 'order-1' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg' 
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Message Actions */}
                <div className="flex items-center gap-2 mt-2 px-2">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {message.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {message.type === 'ai' && (
                    <>
                      <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors">
                        <Copy size={14} className="text-neutral-500" />
                      </button>
                      <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors">
                        <ThumbsUp size={14} className="text-neutral-500" />
                      </button>
                      <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors">
                        <ThumbsDown size={14} className="text-neutral-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0 order-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-600 to-neutral-700 flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pb-4"
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">クイックスタート:</p>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-all duration-200 text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${suggestion.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <suggestion.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{suggestion.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between">
            <button
              onClick={handleGenerateFromConversation}
              disabled={isTyping || messages.length === 0}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              この提案をタスク案に変換して編集
            </button>
          </div>
          <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="アイデアや質問を入力してください..."
              className="w-full px-4 py-3 pr-12 md:pr-32 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 resize-none outline-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-0.5 md:gap-1">
              <button className="p-1 md:p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <Paperclip size={14} className="md:hidden text-neutral-500" />
                <Paperclip size={18} className="hidden md:block text-neutral-500" />
              </button>
              <button className="p-1 md:p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <Image size={14} className="md:hidden text-neutral-500" />
                <Image size={18} className="hidden md:block text-neutral-500" />
              </button>
              <button className="p-1 md:p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <Mic size={14} className="md:hidden text-neutral-500" />
                <Mic size={18} className="hidden md:block text-neutral-500" />
              </button>
            </div>
          </div>
          <motion.button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="px-3 md:px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isTyping ? (
              <Loader2 className="w-4 md:w-5 h-4 md:h-5 animate-spin" />
            ) : (
              <Send className="w-4 md:w-5 h-4 md:h-5" />
            )}
          </motion.button>
        </div>
        
        {/* Input hints - Hidden on mobile */}
        <div className="hidden md:flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Hash size={12} />
              タグを追加
            </span>
            <span className="flex items-center gap-1">
              <Smile size={12} />
              絵文字
            </span>
            <span>Shift + Enter で改行</span>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {inputValue.length}/1000
          </span>
        </div>
        </div>
      </div>

      {/* Review Panel */}
      {showReview && editingTaskIndex === null && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-2 md:p-4">
          <div className="w-full md:max-w-5xl md:mx-auto">
            <h4 className="font-semibold mb-2 md:mb-3 text-base md:text-lg">AIが提案したタスク案</h4>
            <div className="max-h-60 md:max-h-96 overflow-y-auto space-y-2">
              {pendingTasks.map((t, i) => (
                <div key={i} className="p-2 md:p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <h5 className="font-medium text-sm md:text-base text-neutral-900 dark:text-neutral-100 flex-1">{t.title || '未設定'}</h5>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          t.priority === 'high' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : t.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs md:text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">担当:</span>
                            <select
                              value={t.assignee || ''}
                              onChange={(e) => setPendingTasks(prev => prev.map((pt, idx) => 
                                idx === i ? { ...pt, assignee: e.target.value } : pt
                              ))}
                              className="px-1 md:px-2 py-0.5 md:py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs md:text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">未割当</option>
                              {teamMembers.filter(m => m.isActive).map(member => (
                                <option key={member.id} value={member.name}>
                                  {member.name} {member.role ? `(${member.role})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="font-medium">工数:</span> {t.estimatedHours || 0}h
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">期間:</span> {t.startDate} 〜 {t.endDate}
                        </div>
                        <div>
                          <span className="font-medium">タグ:</span> {t.tags || 'なし'}
                        </div>
                      </div>
                      {t.description && (
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 md:ml-3">
                      <button
                        onClick={() => setEditingTaskIndex(i)}
                        className="p-1.5 md:p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        title="詳細編集"
                      >
                        <Edit3 size={14} className="md:hidden" />
                        <Edit3 size={16} className="hidden md:block" />
                      </button>
                      <button
                        onClick={() => setPendingTasks(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1.5 md:p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 size={14} className="md:hidden" />
                        <Trash2 size={16} className="hidden md:block" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mt-3 md:mt-4 pt-2 md:pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  onClick={() => setPendingTasks(prev => ([...prev, { 
                    title: '', 
                    description: '', 
                    startDate: today(), 
                    endDate: tomorrow(), 
                    estimatedHours: 1, 
                    priority: 'medium', 
                    assignee: '', 
                    tags: '' 
                  }]))}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  ＋ タスクを追加
                </button>
                <button
                  onClick={() => setShowTeamManager(true)}
                  className="text-sm text-neutral-600 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 font-medium flex items-center gap-1"
                >
                  <Users size={16} />
                  メンバー管理
                </button>
                <span className="text-sm text-neutral-500">
                  合計 {pendingTasks.length} タスク
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={rejectTasks} className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                  キャンセル
                </button>
                <button onClick={acceptTasks} disabled={isApproving} className={`px-6 py-2 rounded-lg transition-all text-white ${isApproving ? 'bg-neutral-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:shadow-lg'}`}>
                  {isApproving ? '処理中…' : '全て承認してタスク化'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Editor Modal */}
      {showReview && editingTaskIndex !== null && pendingTasks[editingTaskIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-auto">
            <TaskDetailEditor
              task={pendingTasks[editingTaskIndex]}
              index={editingTaskIndex}
              onSave={(updatedTask) => {
                setPendingTasks(prev => prev.map((t, i) => 
                  i === editingTaskIndex ? updatedTask : t
                ))
                setEditingTaskIndex(null)
              }}
              onDelete={() => {
                setPendingTasks(prev => prev.filter((_, i) => i !== editingTaskIndex))
                setEditingTaskIndex(null)
              }}
              onClose={() => setEditingTaskIndex(null)}
              isExpanded={true}
            />
          </div>
        </div>
      )}

      {/* Task Planning Dialog */}
      <TaskPlanningDialog
        isOpen={showPlanningDialog}
        onClose={() => setShowPlanningDialog(false)}
        onConfirm={handlePlanningConfirm}
        initialInput={currentUserInput}
      />

      {/* Team Member Manager */}
      <TeamMemberManager
        isOpen={showTeamManager}
        onClose={() => setShowTeamManager(false)}
        members={teamMembers}
        onSave={(members) => {
          dispatch(setTeamMembers(members))
        }}
      />

      {/* Project Creation Modal */}
      <ProjectCreationModal
        isOpen={showProjectCreate}
        onClose={() => setShowProjectCreate(false)}
        onCreate={onCreateProject}
        suggestedName={suggestedProjectName}
      />
    </div>
  )
}

export default AIDialogue
