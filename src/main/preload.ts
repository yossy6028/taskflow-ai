import { contextBridge, ipcRenderer } from 'electron';
import type { ConversationMessage, TaskBreakdownContext, Task } from '../shared/types';

// Expose protected APIs to the renderer process
// Only expose implemented and validated APIs
contextBridge.exposeInMainWorld('electronAPI', {
  // Gemini AI API - 実装済み
  geminiChat: (prompt: string, conversationHistory?: ConversationMessage[]) => 
    ipcRenderer.invoke('gemini:chat', prompt, conversationHistory),
  geminiBreakdown: (userInput: string, context?: TaskBreakdownContext) => 
    ipcRenderer.invoke('gemini:breakdown', userInput, context),
  geminiBreakdownEnriched: (userInput: string, context?: TaskBreakdownContext) =>
    ipcRenderer.invoke('gemini:breakdown-enriched', userInput, context),
  geminiAnalyzeDependencies: (tasks: Task[]) => 
    ipcRenderer.invoke('gemini:analyze-dependencies', tasks),
  geminiBreakdownTask: (params: any) =>
    ipcRenderer.invoke('gemini:breakdown-task', params),
  
  // Database operations - 追加
  dbGetTasks: (filter?: Partial<Task>) => ipcRenderer.invoke('db:getTasks', filter),
  dbCreateTask: (task: Partial<Task>) => ipcRenderer.invoke('db:createTask', task),
  dbUpdateTask: (id: string, updates: Partial<Task>) => ipcRenderer.invoke('db:updateTask', id, updates),
  dbDeleteTask: (id: string) => ipcRenderer.invoke('db:deleteTask', id),
  
  // Database operations - 実装予定
  // dbQuery: (query: string, params: any[]) => ipcRenderer.invoke('db:query', query, params),
  
  // File operations - 未実装のため削除
  // selectFile: () => ipcRenderer.invoke('dialog:openFile'),
  // saveFile: (data: any) => ipcRenderer.invoke('dialog:saveFile', data),
  
  // System info - 安全な読み取り専用情報
  platform: process.platform,
  version: process.versions.electron,
});