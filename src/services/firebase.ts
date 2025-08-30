import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  push, 
  onValue, 
  off,
  update,
  remove 
} from 'firebase/database';

// Firebase設定（環境変数から読み込み、フォールバック付き）
// URLに混入した空白・%20・全角空白・誤ったリージョン表記などを除去/補正
const normalizeUrl = (url: string) => {
  if (!url) return url
  try {
    // 既にエンコード済みの%20などを復元
    url = decodeURIComponent(url)
  } catch {}
  // 空白（半角/全角）と%20を除去
  let s = url.replace(/\s+/g, '').replace(/%20/gi, '').replace(/[\u3000]/g, '')
  // よくあるタイポ: "asia-so   utheast1" のような分割を補正（so と utheast1 の間に任意空白）
  s = s.replace(/asia-so\s*utheast1/gi, 'asia-southeast1')
  // ハイフンが落ちたケース "asiasoutheast1" を補正
  s = s.replace(/asia\s*southeast1/gi, 'asia-southeast1')
  return s
}

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyDJxpnAO-mf-Y-AVHu3BEOfFQNVlrEXq1g',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'taskflow-ai-dc492.firebaseapp.com',
  databaseURL: normalizeUrl((import.meta as any).env?.VITE_FIREBASE_DATABASE_URL) || 'https://taskflow-ai-dc492-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'taskflow-ai-dc492',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'taskflow-ai-dc492.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '829585643084',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:829585643084:web:e50f81208640b3518006e9'
};

// デバッグ用（本番環境でもFirebase設定を確認）
console.log('🔥 === FIREBASE CONFIGURATION DEBUG ===');
console.log('Environment variables:', {
  VITE_FIREBASE_API_KEY: !!import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_DATABASE_URL: !!import.meta.env.VITE_FIREBASE_DATABASE_URL,
  VITE_FIREBASE_PROJECT_ID: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: !!import.meta.env.VITE_FIREBASE_APP_ID
});
console.log('Final Firebase config:', {
  apiKey: firebaseConfig.apiKey ? '***configured***' : 'missing',
  authDomain: firebaseConfig.authDomain,
  databaseURL: firebaseConfig.databaseURL,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId ? '***configured***' : 'missing'
});
console.log('====================================');

// デバッグ用（開発環境でのみ表示）
if ((import.meta as any).env?.DEV) {
  console.log('Firebase Config:', {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? '***' : 'missing'
  });
}

// Firebase初期化
let app;
let auth;
let database;

try {
  console.log('🔥 Initializing Firebase app...');
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');

  console.log('🔥 Initializing Firebase auth...');
  auth = getAuth(app);
  console.log('✅ Firebase auth initialized successfully');

  console.log('🔥 Initializing Firebase database...');
  database = getDatabase(app);
  console.log('✅ Firebase database initialized successfully');
  console.log('🔥 Database URL:', firebaseConfig.databaseURL);

} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.error('❌ Error details:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : 'No stack trace',
    config: firebaseConfig
  });
  // フォールバック設定
  app = null as any;
  auth = null as any;
  database = null as any;
}

export { auth, database };

// 認証関連の関数
export const firebaseAuth = {
  signUp: async (email: string, password: string) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized' };
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signIn: async (email: string, password: string) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized' };
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signOut: async () => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized' };
    }
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser: () => {
    return auth?.currentUser || null;
  }
};

// データベース関連の関数
export const firebaseDB = {
  // タスクの保存
  saveTask: async (userId: string, task: any) => {
    console.log('💾 === FIREBASE SAVE TASK ===');
    console.log('User ID:', userId);
    console.log('Task ID:', task.id);
    console.log('Task data:', task);

    if (!database) {
      console.error('❌ Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const taskPath = `users/${userId}/tasks/${task.id}`;
      console.log('Task path:', taskPath);

      const taskRef = ref(database, taskPath);
      console.log('Task ref created');

      const taskData = {
        ...task,
        updatedAt: Date.now()
      };
      console.log('Task data to save:', taskData);

      console.log('Calling Firebase set...');
      await set(taskRef, taskData);
      console.log('✅ Firebase set completed successfully');

      return { success: true };
    } catch (error: any) {
      console.error('❌ Firebase saveTask error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        userId,
        taskId: task.id
      });
      return { success: false, error: error.message };
    }
  },

  // タスクの取得
  getTasks: async (userId: string) => {
    console.log('📥 === FIREBASE GET TASKS ===');
    console.log('User ID:', userId);

    if (!database) {
      console.error('❌ Database not initialized');
      return { success: false, error: 'Database not initialized', data: {} };
    }

    try {
      const tasksPath = `users/${userId}/tasks`;
      console.log('Tasks path:', tasksPath);

      const tasksRef = ref(database, tasksPath);
      console.log('Tasks ref created');

      console.log('Calling Firebase get...');
      const snapshot = await get(tasksRef);
      console.log('Firebase get completed');

      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('✅ Tasks found:', Object.keys(data).length, 'items');
        console.log('Tasks data:', data);
        return { success: true, data };
      } else {
        console.log('ℹ️ No tasks found (empty database)');
        return { success: true, data: {} };
      }
    } catch (error: any) {
      console.error('❌ Firebase getTasks error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        userId
      });
      return { success: false, error: error.message, data: {} };
    }
  },

  // リアルタイムリスナー
  subscribeToTasks: (userId: string, callback: (tasks: any) => void) => {
    const tasksRef = ref(database, `users/${userId}/tasks`);
    onValue(tasksRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
    return () => off(tasksRef);
  },

  // タスクの削除
  deleteTask: async (userId: string, taskId: string) => {
    try {
      const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
      await remove(taskRef);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // プロジェクトの保存
  saveProject: async (userId: string, project: any) => {
    try {
      const projectRef = ref(database, `users/${userId}/projects/${project.id}`);
      await set(projectRef, {
        ...project,
        updatedAt: Date.now()
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // プロジェクトの取得
  getProjects: async (userId: string) => {
    try {
      const projectsRef = ref(database, `users/${userId}/projects`);
      const snapshot = await get(projectsRef);
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: {} };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // チャットメッセージの保存
  saveChatMessage: async (userId: string, conversationId: string, message: any) => {
    try {
      const messageRef = push(ref(database, `users/${userId}/conversations/${conversationId}/messages`));
      await set(messageRef, {
        ...message,
        timestamp: Date.now()
      });
      return { success: true, id: messageRef.key };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // チャット履歴の取得
  getChatHistory: async (userId: string, conversationId: string) => {
    try {
      const messagesRef = ref(database, `users/${userId}/conversations/${conversationId}/messages`);
      const snapshot = await get(messagesRef);
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: {} };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

// データ同期のヘルパー関数
export const syncWithFirebase = {
  // ローカルデータをFirebaseに同期
  uploadLocalData: async (userId: string, localData: any) => {
    try {
      const updates: any = {};
      
      // タスクの同期
      if (localData.tasks) {
        Object.keys(localData.tasks).forEach(taskId => {
          updates[`users/${userId}/tasks/${taskId}`] = localData.tasks[taskId];
        });
      }
      
      // プロジェクトの同期
      if (localData.projects) {
        Object.keys(localData.projects).forEach(projectId => {
          updates[`users/${userId}/projects/${projectId}`] = localData.projects[projectId];
        });
      }
      
      await update(ref(database), updates);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Firebaseからローカルにデータを取得
  downloadCloudData: async (userId: string) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: {} };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
