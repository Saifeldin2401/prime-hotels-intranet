import { useAuth } from '@/hooks/useAuth'
import { getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { Navigate } from 'react-router-dom'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading } = useAuth()
    const pendingAuthFlowPath = getAuthFlowRedirectPath()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user) {
        return <Navigate to={pendingAuthFlowPath ?? "/home"} replace />
    }

    return <>{children}</>
}
