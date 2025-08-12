import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  MessageSquare,
  CheckSquare,
  BarChart3,
  Calendar,
  Rocket,
  Target,
  Users,
  Zap,
  Award,
  Check
} from 'lucide-react'

interface OnboardingFlowProps {
  onComplete: () => void
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [userData, setUserData] = useState({
    name: '',
    role: '',
    projectType: '',
    teamSize: '',
    deadline: '',
    goals: []
  })

  const steps = [
    {
      id: 'welcome',
      title: 'TaskFlow AIへようこそ！',
      subtitle: 'AIがあなたのアイデアを実現可能なタスクに変換します',
      icon: Sparkles,
      gradient: 'from-primary-500 to-secondary-500'
    },
    {
      id: 'profile',
      title: 'あなたについて教えてください',
      subtitle: '最適なサポートのために、いくつか質問させてください',
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'project',
      title: 'プロジェクトの詳細',
      subtitle: 'どのようなプロジェクトに取り組みますか？',
      icon: Target,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'workflow',
      title: 'ワークフローの選択',
      subtitle: 'あなたに最適な作業スタイルを選びましょう',
      icon: Zap,
      gradient: 'from-orange-500 to-red-500'
    },
    {
      id: 'complete',
      title: '準備完了！',
      subtitle: '素晴らしいプロジェクトを始めましょう',
      icon: Rocket,
      gradient: 'from-green-500 to-emerald-500'
    }
  ]

  const projectTypes = [
    { id: 'web', label: 'Webサービス開発', icon: '🌐', description: 'ウェブアプリケーションやサイト制作' },
    { id: 'mobile', label: 'モバイルアプリ', icon: '📱', description: 'iOS/Androidアプリ開発' },
    { id: 'marketing', label: 'マーケティング', icon: '📈', description: 'マーケティング戦略や施策' },
    { id: 'event', label: 'イベント企画', icon: '🎉', description: 'イベントの企画・運営' },
    { id: 'content', label: 'コンテンツ制作', icon: '✍️', description: 'ブログや動画などのコンテンツ' },
    { id: 'business', label: 'ビジネス改善', icon: '💼', description: '業務プロセスの最適化' }
  ]

  const workflowStyles = [
    { 
      id: 'agile', 
      label: 'アジャイル型', 
      icon: '🔄', 
      description: '短期間のスプリントで柔軟に進行',
      features: ['2週間スプリント', '定期的なレビュー', '柔軟な変更対応']
    },
    { 
      id: 'waterfall', 
      label: 'ウォーターフォール型', 
      icon: '🌊', 
      description: '段階的に確実に進行',
      features: ['明確なフェーズ分け', '詳細な計画', '予測可能な進行']
    },
    { 
      id: 'kanban', 
      label: 'カンバン型', 
      icon: '📋', 
      description: '継続的なフローで効率的に',
      features: ['ビジュアル管理', 'WIP制限', '継続的改善']
    },
    { 
      id: 'hybrid', 
      label: 'ハイブリッド型', 
      icon: '🎯', 
      description: '状況に応じて柔軟に選択',
      features: ['カスタマイズ可能', 'ベストプラクティス', 'AI最適化']
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]
  const StepIcon = currentStepData.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 grid-pattern" />
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-200 dark:bg-neutral-800">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="relative w-full max-w-4xl mx-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Step Header */}
            <div className={`relative h-48 bg-gradient-to-br ${currentStepData.gradient} p-8 text-white`}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <StepIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                      <p className="text-white/90">{currentStepData.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/70">ステップ</p>
                    <p className="text-2xl font-bold">{currentStep + 1}/{steps.length}</p>
                  </div>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center gap-2 mt-8">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentStep 
                          ? 'w-8 bg-white' 
                          : index < currentStep 
                          ? 'w-2 bg-white/60' 
                          : 'w-2 bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="p-8">
              {currentStep === 0 && (
                <div className="text-center py-8">
                  <div className="mb-8">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">AIパワードタスク管理の新時代へ</h3>
                    <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                      TaskFlow AIは、あなたの漠然としたアイデアを具体的で実行可能なタスクに変換し、
                      効率的なプロジェクト管理を実現します。
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">AI対話</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">タスク生成</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">ガントチャート</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">カレンダー連携</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      お名前
                    </label>
                    <input
                      type="text"
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      placeholder="山田 太郎"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      役職・職種
                    </label>
                    <input
                      type="text"
                      value={userData.role}
                      onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                      placeholder="プロジェクトマネージャー"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      チーム規模
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {['個人', '2-5人', '6-10人', '11人以上'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setUserData({ ...userData, teamSize: size })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                            userData.teamSize === size
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                              : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                      プロジェクトタイプを選択
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {projectTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setUserData({ ...userData, projectType: type.id })}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            userData.projectType === type.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{type.icon}</span>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                {type.label}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      プロジェクト期限
                    </label>
                    <input
                      type="date"
                      value={userData.deadline}
                      onChange={(e) => setUserData({ ...userData, deadline: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 outline-none"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                      ワークフロースタイルを選択
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {workflowStyles.map((style) => (
                        <div
                          key={style.id}
                          className="relative p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-2xl">{style.icon}</span>
                            <div>
                              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                                {style.label}
                              </h4>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                {style.description}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {style.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                                <Check className="w-3 h-3 text-success-500" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="text-center py-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900/30 dark:to-success-800/30 flex items-center justify-center">
                    <Award className="w-12 h-12 text-success-600 dark:text-success-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">すべての準備が整いました！</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
                    TaskFlow AIがあなたのプロジェクトを成功に導きます。
                    まずはAIとの対話から始めましょう。
                  </p>
                  
                  <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl p-6 max-w-md mx-auto">
                    <h4 className="font-semibold mb-3">次のステップ:</h4>
                    <div className="space-y-2 text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-medium">
                          1
                        </div>
                        <span className="text-sm">AIにプロジェクトのアイデアを伝える</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-medium">
                          2
                        </div>
                        <span className="text-sm">5-10回の対話で詳細を具体化</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-medium">
                          3
                        </div>
                        <span className="text-sm">自動生成されたタスクを確認・調整</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="px-8 pb-8 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  currentStep === 0
                    ? 'text-neutral-400 cursor-not-allowed'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <ChevronLeft size={18} />
                <span>戻る</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 group"
              >
                <span>{currentStep === steps.length - 1 ? '始める' : '次へ'}</span>
                {currentStep === steps.length - 1 ? (
                  <Rocket size={18} className="group-hover:translate-x-1 transition-transform" />
                ) : (
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip Button */}
        <button
          onClick={onComplete}
          className="absolute top-8 right-8 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors text-sm"
        >
          スキップ →
        </button>
      </div>
    </div>
  )
}

export default OnboardingFlow