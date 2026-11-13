import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="connection-page">
        <div className="panel">
          <p className="eyebrow">Seguridad MITBOL</p>
          <h2>Verificando sesión activa…</h2>
          <p className="muted">Comprobando credenciales con el servidor.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}