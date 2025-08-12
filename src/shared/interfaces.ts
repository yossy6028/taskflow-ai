/**
 * より厳密な型定義のためのインターフェース
 */

import { Task, ConversationMessage, TaskBreakdownContext, TaskBreakdownResult, DependencyAnalysis } from './types';

// データベース関連の型
export interface DatabaseRow {
  [key: string]: string | number | boolean | null;
}

export interface TaskRow extends DatabaseRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  estimated_hours: number | null;
  actual_hours: number | null;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow extends DatabaseRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ConversationRow extends DatabaseRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// API レスポンスの型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface GeminiChatResponse extends ApiResponse<string> {}

export interface GeminiBreakdownResponse extends ApiResponse<TaskBreakdownResult> {}

export interface GeminiDependencyResponse extends ApiResponse<DependencyAnalysis> {}

// IPC イベントの型
export interface IpcEvent {
  sender: Electron.IpcMainInvokeEvent;
}

// サービスのインターフェース
export interface IGeminiService {
  chatWithContext(message: string, conversationHistory: ConversationMessage[]): Promise<string>;
  generateTaskBreakdown(userInput: string, context: TaskBreakdownContext): Promise<TaskBreakdownResult>;
  analyzeDependencies(tasks: Task[]): Promise<DependencyAnalysis>;
}

export interface IDatabaseService {
  createTask(task: Partial<Task>): Task;
  updateTask(id: string, updates: Partial<Task>): void;
  deleteTask(id: string): void;
  getTasks(filter?: Partial<Task>): Task[];
  getTask(id: string): Task | null;
  close(): void;
  backup(backupPath: string): void;
}

export interface IGoogleCalendarService {
  getCalendarList(): Promise<any[]>;
  createEvent(calendarId: string, event: any): Promise<any>;
  updateEvent(calendarId: string, eventId: string, updates: any): Promise<any>;
  deleteEvent(calendarId: string, eventId: string): Promise<any>;
  getEvents(calendarId: string, timeMin?: Date, timeMax?: Date): Promise<any[]>;
}

// Redux State の型
export interface RootState {
  chat: ChatState;
  tasks: TasksState;
  ui: UIState;
}

export interface ChatState {
  messages: ConversationMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
}

export interface TasksState {
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  error: string | null;
  filter: TaskFilter;
}

export interface TaskFilter {
  status?: Task['status'];
  priority?: Task['priority'];
  startDate?: string;
  endDate?: string;
  assignee?: string;
  tags?: string[];
}

export interface UIState {
  sidebarOpen: boolean;
  currentView: 'chat' | 'tasks' | 'gantt' | 'calendar';
  theme: 'light' | 'dark';
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  duration?: number;
}

// コンポーネントのProps型
export interface ChatInterfaceProps {
  onTaskGenerated?: (tasks: Task[]) => void;
}

export interface TaskListProps {
  tasks: Task[];
  onTaskSelect?: (task: Task) => void;
  onTaskUpdate?: (id: string, updates: Partial<Task>) => void;
  onTaskDelete?: (id: string) => void;
}

export interface GanttChartProps {
  tasks: Task[];
  viewMode?: 'day' | 'week' | 'month';
  onTaskUpdate?: (id: string, updates: Partial<Task>) => void;
}

// ユーティリティ型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// エラー型
export interface AppError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}