import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Save,
  Calendar,
  Clock,
  User,
  Tag,
  FileText,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Code,
  Users,
  Target,
  Briefcase,
  Link
} from 'lucide-react'

export interface TaskDetail {
  title: string
  description?: string
  content?: string // 詳細な内容
  technologies?: string[] // 使用技術
  assignee?: string
  contributors?: string[] // 協力者
  startDate: string
  endDate: string
  estimatedHours?: number
  actualHours?: number
  priority: 'low' | 'medium' | 'high'
  status?: 'pending' | 'in-progress' | 'completed'
  tags?: string
  dependencies?: string[] // 依存タスク
  deliverables?: string[] // 成果物
  risks?: string[] // リスク・課題
  notes?: string // メモ
}

interface TaskDetailEditorProps {
  task: TaskDetail
  index: number
  onSave: (task: TaskDetail) => void
  onDelete: () => void
  onClose?: () => void
  isExpanded?: boolean
}

const TaskDetailEditor: React.FC<TaskDetailEditorProps> = ({
  task: initialTask,
  index,
  onSave,
  onDelete,
  onClose,
  isExpanded = false
}) => {
  const [task, setTask] = useState<TaskDetail>(initialTask)
  const [activeTab, setActiveTab] = useState<'basic' | 'detail' | 'team' | 'risk'>('basic')
  const [showAdvanced, setShowAdvanced] = useState(isExpanded)
  const teamMembers = useSelector((state: RootState) => state.team.members)
  
  // 入力用の一時変数
  const [techInput, setTechInput] = useState('')
  const [contributorInput, setContributorInput] = useState('')
  const [deliverableInput, setDeliverableInput] = useState('')
  const [riskInput, setRiskInput] = useState('')

  const handleSave = () => {
    onSave(task)
    if (onClose) onClose()
  }

  const addToArray = (field: keyof TaskDetail, value: string) => {
    if (value.trim()) {
      const currentArray = (task[field] as string[]) || []
      setTask(prev => ({
        ...prev,
        [field]: [...currentArray, value.trim()]
      }))
    }
  }

  const removeFromArray = (field: keyof TaskDetail, index: number) => {
    const currentArray = (task[field] as string[]) || []
    setTask(prev => ({
      ...prev,
      [field]: currentArray.filter((_, i) => i !== index)
    }))
  }

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  const statusIcons = {
    pending: <AlertTriangle className="w-4 h-4" />,
    'in-progress': <Clock className="w-4 h-4 animate-pulse" />,
    completed: <CheckCircle className="w-4 h-4" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
              {index + 1}
            </div>
            <h3 className="text-lg font-semibold">タスク詳細編集</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title={showAdvanced ? '簡易表示' : '詳細表示'}
            >
              {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {task.status && statusIcons[task.status]}
            <select
              value={task.status || 'pending'}
              onChange={(e) => setTask(prev => ({ ...prev, status: e.target.value as any }))}
              className="text-sm bg-transparent border-none focus:ring-0"
            >
              <option value="pending">未着手</option>
              <option value="in-progress">進行中</option>
              <option value="completed">完了</option>
            </select>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
            優先度: {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
          </div>
        </div>
      </div>

      {/* Tabs (詳細表示時のみ) */}
      {showAdvanced && (
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex">
            {[
              { id: 'basic', label: '基本情報', icon: FileText },
              { id: 'detail', label: '詳細', icon: Code },
              { id: 'team', label: 'チーム', icon: Users },
              { id: 'risk', label: 'リスク', icon: AlertTriangle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {/* 基本情報（常に表示） */}
        {(!showAdvanced || activeTab === 'basic') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                タイトル
              </label>
              <input
                type="text"
                value={task.title}
                onChange={(e) => setTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500"
                placeholder="タスクのタイトル"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                説明
              </label>
              <textarea
                value={task.description || ''}
                onChange={(e) => setTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500"
                rows={2}
                placeholder="タスクの簡単な説明"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  開始日
                </label>
                <input
                  type="date"
                  value={task.startDate}
                  onChange={(e) => setTask(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  終了日
                </label>
                <input
                  type="date"
                  value={task.endDate}
                  onChange={(e) => setTask(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <Clock className="inline w-4 h-4 mr-1" />
                  予定工数 (時間)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={task.estimatedHours || ''}
                  onChange={(e) => setTask(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <Target className="inline w-4 h-4 mr-1" />
                  優先度
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => setTask(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                担当者
              </label>
              <select
                value={task.assignee || ''}
                onChange={(e) => setTask(prev => ({ ...prev, assignee: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              >
                <option value="">未割当</option>
                {teamMembers.filter(m => m.isActive).map(member => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                    {member.role && ` - ${member.role}`}
                    {member.department && ` (${member.department})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <Tag className="inline w-4 h-4 mr-1" />
                タグ
              </label>
              <input
                type="text"
                value={task.tags || ''}
                onChange={(e) => setTask(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                placeholder="カンマ区切りでタグを入力"
              />
            </div>
          </div>
        )}

        {/* 詳細タブ */}
        {showAdvanced && activeTab === 'detail' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                詳細内容
              </label>
              <textarea
                value={task.content || ''}
                onChange={(e) => setTask(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                rows={4}
                placeholder="タスクの詳細な内容、要件、実装方針など"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <Code className="inline w-4 h-4 mr-1" />
                使用技術・ツール
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('technologies', techInput)
                      setTechInput('')
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  placeholder="例: React, TypeScript, Docker"
                />
                <button
                  onClick={() => {
                    addToArray('technologies', techInput)
                    setTechInput('')
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.technologies?.map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm flex items-center gap-1"
                  >
                    {tech}
                    <button
                      onClick={() => removeFromArray('technologies', i)}
                      className="ml-1 text-purple-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <Briefcase className="inline w-4 h-4 mr-1" />
                成果物
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('deliverables', deliverableInput)
                      setDeliverableInput('')
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  placeholder="例: 設計書、ソースコード、テスト仕様書"
                />
                <button
                  onClick={() => {
                    addToArray('deliverables', deliverableInput)
                    setDeliverableInput('')
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  追加
                </button>
              </div>
              <div className="space-y-1">
                {task.deliverables?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="flex-1">{item}</span>
                    <button
                      onClick={() => removeFromArray('deliverables', i)}
                      className="text-neutral-500 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* チームタブ */}
        {showAdvanced && activeTab === 'team' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                メイン担当者
              </label>
              <select
                value={task.assignee || ''}
                onChange={(e) => setTask(prev => ({ ...prev, assignee: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              >
                <option value="">未割当</option>
                {teamMembers.filter(m => m.isActive).map(member => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                    {member.role && ` - ${member.role}`}
                    {member.department && ` (${member.department})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <Users className="inline w-4 h-4 mr-1" />
                協力者・レビュアー
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={contributorInput}
                  onChange={(e) => setContributorInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('contributors', contributorInput)
                      setContributorInput('')
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  placeholder="協力者の名前"
                />
                <button
                  onClick={() => {
                    addToArray('contributors', contributorInput)
                    setContributorInput('')
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.contributors?.map((person, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1"
                  >
                    <User size={14} />
                    {person}
                    <button
                      onClick={() => removeFromArray('contributors', i)}
                      className="ml-1 text-blue-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <Clock className="inline w-4 h-4 mr-1" />
                  実績工数 (時間)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={task.actualHours || ''}
                  onChange={(e) => setTask(prev => ({ ...prev, actualHours: parseFloat(e.target.value) || undefined }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  placeholder="実際にかかった時間"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  進捗率 (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      const status = value === 100 ? 'completed' : value > 0 ? 'in-progress' : 'pending'
                      setTask(prev => ({ ...prev, status }))
                    }}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* リスクタブ */}
        {showAdvanced && activeTab === 'risk' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <AlertTriangle className="inline w-4 h-4 mr-1" />
                リスク・課題
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={riskInput}
                  onChange={(e) => setRiskInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('risks', riskInput)
                      setRiskInput('')
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  placeholder="潜在的なリスクや課題"
                />
                <button
                  onClick={() => {
                    addToArray('risks', riskInput)
                    setRiskInput('')
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  追加
                </button>
              </div>
              <div className="space-y-2">
                {task.risks?.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="flex-1 text-sm">{risk}</span>
                    <button
                      onClick={() => removeFromArray('risks', i)}
                      className="text-neutral-500 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <Link className="inline w-4 h-4 mr-1" />
                依存タスク
              </label>
              <input
                type="text"
                value={task.dependencies?.join(', ') || ''}
                onChange={(e) => setTask(prev => ({ 
                  ...prev, 
                  dependencies: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                placeholder="カンマ区切りで依存するタスクID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                メモ・備考
              </label>
              <textarea
                value={task.notes || ''}
                onChange={(e) => setTask(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                rows={3}
                placeholder="その他の注意事項、申し送り事項など"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800">
        <div className="flex justify-between items-center">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={18} />
            削除
          </button>
          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Save size={18} />
              保存
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default TaskDetailEditor