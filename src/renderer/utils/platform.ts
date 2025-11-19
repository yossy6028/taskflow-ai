// プラットフォーム判定ユーティリティ
import { getWebGeminiService } from '../services/geminiService';
import type { TaskBreakdownContext } from '../services/geminiService';
import type { ConversationMessage } from '../../shared/types';

export type { TaskBreakdownContext } from '../services/geminiService';

export const isElectron = () => {
  return typeof window !== 'undefined' &&
         (window as any).electronAPI !== undefined;
};

// Web環境判定（Electron以外をWebとして扱う）
export const isWeb = () => {
  return typeof window !== 'undefined' && !isElectron();
};

// プラットフォーム判定のデバッグログ
if (typeof window !== 'undefined') {
  console.log('=== Platform Detection Debug ===');
  console.log('Platform info:', {
    isElectron: isElectron(),
    hasElectronAPI: !!window.electronAPI,
    isWeb: isWeb(),
    userAgent: navigator.userAgent,
    hostname: window.location?.hostname,
    protocol: window.location?.protocol,
    isVercel: window.location?.hostname?.includes('vercel'),
    isLocalhost: window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1'
  });

  // Firebase認証状態の監視（Web環境のみ）
  if (isWeb()) {
    console.log('Initializing Firebase auth monitoring...');
    import('../../services/firebase').then(({ firebaseAuth }) => {
      console.log('Firebase auth monitoring initialized');
      // メソッド名の誤り修正（onAuthStateChange）
      firebaseAuth.onAuthStateChange((user) => {
        console.log('🔥 Firebase auth state changed:', {
          authenticated: !!user,
          email: user?.email,
          uid: user?.uid,
          isAnonymous: user?.isAnonymous
        });
      });
    }).catch(error => {
      console.error('❌ Failed to initialize Firebase auth monitoring:', error);
    });
  } else {
    console.log('📱 Running in Electron environment');
  }
  console.log('=============================');
}

// Web環境用のGemini APIラッパー
// getWebGeminiServiceはgeminiService.tsからインポート済み

// プラットフォーム統一APIインターフェース
export const geminiAPI = {
  async chat(prompt: string, conversationHistory: ConversationMessage[] = []) {
    if (isElectron()) {
      try {
        return await window.electronAPI.geminiChat(prompt, conversationHistory);
      } catch (error: any) {
        return { success: false, message: error.message || 'Electron Gemini API error' };
      }
    } else {
      try {
        const service = getWebGeminiService();
        const message = await service.chatWithContext(prompt, conversationHistory);
        return { success: true, message };
      } catch (error: any) {
        return { success: false, message: error.message || 'Web Gemini API error' };
      }
    }
  },

  async breakdown(userInput: string, context: TaskBreakdownContext = {}) {
    if (isElectron()) {
      try {
        return await window.electronAPI.geminiBreakdown(userInput, context);
      } catch (error: any) {
        return { success: false, message: error.message || 'Electron Gemini breakdown error' };
      }
    } else {
      try {
        const service = getWebGeminiService();
        const data = await service.generateTaskBreakdown(userInput, context);
        return { success: true, data };
      } catch (error: any) {
        return { success: false, message: error.message || 'Web Gemini breakdown error' };
      }
    }
  },

  async breakdownEnriched(userInput: string, context: TaskBreakdownContext = {}) {
    if (isElectron()) {
      try {
        return await window.electronAPI.geminiBreakdownEnriched(userInput, context);
      } catch (error: any) {
        return { success: false, message: error.message || 'Electron Gemini enriched breakdown error' };
      }
    } else {
      try {
        const service = getWebGeminiService();
        const data = await service.generateTaskBreakdownEnriched(userInput, context);
        return { success: true, data };
      } catch (error: any) {
        return { success: false, message: error.message || 'Web Gemini enriched breakdown error' };
      }
    }
  },

  async breakdownTask(params: { title: string; targetCount?: number }) {
    if (isElectron()) {
      try {
        return await window.electronAPI.geminiBreakdownTask(params);
      } catch (error: any) {
        return { success: false, message: error.message || 'Electron Gemini task breakdown error' };
      }
    } else {
      try {
        const service = getWebGeminiService();
        const data = await service.breakdownTask(params);
        return { success: true, data };
      } catch (error: any) {
        return { success: false, message: error.message || 'Web Gemini task breakdown error' };
      }
    }
  },

  async analyzeDependencies(tasks: Array<{ id: string; title?: string }>) {
    if (isElectron()) {
      try {
        return await window.electronAPI.geminiAnalyzeDependencies(tasks);
      } catch (error: any) {
        return { success: false, message: error.message || 'Electron Gemini dependency analysis error' };
      }
    } else {
      try {
        const service = getWebGeminiService();
        const data = await service.analyzeDependencies(tasks);
        return { success: true, data };
      } catch (error: any) {
        return { success: false, message: error.message || 'Web Gemini dependency analysis error' };
      }
    }
  }
};

// プラットフォームに応じたストレージAPI
export const storage = {
  async deleteTask(taskId: string) {
    if (isElectron()) {
      return window.electronAPI.dbDeleteTask(taskId);
    } else {
      try {
        const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
        const user = firebaseAuth.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };
        return firebaseDB.deleteTask(user.uid, taskId);
      } catch (e: any) {
        return { success: false, error: e?.message || 'deleteTask failed' };
      }
    }
  },

  async deleteProject(projectId: string) {
    if (isElectron()) {
      // Electron: 全タスクを取得して該当プロジェクトのものを削除
      const res = await window.electronAPI.dbGetTasks();
      if (res.success && res.data) {
        const toDelete = res.data.filter((row: any) => (row.project_id || 'default') === projectId);
        for (const row of toDelete) {
          await window.electronAPI.dbDeleteTask(row.id);
        }
      }
      return { success: true };
    } else {
      try {
        const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
        const user = firebaseAuth.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };
        // タスク一覧取得→対象プロジェクトのタスクを削除→プロジェクトレコード削除
        const res = await storage.getTasks(projectId);
        if (res.success && Array.isArray(res.data)) {
          for (const t of res.data) {
            if (t?.id) await firebaseDB.deleteTask(user.uid, t.id);
          }
        }
        await firebaseDB.deleteProject(user.uid, projectId);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || 'deleteProject failed' };
      }
    }
  },
  async saveTask(task: any) {
    if (isElectron()) {
      // Electron: SQLite経由 - dbCreateTaskを使用
      return window.electronAPI.dbCreateTask(task);
    } else {
      // Web: Firebase経由
      try {
        // 逐次実行のための小さな遅延を入れて競合を緩和
        await new Promise(r => setTimeout(r, 50))
        console.log('🔥 === FIREBASE SAVE TASK START ===')
        console.log('Task ID:', task.id)
        console.log('Task title:', task.title)
        console.log('Task data:', JSON.stringify(task, null, 2))

        console.log('Importing Firebase services...')
        const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
        console.log('Firebase services imported')

        console.log('Getting current user...')
        const user = firebaseAuth.getCurrentUser();
        console.log('Current user:', user ? { uid: user.uid, email: user.email } : 'null')

        if (!user) {
          // 認証されていない場合はローカルストレージへフェールバック保存
          console.warn('⚠️ Firebase: User not authenticated. Falling back to localStorage for tasks.')
          try {
            const key = 'tf-local-tasks'
            const raw = localStorage.getItem(key)
            const store: Record<string, any> = raw ? JSON.parse(raw) : {}
            // undefined値は保存しない
            const sanitizedTask = Object.fromEntries(Object.entries(task).filter(([_, v]) => v !== undefined))
            store[sanitizedTask.id] = { ...sanitizedTask, updatedAt: Date.now() }
            localStorage.setItem(key, JSON.stringify(store))
            return { success: true, data: sanitizedTask }
          } catch (e: any) {
            console.error('❌ LocalStorage fallback save failed:', e)
            return { success: false, error: e?.message || 'ローカル保存に失敗しました。' }
          }
        }

        console.log('Calling firebaseDB.saveTask...')
        // Firebaseに保存する前にundefinedを除去（Realtime DBはundefined不可）
        const sanitizedTask = Object.fromEntries(
          Object.entries(task).filter(([_, v]) => v !== undefined)
        );
        const result = await firebaseDB.saveTask(user.uid, sanitizedTask);
        console.log('Firebase saveTask result:', result)

        if (result.success) {
          console.log('✅ Firebase: Task saved successfully:', task.id)
          // Webローカルキャッシュにも保存（閲覧即時性向上）
          try {
            const cacheKey = `tf:cache:tasks:${user.uid}:${task.projectId || 'default'}`
            const prev = JSON.parse(localStorage.getItem(cacheKey) || '[]')
            const merged = [...prev.filter((t: any) => t.id !== task.id), task]
            localStorage.setItem(cacheKey, JSON.stringify(merged))
          } catch {}
        } else {
          console.error('❌ Firebase: Failed to save task:', result.error)
        }

        console.log('🔥 === FIREBASE SAVE TASK END ===')
        return result;
      } catch (error: any) {
        console.error('Firebase saveTask error:', error)
        const errorMsg = error.message?.includes('network') ? 'ネットワークエラーが発生しました。接続を確認してください。' :
                        error.message?.includes('permission') ? '権限エラーが発生しました。' :
                        error.message?.includes('quota') ? 'Firebaseのクォータ制限に達しました。' :
                        'タスクの保存に失敗しました。'
        return { success: false, error: errorMsg };
      }
    }
  },

  async getTasks(projectId?: string) {
    if (isElectron()) {
      // Electron: SQLite経由
      return window.electronAPI.dbGetTasks({ projectId });
    } else {
      // Web: Firebase経由
      try {
        // 書き込み直後のリードでは一拍置く
        await new Promise(r => setTimeout(r, 100))
        console.log('🔥 === FIREBASE GET TASKS START ===')
        console.log('Project ID:', projectId)

        console.log('Importing Firebase services...')
        const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
        console.log('Firebase services imported')

        console.log('Getting current user...')
        const user = firebaseAuth.getCurrentUser();
        console.log('Current user:', user ? { uid: user.uid, email: user.email } : 'null')

        if (!user) {
          // 認証されていない場合はローカルストレージから読み出し
          console.warn('⚠️ Firebase: User not authenticated. Falling back to localStorage for tasks.')
          try {
            const key = 'tf-local-tasks'
            const raw = localStorage.getItem(key)
            const store: Record<string, any> = raw ? JSON.parse(raw) : {}
            const tasks = Object.values(store)
            const filtered = projectId ? (tasks as any[]).filter(t => (t.projectId || 'default') === projectId) : tasks
            console.log(`✅ LocalStorage: Retrieved ${filtered.length} tasks (filtered)`) 
            return { success: true, data: filtered as any[] }
          } catch (e: any) {
            console.error('❌ LocalStorage fallback load failed:', e)
            return { success: false, error: e?.message || 'ローカル取得に失敗しました。', data: [] }
          }
        }

        console.log('Calling firebaseDB.getTasks...')
        const result = await firebaseDB.getTasks(user.uid);
        console.log('Firebase getTasks result:', result)

        if (result.success && result.data) {
          // Firebaseのオブジェクトを配列に変換（キーをidとして補完）
          const tasks = Object.entries(result.data).map(([id, value]: any) => {
            const obj = { ...(value || {}) } as any
            if (!obj.id) obj.id = id
            return obj
          })
          console.log(`Raw tasks from Firebase: ${tasks.length} items`)
          console.log('Tasks data:', tasks)

          let filteredTasks = projectId ? tasks.filter((t: any) => (t.projectId || 'default') === projectId) : tasks;

          // Firebaseが空の場合はローカルキャッシュから補完
          if (filteredTasks.length === 0 && projectId) {
            try {
              const { firebaseAuth } = await import('../../services/firebase')
              const uid = firebaseAuth.getCurrentUser()?.uid
              if (uid) {
                const cacheKey = `tf:cache:tasks:${uid}:${projectId}`
                const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]')
                if (Array.isArray(cached) && cached.length > 0) {
                  console.warn('⚠️ Using local cache fallback for tasks')
                  filteredTasks = cached
                }
              }
            } catch {}
          }
          console.log(`✅ Firebase: Retrieved ${filteredTasks.length} tasks (filtered)`)
          console.log('Filtered tasks:', filteredTasks)

          console.log('🔥 === FIREBASE GET TASKS END ===')
          return { success: true, data: filteredTasks };
        } else {
          console.error('❌ Firebase: Failed to get tasks:', result.error)
          console.log('🔥 === FIREBASE GET TASKS END (ERROR) ===')
          return { success: false, error: result.error || 'タスクの取得に失敗しました。', data: [] };
        }
      } catch (error: any) {
        console.error('Firebase getTasks error:', error)
        const errorMsg = error.message?.includes('network') ? 'ネットワークエラーが発生しました。接続を確認してください。' :
                        error.message?.includes('permission') ? '権限エラーが発生しました。' :
                        'タスクの取得に失敗しました。'
        return { success: false, error: errorMsg, data: [] };
      }
    }
  },

  async saveProject(project: any) {
    if (isElectron()) {
      if (!window.electronAPI?.dbSaveProject) {
        console.warn('dbSaveProject is not exposed via Electron preload; skipping project persistence.');
        return { success: false, error: 'Project persistence is not supported in the desktop build yet.' };
      }
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
      if (!window.electronAPI?.dbGetProjects) {
        console.warn('dbGetProjects is not exposed via Electron preload; returning empty project list.');
        return { success: false, error: 'Project listing is not supported in the desktop build yet.', data: [] };
      }
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
      if (!window.electronAPI?.dbSaveChatMessage) {
        console.warn('dbSaveChatMessage is not exposed via Electron preload; chat history will not persist.');
        return { success: false, error: 'Chat persistence is not supported in the desktop build yet.' };
      }
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
      if (!window.electronAPI?.dbGetChatHistory) {
        console.warn('dbGetChatHistory is not exposed via Electron preload; returning empty chat history.');
        return { success: false, error: 'Chat history retrieval is not supported in the desktop build yet.', data: [] };
      }
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
