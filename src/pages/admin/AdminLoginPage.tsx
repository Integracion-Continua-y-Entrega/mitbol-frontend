import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
    <div className="connection-page admin-page admin-login-wrapper">
      <header className="site-header">
        <Link className="brand" to="/">
          <div className="brand-text">
            <span className="brand-title">
              mitb<span className="brand-o">o</span>l
            </span>
            <span className="brand-subtitle">COCINA SALUDABLE · ADMIN</span>
          </div>
        </Link>
        <Link to="/" className="btn-outlined">← Volver al menú público</Link>
      </header>

      <main className="login-main">
        <section className="panel login-card" aria-labelledby="login-title">
          <span className="eyebrow">Personal autorizado</span>
          <h1 id="login-title">Acceso Administrativo</h1>
          <p className="muted">
            Inicia sesión con tu cuenta de Administrador o Staff operativo para gestionar disponibilidad, catálogo y código QR.
          </p>

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
                placeholder="admin@mitbol.com"
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
                placeholder="••••••••••••"
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
