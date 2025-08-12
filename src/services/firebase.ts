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

// Firebase設定（環境変数から読み込み）
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || ''
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// 認証関連の関数
export const firebaseAuth = {
  signUp: async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signOut: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser: () => {
    return auth.currentUser;
  }
};

// データベース関連の関数
export const firebaseDB = {
  // タスクの保存
  saveTask: async (userId: string, task: any) => {
    try {
      const taskRef = ref(database, `users/${userId}/tasks/${task.id}`);
      await set(taskRef, {
        ...task,
        updatedAt: Date.now()
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // タスクの取得
  getTasks: async (userId: string) => {
    try {
      const tasksRef = ref(database, `users/${userId}/tasks`);
      const snapshot = await get(tasksRef);
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: {} };
    } catch (error: any) {
      return { success: false, error: error.message };
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