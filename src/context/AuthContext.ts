import { createContext, useContext } from 'react'
import type { UserResponse } from '../services/adminApi'

export interface AuthContextValue {
  user: UserResponse | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  isAdmin: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider')
  }
  return ctx
}