// グローバル型定義

interface Window {
  electronAPI?: {
    dbGetTasks: (params?: { projectId?: string }) => Promise<any>;
    dbSaveTask: (task: any) => Promise<any>;
    dbGetProjects: () => Promise<any>;
    dbSaveProject: (project: any) => Promise<any>;
    dbGetChatHistory: (conversationId: string) => Promise<any>;
    dbSaveChatMessage: (message: any) => Promise<any>;
    // その他のElectron API
    [key: string]: any;
  };
}