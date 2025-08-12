import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  AlertCircle, 
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Target,
  ListChecks,
  User
} from 'lucide-react'

interface TaskPlanningRequirements {
  taskCount?: number
  assigneeCount?: number
  projectDuration?: string
  priority?: 'low' | 'medium' | 'high'
  complexity?: 'simple' | 'moderate' | 'complex'
  mainGoal?: string
  goalDate?: string
  constraints?: string[]
  teamMembers?: string[]
  checkCalendar?: boolean
}

interface TaskPlanningDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (requirements: TaskPlanningRequirements) => void
  initialInput?: string
}

const TaskPlanningDialog: React.FC<TaskPlanningDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialInput = ''
}) => {
  const [step, setStep] = useState(1)
  const [requirements, setRequirements] = useState<TaskPlanningRequirements>({
    taskCount: undefined,
    assigneeCount: undefined,
    projectDuration: '',
    priority: 'medium',
    complexity: 'moderate',
    mainGoal: initialInput,
    goalDate: '',
    constraints: [],
    teamMembers: [],
    checkCalendar: true
  })
  const [constraintInput, setConstraintInput] = useState('')
  const [teamMemberInput, setTeamMemberInput] = useState('')

  const totalSteps = 4

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleConfirm = () => {
    onConfirm(requirements)
  }

  const addConstraint = () => {
    if (constraintInput.trim()) {
      setRequirements(prev => ({
        ...prev,
        constraints: [...(prev.constraints || []), constraintInput.trim()]
      }))
      setConstraintInput('')
    }
  }

  const removeConstraint = (index: number) => {
    setRequirements(prev => ({
      ...prev,
      constraints: prev.constraints?.filter((_, i) => i !== index) || []
    }))
  }

  const addTeamMember = () => {
    if (teamMemberInput.trim()) {
      setRequirements(prev => ({
        ...prev,
        teamMembers: [...(prev.teamMembers || []), teamMemberInput.trim()]
      }))
      setTeamMemberInput('')
    }
  }

  const removeTeamMember = (index: number) => {
    setRequirements(prev => ({
      ...prev,
      teamMembers: prev.teamMembers?.filter((_, i) => i !== index) || []
    }))
  }

  const isStepValid = () => {
    switch (step) {
      case 1:
        return requirements.mainGoal && requirements.mainGoal.trim().length > 0
      case 2:
        return requirements.taskCount && requirements.taskCount > 0
      case 3:
        return true // Optional step
      case 4:
        return true // Review step always valid
      default:
        return false
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              タスク計画の詳細設定
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              プロジェクトに最適なタスクを生成するため、いくつか質問させてください
            </p>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-neutral-500">ステップ {step}/{totalSteps}</span>
                <span className="text-sm text-neutral-500">{Math.round((step / totalSteps) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                  animate={{ width: `${(step / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="min-h-[300px] mb-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Main Goal */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-lg font-semibold">プロジェクトの目標</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      このプロジェクトで達成したい主な目標は何ですか？
                    </label>
                    <textarea
                      value={requirements.mainGoal}
                      onChange={(e) => setRequirements(prev => ({ ...prev, mainGoal: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      rows={4}
                      placeholder="例: 新しいWebサービスのMVPを3ヶ月で開発する"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        優先度
                      </label>
                      <select
                        value={requirements.priority}
                        onChange={(e) => setRequirements(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      >
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        複雑度
                      </label>
                      <select
                        value={requirements.complexity}
                        onChange={(e) => setRequirements(prev => ({ ...prev, complexity: e.target.value as any }))}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      >
                        <option value="simple">シンプル</option>
                        <option value="moderate">標準</option>
                        <option value="complex">複雑</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Task Details */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                      <ListChecks className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
                    </div>
                    <h3 className="text-lg font-semibold">タスクの規模</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      想定するタスクの数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={requirements.taskCount || ''}
                      onChange={(e) => setRequirements(prev => ({ ...prev, taskCount: parseInt(e.target.value) || undefined }))}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500"
                      placeholder="例: 10"
                    />
                    <p className="text-sm text-neutral-500 mt-1">
                      AIが提案するタスクの目安数です（後で調整可能）
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        プロジェクト期間
                      </label>
                      <input
                        type="text"
                        value={requirements.projectDuration}
                        onChange={(e) => setRequirements(prev => ({ ...prev, projectDuration: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                        placeholder="例: 3ヶ月、2週間"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        ゴール日程
                      </label>
                      <input
                        type="date"
                        value={requirements.goalDate}
                        onChange={(e) => setRequirements(prev => ({ ...prev, goalDate: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <input
                      type="checkbox"
                      id="checkCalendar"
                      checked={requirements.checkCalendar}
                      onChange={(e) => setRequirements(prev => ({ ...prev, checkCalendar: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="checkCalendar" className="text-sm text-neutral-700 dark:text-neutral-300">
                      Googleカレンダーの予定を確認して、空き時間に基づいてタスクをスケジュール
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      制約条件（任意）
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={constraintInput}
                        onChange={(e) => setConstraintInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addConstraint()}
                        className="flex-1 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                        placeholder="例: 予算10万円以内"
                      />
                      <button
                        onClick={addConstraint}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        追加
                      </button>
                    </div>
                    {requirements.constraints && requirements.constraints.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requirements.constraints.map((constraint, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm flex items-center gap-1"
                          >
                            {constraint}
                            <button
                              onClick={() => removeConstraint(index)}
                              className="ml-1 text-neutral-500 hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Team */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold">チーム構成</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      担当者の人数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={requirements.assigneeCount || ''}
                      onChange={(e) => setRequirements(prev => ({ ...prev, assigneeCount: parseInt(e.target.value) || undefined }))}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      placeholder="例: 5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      チームメンバー（任意）
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={teamMemberInput}
                        onChange={(e) => setTeamMemberInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTeamMember()}
                        className="flex-1 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                        placeholder="メンバー名を入力"
                      />
                      <button
                        onClick={addTeamMember}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        追加
                      </button>
                    </div>
                    {requirements.teamMembers && requirements.teamMembers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requirements.teamMembers.map((member, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm flex items-center gap-1"
                          >
                            <User size={14} />
                            {member}
                            <button
                              onClick={() => removeTeamMember(index)}
                              className="ml-1 text-neutral-500 hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold">確認</h3>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-neutral-500">目標:</span>
                      <p className="font-medium">{requirements.mainGoal || '未設定'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-neutral-500">タスク数:</span>
                        <p className="font-medium">{requirements.taskCount || '未設定'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-neutral-500">担当者数:</span>
                        <p className="font-medium">{requirements.assigneeCount || '未設定'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-neutral-500">期間:</span>
                        <p className="font-medium">{requirements.projectDuration || '未設定'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-neutral-500">ゴール日:</span>
                        <p className="font-medium">{requirements.goalDate || '未設定'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-neutral-500">優先度:</span>
                        <p className="font-medium">
                          {requirements.priority === 'high' ? '高' : requirements.priority === 'medium' ? '中' : '低'}
                        </p>
                      </div>
                    </div>

                    {requirements.constraints && requirements.constraints.length > 0 && (
                      <div>
                        <span className="text-sm text-neutral-500">制約条件:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {requirements.constraints.map((c, i) => (
                            <span key={i} className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded text-sm">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {requirements.teamMembers && requirements.teamMembers.length > 0 && (
                      <div>
                        <span className="text-sm text-neutral-500">チームメンバー:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {requirements.teamMembers.map((m, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-sm">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {requirements.checkCalendar && (
                      <div>
                        <span className="text-sm text-neutral-500">カレンダー連携:</span>
                        <p className="font-medium text-green-600 dark:text-green-400">有効</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      {requirements.checkCalendar 
                        ? 'Googleカレンダーの予定を確認し、ゴール日程から逆算してタスク案を生成します。'
                        : 'この情報を基にAIがタスク案を生成します。生成後も編集可能です。'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              キャンセル
            </button>
            
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  <ChevronLeft size={18} />
                  戻る
                </button>
              )}
              
              {step < totalSteps ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  次へ
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={!isStepValid()}
                  className="px-6 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  タスク案を生成
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TaskPlanningDialog