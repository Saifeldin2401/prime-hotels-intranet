import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function RoleBasedRedirect() {
    const { user, primaryRole, loading } = useAuth()

    if (loading) {
        return null
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    /* 
      Strict Role-Based Redirection:
      - Staff -> /staff-dashboard
      - Everyone else -> /dashboard
    */

    if (primaryRole === 'staff') {
        return <Navigate to="/staff-dashboard" replace />
    }

    return <Navigate to="/dashboard" replace />
}
