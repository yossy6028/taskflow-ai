import React, { useState, useEffect } from 'react'

type ProjectCreationModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => void
  suggestedName?: string // AI対話から提案されるプロジェクト名
}

const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({ isOpen, onClose, onCreate, suggestedName }) => {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // suggestedNameが変更されたら、nameを更新
  useEffect(() => {
    if (suggestedName && isOpen) {
      setName(suggestedName)
    }
  }, [suggestedName, isOpen])

  if (!isOpen) return null

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      setError('プロジェクト名を入力してください')
      return
    }
    if (trimmed.length > 80) {
      setError('プロジェクト名は80文字以内にしてください')
      return
    }
    onCreate(trimmed)
    setName('')
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">新しいプロジェクト</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">まずプロジェクト名を決めましょう。以降のタスクやTODOはこのプロジェクトに紐づきます。</p>
        <input
          autoFocus
          value={name}
          onChange={(e)=>{ setName(e.target.value); if (error) setError(null) }}
          placeholder="例：生成AI導入セミナー"
          className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-primary-500"
        />
        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">キャンセル</button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-primary-600 text-white">作成</button>
        </div>
      </div>
    </div>
  )
}

export default ProjectCreationModal


