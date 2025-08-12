import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from './store'
import MainLayout from './components/Layout/MainLayout'
import Dashboard from './components/Dashboard/Dashboard'
import './styles/globals.css'

function App() {
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
  
  return (
    <Provider store={store}>
      <MainLayout>
        <Dashboard onNavigate={() => { /* routed via MainLayout's local state */ }} />
      </MainLayout>
    </Provider>
  )
}

export default App