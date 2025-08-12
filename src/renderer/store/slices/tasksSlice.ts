import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Task {
  id: string;
  projectId?: string; // プロジェクトID追加
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'completed';
  estimatedHours: number;
  actualHours?: number;
  assignee?: string;
  tags: string[];
}

export interface TasksState {
  tasks: Task[];
  selectedTaskId: string | null;
  filter: {
    status: string;
    priority: string;
    tags: string[];
  };
}

const initialState: TasksState = {
  tasks: [],
  selectedTaskId: null,
  filter: {
    status: 'all',
    priority: 'all',
    tags: [],
  },
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    },
    setSelectedTask: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    setFilter: (state, action: PayloadAction<Partial<TasksState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },
  },
});

export const { addTask, updateTask, deleteTask, setSelectedTask, setFilter, setTasks } = tasksSlice.actions;
export default tasksSlice.reducer;