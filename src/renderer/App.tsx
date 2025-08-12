import React, { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { store } from './store'
import MainLayout from './components/Layout/MainLayout'
import Dashboard from './components/Dashboard/Dashboard'
import LoginScreen from './components/Auth/LoginScreen'
import { firebaseAuth } from '../services/firebase'
import { User } from 'firebase/auth'
import './styles/globals.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Firebase認証状態の監視
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [])
  
  // 開発用: LocalStorageの古いTODOデータをクリア（初回のみ）
  useEffect(() => {
    const cleared = localStorage.getItem('todos-cleared-v2')
    if (!cleared) {
      console.log('Clearing old TODO data...')
      // 古いTODOデータをクリア
      localStorage.removeItem('taskflow-todos')
      // 各タスクの生成済みフラグもクリア
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('task-todos-generated-')) {
          localStorage.removeItem(key)
        }
      })
      localStorage.setItem('todos-cleared-v2', 'true')
      console.log('Old TODO data cleared')
      // ページをリロードして新しい状態で開始
      window.location.reload()
    }
  }, [])
  
  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">読み込み中...</p>
        </div>
      </div>
    )
  }
  
  // 未ログインの場合はログイン画面を表示
  if (!user) {
    return (
      <LoginScreen onLoginSuccess={() => {
        // 認証状態が変わると自動的に再レンダリングされる
      }} />
    )
  }
  
  // ログイン済みの場合はメインアプリを表示
  return (
    <Provider store={store}>
      <MainLayout>
        <Dashboard onNavigate={() => { /* routed via MainLayout's local state */ }} />
      </MainLayout>
    </Provider>
  )
}

export default App