import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import {
  fetchCsrfToken,
  fetchCurrentSession,
  loginAdmin,
  logoutAdmin,
  setCsrfToken,
} from '../services/adminApi'
import type { UserResponse } from '../services/adminApi'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const session = await fetchCurrentSession()
      setUser(session.user)
      await fetchCsrfToken().catch(() => undefined)
    } catch {
      setUser(null)
      setCsrfToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchCurrentSession()
      .then(async (session) => {
        if (!active) return
        setUser(session.user)
        await fetchCsrfToken().catch(() => undefined)
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setCsrfToken(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await loginAdmin(email, password)
    setUser(res.user)
  }

  const logout = async () => {
    await logoutAdmin()
    setUser(null)
  }

  const isAdmin = Boolean(
    user?.roles.some((r) => r.toLowerCase().includes('admin')) ||
    user?.permissions.some((p) => p.toLowerCase().includes('admin'))
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}