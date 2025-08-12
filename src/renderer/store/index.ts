import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import tasksReducer from './slices/tasksSlice';
import uiReducer from './slices/uiSlice';
import teamReducer from './slices/teamSlice';
import todosReducer, { saveTodosToLocalStorage } from './slices/todosSlice';
import projectsReducer from './slices/projectsSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    tasks: tasksReducer,
    ui: uiReducer,
    team: teamReducer,
    todos: todosReducer,
    projects: projectsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['todos/setTodos', 'todos/addTodo', 'todos/updateTodo', 'todos/setTodosForTask'],
        ignoredPaths: ['todos.todos']
      }
    })
});

// TODOの変更を監視してLocalStorageに保存
store.subscribe(() => {
  const state = store.getState();
  saveTodosToLocalStorage(state.todos.todos);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;