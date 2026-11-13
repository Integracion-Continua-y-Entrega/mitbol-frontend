import { Routes, Route, Link } from 'react-router-dom'
import AuthProvider from './context/AuthProvider'
import ConnectionPage from './pages/public/ConnectionPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<ConnectionPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <div className="connection-page">
              <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <span className="eyebrow">Error 404</span>
                <h2>Página no encontrada</h2>
                <p className="muted">La dirección que intentas consultar no existe en el menú digital.</p>
                <Link to="/" className="btn-primary">Volver al menú principal</Link>
              </div>
            </div>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App