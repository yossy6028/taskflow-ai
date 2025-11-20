import type { Project } from '../store/slices/projectsSlice'
import { storage } from './platform'

const toDate = (value: any, fallback?: Date): Date => {
  if (!value) return fallback ? new Date(fallback) : new Date()
  try {
    return new Date(value)
  } catch {
    return fallback ? new Date(fallback) : new Date()
  }
}

const serializeDate = (value?: Date | string) => {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : value
}

export const normalizeProjectFromCloud = (raw: any): Project => ({
  id: raw?.id || `project-${Date.now()}`,
  name: raw?.name || '新規プロジェクト',
  description: raw?.description || '',
  color: raw?.color || '#3B82F6',
  icon: raw?.icon || '📁',
  startDate: toDate(raw?.startDate),
  endDate: raw?.endDate ? new Date(raw.endDate) : undefined,
  status: raw?.status || 'active',
  owner: raw?.owner || '自分',
  members: Array.isArray(raw?.members) && raw.members.length > 0 ? raw.members : ['自分'],
  createdAt: toDate(raw?.createdAt),
  updatedAt: toDate(raw?.updatedAt),
  settings: raw?.settings
})

const serializeProjectForCloud = (project: Project) => ({
  ...project,
  startDate: serializeDate(project.startDate),
  endDate: serializeDate(project.endDate),
  createdAt: serializeDate(project.createdAt),
  updatedAt: serializeDate(project.updatedAt)
})

export const persistProjectToCloud = async (project: Project) => {
  try {
    const payload = serializeProjectForCloud(project)
    const result = await storage.saveProject(payload)
    if (!result?.success) {
      console.warn('⚠️ Firebase: プロジェクト保存に失敗しました', result?.error)
    }
  } catch (error) {
    console.error('❌ Firebase: プロジェクト保存中にエラーが発生しました', error)
  }
}

export const fetchProjectsFromCloud = async (): Promise<Project[]> => {
  try {
    const res = await storage.getProjects()
    if (res.success && Array.isArray(res.data)) {
      return res.data
        .filter(Boolean)
        .map(normalizeProjectFromCloud)
    }
  } catch (error) {
    console.error('❌ Firebase: プロジェクト取得に失敗しました', error)
  }
  return []
}
