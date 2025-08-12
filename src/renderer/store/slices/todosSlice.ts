import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Todo {
  id: string
  taskId: string // 親タスクのID
  title: string
  description?: string
  completed: boolean
  order: number // 表示順序
  createdAt: Date
  completedAt?: Date
}

export interface TodosState {
  todos: Todo[]
  loading: boolean
  error: string | null
}

// LocalStorageから初期データを読み込み
const loadTodosFromLocalStorage = (): Todo[] => {
  try {
    const stored = localStorage.getItem('taskflow-todos')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Date型を復元
      return parsed.map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined
      }))
    }
  } catch (error) {
    console.error('Failed to load todos from localStorage:', error)
  }
  return []
}

const initialState: TodosState = {
  todos: loadTodosFromLocalStorage(),
  loading: false,
  error: null
}

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    setTodos: (state, action: PayloadAction<Todo[]>) => {
      state.todos = action.payload
      state.error = null
    },
    addTodo: (state, action: PayloadAction<Todo>) => {
      state.todos.push(action.payload)
    },
    updateTodo: (state, action: PayloadAction<{ id: string; updates: Partial<Todo> }>) => {
      const index = state.todos.findIndex(t => t.id === action.payload.id)
      if (index >= 0) {
        state.todos[index] = { ...state.todos[index], ...action.payload.updates }
      }
    },
    deleteTodo: (state, action: PayloadAction<string>) => {
      state.todos = state.todos.filter(t => t.id !== action.payload)
    },
    toggleTodoComplete: (state, action: PayloadAction<string>) => {
      const todo = state.todos.find(t => t.id === action.payload)
      if (todo) {
        todo.completed = !todo.completed
        todo.completedAt = todo.completed ? new Date() : undefined
      }
    },
    setTodosForTask: (state, action: PayloadAction<{ taskId: string; todos: Todo[] }>) => {
      // 特定タスクのTODOを更新
      state.todos = [
        ...state.todos.filter(t => t.taskId !== action.payload.taskId),
        ...action.payload.todos
      ]
    },
    clearTodosForTask: (state, action: PayloadAction<string>) => {
      state.todos = state.todos.filter(t => t.taskId !== action.payload)
    },
    reorderTodos: (state, action: PayloadAction<{ taskId: string; fromIndex: number; toIndex: number }>) => {
      const { taskId, fromIndex, toIndex } = action.payload
      const taskTodos = state.todos.filter(t => t.taskId === taskId).sort((a, b) => a.order - b.order)
      const otherTodos = state.todos.filter(t => t.taskId !== taskId)
      
      if (fromIndex >= 0 && fromIndex < taskTodos.length && toIndex >= 0 && toIndex < taskTodos.length) {
        const [removed] = taskTodos.splice(fromIndex, 1)
        taskTodos.splice(toIndex, 0, removed)
        
        // 順序を更新
        taskTodos.forEach((todo, index) => {
          todo.order = index
        })
        
        state.todos = [...otherTodos, ...taskTodos]
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
  setTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodoComplete,
  setTodosForTask,
  clearTodosForTask,
  reorderTodos,
  setLoading,
  setError
} = todosSlice.actions

// LocalStorageへの保存を行うミドルウェア
export const saveTodosToLocalStorage = (todos: Todo[]) => {
  try {
    localStorage.setItem('taskflow-todos', JSON.stringify(todos))
  } catch (error) {
    console.error('Failed to save todos to localStorage:', error)
  }
}

export default todosSlice.reducer