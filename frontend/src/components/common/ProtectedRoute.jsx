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

export function PublicRoute() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
