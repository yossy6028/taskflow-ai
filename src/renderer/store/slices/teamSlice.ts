import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { TeamMember } from '../../components/Settings/TeamMemberManager'

export interface TeamState {
  members: TeamMember[]
}

const initialState: TeamState = {
  members: [
    {
      id: 'default-1',
      name: '自分',
      email: '',
      role: 'プロジェクトオーナー',
      department: '',
      skills: [],
      isActive: true,
      color: '#3B82F6'
    }
  ]
}

// LocalStorageから初期データを読み込み
const loadFromLocalStorage = (): TeamState => {
  try {
    const saved = localStorage.getItem('taskflow-team-members')
    if (saved) {
      const parsed = JSON.parse(saved)
      return { members: parsed }
    }
  } catch (error) {
    console.error('Failed to load team members from localStorage:', error)
  }
  return initialState
}

// LocalStorageに保存
const saveToLocalStorage = (members: TeamMember[]) => {
  try {
    localStorage.setItem('taskflow-team-members', JSON.stringify(members))
  } catch (error) {
    console.error('Failed to save team members to localStorage:', error)
  }
}

const teamSlice = createSlice({
  name: 'team',
  initialState: loadFromLocalStorage(),
  reducers: {
    setTeamMembers: (state, action: PayloadAction<TeamMember[]>) => {
      state.members = action.payload
      saveToLocalStorage(action.payload)
    },
    addTeamMember: (state, action: PayloadAction<TeamMember>) => {
      state.members.push(action.payload)
      saveToLocalStorage(state.members)
    },
    updateTeamMember: (state, action: PayloadAction<{ id: string; updates: Partial<TeamMember> }>) => {
      const index = state.members.findIndex(m => m.id === action.payload.id)
      if (index >= 0) {
        state.members[index] = { ...state.members[index], ...action.payload.updates }
        saveToLocalStorage(state.members)
      }
    },
    deleteTeamMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter(m => m.id !== action.payload)
      saveToLocalStorage(state.members)
    }
  }
})

export const { setTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = teamSlice.actions
export default teamSlice.reducer