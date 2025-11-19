import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
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

// Firebase設定（環境変数から読み込み、厳格に検証）
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

const readEnvValue = (key: string): string | undefined => {
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && typeof metaEnv[key] === 'string') {
      const value = (metaEnv[key] as string).trim();
      if (value) {
        return value;
      }
    }
  } catch {}

  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    const value = (process.env[key] as string).trim();
    if (value) {
      return value;
    }
  }

  return undefined;
};

const resolveFirebaseValue = (keys: string[]): string => {
  for (const key of keys) {
    const value = readEnvValue(key);
    if (value) {
      return value;
    }
  }
  return '';
};

const firebaseConfig = {
  apiKey: resolveFirebaseValue(['VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY']),
  authDomain: resolveFirebaseValue(['VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN']),
  databaseURL: normalizeUrl(resolveFirebaseValue(['VITE_FIREBASE_DATABASE_URL', 'FIREBASE_DATABASE_URL'])),
  projectId: resolveFirebaseValue(['VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID']),
  storageBucket: resolveFirebaseValue(['VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET']),
  messagingSenderId: resolveFirebaseValue(['VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID']),
  appId: resolveFirebaseValue(['VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID'])
};

const missingFirebaseConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const isDevEnv = (() => {
  try {
    return Boolean((import.meta as any)?.env?.DEV);
  } catch {
    return false;
  }
})();


// デバッグ用（本番環境でもFirebase設定を確認）
console.log('🔥 === FIREBASE CONFIGURATION DEBUG ===');
console.log('Environment variables:', {
  VITE_FIREBASE_API_KEY: !!readEnvValue('VITE_FIREBASE_API_KEY'),
  FIREBASE_API_KEY: !!readEnvValue('FIREBASE_API_KEY'),
  VITE_FIREBASE_AUTH_DOMAIN: !!readEnvValue('VITE_FIREBASE_AUTH_DOMAIN'),
  FIREBASE_AUTH_DOMAIN: !!readEnvValue('FIREBASE_AUTH_DOMAIN'),
  VITE_FIREBASE_DATABASE_URL: !!readEnvValue('VITE_FIREBASE_DATABASE_URL'),
  FIREBASE_DATABASE_URL: !!readEnvValue('FIREBASE_DATABASE_URL'),
  VITE_FIREBASE_PROJECT_ID: !!readEnvValue('VITE_FIREBASE_PROJECT_ID'),
  FIREBASE_PROJECT_ID: !!readEnvValue('FIREBASE_PROJECT_ID'),
  VITE_FIREBASE_STORAGE_BUCKET: !!readEnvValue('VITE_FIREBASE_STORAGE_BUCKET'),
  FIREBASE_STORAGE_BUCKET: !!readEnvValue('FIREBASE_STORAGE_BUCKET'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: !!readEnvValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  FIREBASE_MESSAGING_SENDER_ID: !!readEnvValue('FIREBASE_MESSAGING_SENDER_ID'),
  VITE_FIREBASE_APP_ID: !!readEnvValue('VITE_FIREBASE_APP_ID'),
  FIREBASE_APP_ID: !!readEnvValue('FIREBASE_APP_ID')
});
console.log('Final Firebase config:', {
  apiKey: firebaseConfig.apiKey ? '***configured***' : 'missing',
  authDomain: firebaseConfig.authDomain || 'missing',
  databaseURL: firebaseConfig.databaseURL || 'missing',
  projectId: firebaseConfig.projectId || 'missing',
  storageBucket: firebaseConfig.storageBucket || 'missing',
  messagingSenderId: firebaseConfig.messagingSenderId || 'missing',
  appId: firebaseConfig.appId ? '***configured***' : 'missing'
});
console.log('====================================');

// デバッグ用（開発環境でのみ表示）
if (isDevEnv) {
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
  if (missingFirebaseConfigKeys.length > 0) {
    throw new Error(`Missing Firebase configuration values: ${missingFirebaseConfigKeys.join(', ')}`);
  }
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
    missingKeys: missingFirebaseConfigKeys,
    config: {
      ...firebaseConfig,
      apiKey: firebaseConfig.apiKey ? '***configured***' : 'missing'
    }
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
      return { success: false, error: error.message, code: error?.code } as any;
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
      // デモユーザー自動作成フォールバック
      const code = error?.code as string | undefined;
      const isDemo = email === 'demo@taskflow.ai' && password === 'demo123';
      if (isDemo && (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials' || code === 'auth/wrong-password')) {
        try {
          // Email/Password サインイン方式の有効性を簡易確認
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods && !methods.includes('password')) {
              return { success: false, error: 'Email/Password sign-in is disabled in Firebase.', code: 'auth/operation-not-allowed' } as any;
            }
          } catch (_) {}

          const created = await createUserWithEmailAndPassword(auth, email, password);
          return { success: true, user: created.user };
        } catch (createErr: any) {
          const createCode = createErr?.code as string | undefined;
          if (createCode === 'auth/email-already-in-use') {
            return { success: false, error: 'Demo user exists with different password. Set password to "demo123" or delete user.', code: createCode } as any;
          }
          if (createCode === 'auth/operation-not-allowed') {
            return { success: false, error: 'Enable Email/Password provider in Firebase Console.', code: createCode } as any;
          }
          return { success: false, error: createErr?.message || 'Failed to create demo user', code: createCode } as any;
        }
      }
      return { success: false, error: error.message, code } as any;
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

      // Realtime Databaseはundefinedを保存できないため、undefinedキーを除去
      // また、Date/number/boolean/array/objectのみになるように整形
      const rawData = {
        ...task,
        updatedAt: Date.now()
      } as Record<string, unknown>;
      const taskData = Object.fromEntries(
        Object.entries(rawData).filter(([_, v]) => v !== undefined)
      );
      console.log('Task data to save:', taskData);

      console.log('Calling Firebase set...');
      await set(taskRef, taskData);
      console.log('✅ Firebase set completed successfully');

      // 書き込み検証（同一パスを即時読み出し）
      await new Promise(r => setTimeout(r, 50));
      const verifySnap = await get(taskRef);
      const ok = verifySnap.exists();
      if (!ok) {
        console.error('❌ Verification failed: task not found after set', task.id);
        return { success: false, error: 'Verification failed after write' };
      }

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

  // 特定タスクの取得
  getTask: async (userId: string, taskId: string) => {
    try {
      const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
      const snapshot = await get(taskRef);
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: false, error: 'Not found' };
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

  // プロジェクトの削除（関連タスクの削除は呼び出し側で実施）
  deleteProject: async (userId: string, projectId: string) => {
    try {
      const projectRef = ref(database, `users/${userId}/projects/${projectId}`);
      await remove(projectRef);
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
