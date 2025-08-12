import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

export interface UIState {
  isDarkMode: boolean;
  sidebarCollapsed: boolean;
  activeView: 'chat' | 'tasks' | 'gantt' | 'calendar';
  notifications: Notification[];
}

const initialState: UIState = {
  isDarkMode: false,
  sidebarCollapsed: false,
  activeView: 'chat',
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setActiveView: (state, action: PayloadAction<UIState['activeView']>) => {
      state.activeView = action.payload;
    },
    addNotification: (state, action: PayloadAction<UIState['notifications'][0]>) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
});

export const { toggleDarkMode, toggleSidebar, setActiveView, addNotification, removeNotification } = uiSlice.actions;
export default uiSlice.reducer;