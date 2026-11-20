import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../public/connection.css'
import './admin.css'

export default function AdminLoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-page admin-login-wrapper">
      <main className="login-main">
        <div className="login-brand-panel">
          <div className="brand-logo">
            <img src="/mitbol-logo.png" alt="" width="48" height="48" />
            <div className="brand-text">
              <span className="brand-title">mitbol</span>
              <span className="brand-subtitle">Cocina saludable</span>
            </div>
          </div>
          <p className="login-brand-title">Panel administrativo</p>
        </div>

        <section className="login-card" aria-labelledby="login-title">
          <h1 id="login-title">Iniciar sesión</h1>
          <p className="muted">Accede con tu cuenta de administrador o de personal operativo.</p>

          {error && (
            <div className="notice error" role="alert">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-form">
            <label className="form-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                required
                minLength={3}
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>

            <label className="form-field">
              <span>Contraseña</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="btn-primary login-submit" disabled={submitting}>
              {submitting ? 'Verificando credenciales…' : 'Iniciar sesión'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
