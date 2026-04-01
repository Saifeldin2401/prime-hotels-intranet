import { useAuth } from '@/hooks/useAuth'
import { getRedirectFromSearch } from '@/lib/authRedirect'
import { getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { Navigate, useLocation } from 'react-router-dom'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading } = useAuth()
    const location = useLocation()
    const pendingAuthFlowPath = getAuthFlowRedirectPath()
    const redirectPath = getRedirectFromSearch(location.search)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user) {
        return <Navigate to={pendingAuthFlowPath ?? redirectPath ?? "/home"} replace />
    }

    return <>{children}</>
}
