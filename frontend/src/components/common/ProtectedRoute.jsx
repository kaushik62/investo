import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FullPageSpinner } from './Spinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

export function AdminRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading)              return <FullPageSpinner />
  if (!user)                return <Navigate to="/admin/login" state={{ from: location }} replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function PublicRoute() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  // If logged in as admin trying to access /login, go to admin dashboard
  if (user && user.role === 'admin') return <Navigate to="/admin" replace />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
