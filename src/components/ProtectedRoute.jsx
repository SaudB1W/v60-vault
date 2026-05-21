import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({
  children,
  adminOnly = false,
  loggedInOnly = false,
}) {
  const { user, hydrated } = useAuth()
  const location = useLocation()

  // Wait for the session check before deciding anything.
  if (!hydrated) return null

  // Public routes: no flag set, render children regardless of auth state.
  if (!adminOnly && !loggedInOnly) return children

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
