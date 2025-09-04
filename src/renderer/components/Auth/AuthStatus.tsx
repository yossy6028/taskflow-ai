import React, { useEffect, useState } from 'react'
import { firebaseAuth } from '../../../services/firebase'

const AuthStatus: React.FC = () => {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChange((user) => {
      setEmail(user?.email || null)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  if (loading) {
    return <span className="text-xs text-neutral-500">…</span>
  }

  if (!email) {
    return (
      <span className="text-xs text-neutral-500">未ログイン</span>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[160px]" title={email}>{email}</span>
      <button
        onClick={async () => { try { await firebaseAuth.signOut() } catch {} }}
        className="text-primary-600 hover:underline"
      >
        ログアウト
      </button>
    </div>
  )
}

export default AuthStatus

