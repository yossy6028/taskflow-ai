import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Project {
  id: string
  name: string
  description?: string
  color: string // プロジェクトの識別色
  icon?: string // アイコン名またはEmoji
  startDate: Date
  endDate?: Date
  status: 'active' | 'completed' | 'archived' | 'planning'
  owner: string // プロジェクトオーナー
  members: string[] // プロジェクトメンバーのID
  createdAt: Date
  updatedAt: Date
  settings?: {
    isPublic?: boolean
    allowGuestAccess?: boolean
    defaultView?: 'tasks' | 'gantt' | 'calendar'
  }
}

export interface ProjectsState {
  projects: Project[]
  currentProjectId: string | null
  loading: boolean
  error: string | null
}

// デフォルトプロジェクト
export const createDefaultProject = (): Project => ({
  id: 'default',
  name: 'デフォルトプロジェクト',
  description: '全般的なタスクを管理するプロジェクト',
  color: '#3B82F6',
  icon: '📁',
  startDate: new Date(),
  status: 'active',
  owner: '自分',
  members: ['自分'],
  createdAt: new Date(),
  updatedAt: new Date()
})

const defaultProject = createDefaultProject()

const initialState: ProjectsState = {
  projects: [defaultProject],
  currentProjectId: 'default',
  loading: false,
  error: null
}

// LocalStorageから初期データを読み込み
const loadFromLocalStorage = (): ProjectsState => {
  try {
    const saved = localStorage.getItem('taskflow-projects')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Date型の復元
      parsed.projects = parsed.projects.map((p: any) => ({
        ...p,
        startDate: new Date(p.startDate),
        endDate: p.endDate ? new Date(p.endDate) : undefined,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }))
      return {
        ...initialState,
        ...parsed
      }
    }
  } catch (error) {
    console.error('Failed to load projects from localStorage:', error)
  }
  return initialState
}

// LocalStorageに保存
const saveToLocalStorage = (state: ProjectsState) => {
  try {
    localStorage.setItem('taskflow-projects', JSON.stringify({
      projects: state.projects,
      currentProjectId: state.currentProjectId
    }))
  } catch (error) {
    console.error('Failed to save projects to localStorage:', error)
  }
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState: loadFromLocalStorage(),
  reducers: {
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload
      state.error = null
      saveToLocalStorage(state)
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload)
      saveToLocalStorage(state)
    },
    updateProject: (state, action: PayloadAction<{ id: string; updates: Partial<Project> }>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id)
      if (index >= 0) {
        state.projects[index] = {
          ...state.projects[index],
          ...action.payload.updates,
          updatedAt: new Date()
        }
        saveToLocalStorage(state)
      }
    },
    deleteProject: (state, action: PayloadAction<string>) => {
      // デフォルトプロジェクトは削除できない
      if (action.payload === 'default') return
      
      state.projects = state.projects.filter(p => p.id !== action.payload)
      
      // 削除されたプロジェクトが現在のプロジェクトだった場合
      if (state.currentProjectId === action.payload) {
        state.currentProjectId = 'default'
      }
      saveToLocalStorage(state)
    },
    setCurrentProject: (state, action: PayloadAction<string>) => {
      const project = state.projects.find(p => p.id === action.payload)
      if (project) {
        state.currentProjectId = action.payload
        saveToLocalStorage(state)
      }
    },
    archiveProject: (state, action: PayloadAction<string>) => {
      const project = state.projects.find(p => p.id === action.payload)
      if (project && project.id !== 'default') {
        project.status = 'archived'
        project.updatedAt = new Date()
        saveToLocalStorage(state)
      }
    },
    completeProject: (state, action: PayloadAction<string>) => {
      const project = state.projects.find(p => p.id === action.payload)
      if (project) {
        project.status = 'completed'
        project.endDate = new Date()
        project.updatedAt = new Date()
        saveToLocalStorage(state)
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

export const {
  setProjects,
  addProject,
  updateProject,
  deleteProject,
  setCurrentProject,
  archiveProject,
  completeProject,
  setLoading,
  setError
} = projectsSlice.actions

export default projectsSlice.reducer
