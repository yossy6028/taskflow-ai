// プラットフォーム判定ユーティリティ

export const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.electronAPI !== undefined;
};

export const isWeb = () => {
  return !isElectron();
};

// プラットフォームに応じたストレージAPI
export const storage = {
  async saveTask(task: any) {
    if (isElectron()) {
      // Electron: SQLite経由
      return window.electronAPI.dbSaveTask(task);
    } else {
      // Web: Firebase経由
      const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
      const user = firebaseAuth.getCurrentUser();
      if (user) {
        return firebaseDB.saveTask(user.uid, task);
      }
      return { success: false, error: 'Not authenticated' };
    }
  },

  async getTasks(projectId?: string) {
    if (isElectron()) {
      // Electron: SQLite経由
      return window.electronAPI.dbGetTasks({ projectId });
    } else {
      // Web: Firebase経由
      const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
      const user = firebaseAuth.getCurrentUser();
      if (user) {
        const result = await firebaseDB.getTasks(user.uid);
        if (result.success && result.data) {
          // Firebaseのオブジェクトを配列に変換
          const tasks = Object.values(result.data);
          if (projectId) {
            return { 
              success: true, 
              data: tasks.filter((t: any) => t.projectId === projectId) 
            };
          }
          return { success: true, data: tasks };
        }
      }
      return { success: false, error: 'Not authenticated', data: [] };
    }
  },

  async saveProject(project: any) {
    if (isElectron()) {
      // Electron: SQLite経由
      return window.electronAPI.dbSaveProject(project);
    } else {
      // Web: Firebase経由
      const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
      const user = firebaseAuth.getCurrentUser();
      if (user) {
        return firebaseDB.saveProject(user.uid, project);
      }
      return { success: false, error: 'Not authenticated' };
    }
  },

  async getProjects() {
    if (isElectron()) {
      // Electron: SQLite経由
      return window.electronAPI.dbGetProjects();
    } else {
      // Web: Firebase経由
      const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
      const user = firebaseAuth.getCurrentUser();
      if (user) {
        const result = await firebaseDB.getProjects(user.uid);
        if (result.success && result.data) {
          return { success: true, data: Object.values(result.data) };
        }
      }
      return { success: false, error: 'Not authenticated', data: [] };
    }
  },

  async saveChatMessage(conversationId: string, message: any) {
    if (isElectron()) {
      // Electron: SQLite経由
      return window.electronAPI.dbSaveChatMessage({ conversationId, ...message });
    } else {
      // Web: Firebase経由
      const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
      const user = firebaseAuth.getCurrentUser();
      if (user) {
        return firebaseDB.saveChatMessage(user.uid, conversationId, message);
      }
      return { success: false, error: 'Not authenticated' };
    }
  },

  async getChatHistory(conversationId: string) {
    if (isElectron()) {
      // Electron: SQLite経由
      return window.electronAPI.dbGetChatHistory(conversationId);
    } else {
      // Web: Firebase経由
      const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
      const user = firebaseAuth.getCurrentUser();
      if (user) {
        const result = await firebaseDB.getChatHistory(user.uid, conversationId);
        if (result.success && result.data) {
          return { success: true, data: Object.values(result.data) };
        }
      }
      return { success: false, error: 'Not authenticated', data: [] };
    }
  }
};