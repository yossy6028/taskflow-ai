import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  Save,
  X,
  Edit3,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Star,
  Check
} from 'lucide-react'

export interface TeamMember {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  department?: string
  skills?: string[]
  isActive: boolean
  color?: string // 表示用の色
}

interface TeamMemberManagerProps {
  isOpen: boolean
  onClose: () => void
  members: TeamMember[]
  onSave: (members: TeamMember[]) => void
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
]

const TeamMemberManager: React.FC<TeamMemberManagerProps> = ({
  isOpen,
  onClose,
  members: initialMembers,
  onSave
}) => {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({
    name: '',
    email: '',
    role: '',
    department: '',
    isActive: true
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  const handleAddMember = () => {
    if (!newMember.name?.trim()) return

    const member: TeamMember = {
      id: `member-${Date.now()}`,
      name: newMember.name.trim(),
      email: newMember.email?.trim(),
      phone: newMember.phone?.trim(),
      role: newMember.role?.trim(),
      department: newMember.department?.trim(),
      skills: newMember.skills || [],
      isActive: true,
      color: PRESET_COLORS[members.length % PRESET_COLORS.length]
    }

    setMembers(prev => [...prev, member])
    setNewMember({
      name: '',
      email: '',
      role: '',
      department: '',
      isActive: true
    })
    setShowAddForm(false)
  }

  const handleUpdateMember = (id: string, updates: Partial<TeamMember>) => {
    setMembers(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ))
  }

  const handleDeleteMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const handleSave = () => {
    onSave(members)
    onClose()
  }

  const addSkillToMember = (memberId: string, skill: string) => {
    if (!skill.trim()) return
    
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const currentSkills = m.skills || []
        if (!currentSkills.includes(skill.trim())) {
          return { ...m, skills: [...currentSkills, skill.trim()] }
        }
      }
      return m
    }))
  }

  const removeSkillFromMember = (memberId: string, skillIndex: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId && m.skills) {
        return { ...m, skills: m.skills.filter((_, i) => i !== skillIndex) }
      }
      return m
    }))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">チームメンバー管理</h2>
                  <p className="text-white/80 text-sm">タスクの担当者を登録・管理</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(80vh-180px)] overflow-y-auto">
            {/* Add Member Button */}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mb-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <UserPlus size={20} />
                新しいメンバーを追加
              </button>
            )}

            {/* Add Member Form */}
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <UserPlus size={20} />
                  新規メンバー登録
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      名前 *
                    </label>
                    <input
                      type="text"
                      value={newMember.name || ''}
                      onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      placeholder="山田 太郎"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={newMember.email || ''}
                      onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      placeholder="yamada@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      役職
                    </label>
                    <input
                      type="text"
                      value={newMember.role || ''}
                      onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      placeholder="プロジェクトマネージャー"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      部署
                    </label>
                    <input
                      type="text"
                      value={newMember.department || ''}
                      onChange={(e) => setNewMember(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      placeholder="開発部"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setNewMember({
                        name: '',
                        email: '',
                        role: '',
                        department: '',
                        isActive: true
                      })
                    }}
                    className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={!newMember.name?.trim()}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    追加
                  </button>
                </div>
              </motion.div>
            )}

            {/* Members List */}
            <div className="space-y-3">
              {members.map(member => (
                <motion.div
                  key={member.id}
                  layout
                  className={`p-4 rounded-lg border transition-all ${
                    member.isActive
                      ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 opacity-60'
                  }`}
                >
                  {editingId === member.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleUpdateMember(member.id, { name: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                          placeholder="名前"
                        />
                        <input
                          type="email"
                          value={member.email || ''}
                          onChange={(e) => handleUpdateMember(member.id, { email: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                          placeholder="メール"
                        />
                        <input
                          type="text"
                          value={member.role || ''}
                          onChange={(e) => handleUpdateMember(member.id, { role: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                          placeholder="役職"
                        />
                        <input
                          type="text"
                          value={member.department || ''}
                          onChange={(e) => handleUpdateMember(member.id, { department: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                          placeholder="部署"
                        />
                      </div>
                      
                      {/* Skills */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          スキル
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addSkillToMember(member.id, skillInput)
                                setSkillInput('')
                              }
                            }}
                            className="flex-1 px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                            placeholder="スキルを追加"
                          />
                          <button
                            onClick={() => {
                              addSkillToMember(member.id, skillInput)
                              setSkillInput('')
                            }}
                            className="px-3 py-1 bg-primary-500 text-white rounded-lg text-sm"
                          >
                            追加
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {member.skills?.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs flex items-center gap-1"
                            >
                              {skill}
                              <button
                                onClick={() => removeSkillFromMember(member.id, i)}
                                className="text-blue-500 hover:text-red-500"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-primary-500 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <Check size={16} />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: member.color || PRESET_COLORS[0] }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {member.name}
                            </h4>
                            {!member.isActive && (
                              <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-full text-xs">
                                非アクティブ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                            {member.role && (
                              <span className="flex items-center gap-1">
                                <Briefcase size={14} />
                                {member.role}
                              </span>
                            )}
                            {member.department && (
                              <span>{member.department}</span>
                            )}
                            {member.email && (
                              <span className="flex items-center gap-1">
                                <Mail size={14} />
                                {member.email}
                              </span>
                            )}
                          </div>
                          {member.skills && member.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.skills.map((skill, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateMember(member.id, { isActive: !member.isActive })}
                          className={`p-2 rounded-lg transition-colors ${
                            member.isActive
                              ? 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                              : 'hover:bg-green-100 dark:hover:bg-green-900/20'
                          }`}
                          title={member.isActive ? '非アクティブにする' : 'アクティブにする'}
                        >
                          <Star size={18} className={member.isActive ? 'text-yellow-500' : 'text-neutral-400'} />
                        </button>
                        <button
                          onClick={() => setEditingId(member.id)}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {members.length === 0 && (
              <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>まだメンバーが登録されていません</p>
                <p className="text-sm mt-1">上のボタンから新しいメンバーを追加してください</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {members.filter(m => m.isActive).length} / {members.length} 人のアクティブメンバー
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
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
      </motion.div>
    </AnimatePresence>
  )
}

export default TeamMemberManager