// Shared type definitions between main and renderer processes

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TaskBreakdownContext {
  industry?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  resources?: string[];
  projectName?: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  category: string;
  // Enrichment fields (optional): AIによる詳細補完で設定
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
  assignee?: string;
}

export interface TaskBreakdownResult {
  tasks: GeneratedTask[];
  summary: string;
  totalEstimatedHours: number;
  suggestedDeadline: string;
  risks: string[];
  recommendations: string[];
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Database row shape returned by better-sqlite3 (snake_case columns)
export interface DBTaskRow {
  id: string;
  project_id?: string | null;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  estimated_hours?: number | null;
  actual_hours?: number | null;
  assignee?: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
  dependencies?: string[];
}

export interface DependencyAnalysis {
  optimizedOrder: string[];
  criticalPath: string[];
  parallelizable: string[][];
  bottlenecks: string[];
  recommendations: string[];
}

export interface ElectronAPI {
  // Gemini AI APIs - 実装済み
  geminiChat: (prompt: string, conversationHistory?: ConversationMessage[]) => 
    Promise<{ success: boolean; message: string }>;
  geminiBreakdown: (userInput: string, context?: TaskBreakdownContext) => 
    Promise<{ success: boolean; data?: TaskBreakdownResult; message?: string }>;
  geminiAnalyzeDependencies: (tasks: Task[]) => 
    Promise<{ success: boolean; data?: DependencyAnalysis; message?: string }>;
  geminiBreakdownEnriched: (userInput: string, context?: TaskBreakdownContext) =>
    Promise<{ success: boolean; data?: TaskBreakdownResult; message?: string }>;
  geminiBreakdownTask: (params: { title: string; targetCount?: number }) =>
    Promise<{ success: boolean; data?: { todos: Array<{ title: string; description: string }> }; message?: string }>;
  
  // DB APIs
  dbGetTasks: (filter?: Partial<Task>) => Promise<{ success: boolean; data?: DBTaskRow[]; message?: string }>;
  dbCreateTask: (task: Partial<Task>) => Promise<{ success: boolean; data?: Task; message?: string }>;
  dbUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ success: boolean; message?: string }>;
  dbDeleteTask: (id: string) => Promise<{ success: boolean; message?: string }>;
  
  // Future implementations - コメントアウト
  // dbQuery: (query: string, params: any[]) => Promise<{ success: boolean; data: any[] }>;
  // selectFile: () => Promise<string | null>;
  // saveFile: (data: any) => Promise<boolean>;
  
  // System info - 読み取り専用
  platform: string;
  version: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}